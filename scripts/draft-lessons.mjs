// 用 Claude 草擬還沒有內容的文法課（預設 3–4 級），寫回 src/data/lessons.json，全部標成 reviewed: false。
// 用法：node scripts/draft-lessons.mjs [--levels 3,4] [--limit 10]
// 需要環境變數 ANTHROPIC_API_KEY（可放在 .env.local，執行時加 --env-file=.env.local）。

import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const levels = opt("levels", "3,4").split(",").map(Number);
const limit = Number(opt("limit", "1000"));

const GRAMMAR_PATH = "src/data/grammar.json";
const LESSONS_PATH = "src/data/lessons.json";
const grammar = JSON.parse(fs.readFileSync(GRAMMAR_PATH, "utf8"));
const lessons = JSON.parse(fs.readFileSync(LESSONS_PATH, "utf8"));
const done = new Set(lessons.map((l) => l.id));
const todo = grammar.filter((g) => levels.includes(g.level) && !done.has(g.id)).slice(0, limit);

const LessonSchema = z.object({
  title_zh: z.string(),
  core_zh: z.string(),
  pattern: z.string(),
  examples: z.array(z.object({ ko: z.string(), zh: z.string() })),
  pitfall_zh: z.string(),
  prompts: z.array(
    z.object({ scene: z.enum(["daily", "fan", "work", "topik"]), situation_zh: z.string() }),
  ),
});

// 用已經審過的手寫課當風格範本
const styleSample = JSON.stringify(
  lessons.slice(0, 3).map((l) => ({ ...l, reviewed: undefined })),
  null,
  1,
);

const SYSTEM = `你在為繁體中文母語的韓文學習者編寫文法練習卡。說明一律用繁體中文、台灣用語，語氣親切口語，不要過度正式。
欄位規則：
- title_zh：這個文法的中文意思，像小標題，10 字左右。
- core_zh：1–2 句，說清楚什麼時候用。
- pattern：接法，例如「動詞 + -느라고」，有過去式或名詞接法也寫出來。
- examples：2–3 句自然的韓文例句，題材混合日常、追星、職場；中文翻譯自然。
- pitfall_zh：中文母語者最容易犯的 1–3 個錯（接續限制、時態、主語、和相似文法的差別），可以用 ✗ 標錯誤示範。
- prompts：2 個情境題，請學生用這個文法寫一句韓文。情境用中文描述、不要出現韓文答案；scene 從 daily／fan／work／topik 選兩種不同的。
內容必須正確；不確定的限制寧可不寫。

風格範本：
${styleSample}`;

const client = new Anthropic();

async function draft(item) {
  const form = item.form.replace(/\d+(\(\d+\))?$/, "");
  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 8000,
    output_config: { effort: "medium", format: zodOutputFormat(LessonSchema) },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `文法：${form}（${item.level} 級，${item.category}）\n相關形：${item.variants.join(", ") || "無"}\n語意分類：${item.meaning ?? "無"}`,
      },
    ],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error(`no output for ${item.id}`);
  return { id: item.id, ...response.parsed_output, reviewed: false };
}

console.log(`要草擬 ${todo.length} 項（${levels.join("、")} 級）`);
const results = [];
const CONCURRENCY = 4;
for (let i = 0; i < todo.length; i += CONCURRENCY) {
  const batch = todo.slice(i, i + CONCURRENCY);
  const settled = await Promise.allSettled(batch.map(draft));
  settled.forEach((r, j) => {
    if (r.status === "fulfilled") results.push(r.value);
    else console.error(`✗ ${batch[j].id} ${batch[j].form}: ${r.reason?.message ?? r.reason}`);
  });
  console.log(`${Math.min(i + CONCURRENCY, todo.length)} / ${todo.length}`);
  // 每批寫一次檔，中途中斷也不會全部重來
  const order = new Map(grammar.map((g, idx) => [g.id, idx]));
  const merged = [...lessons, ...results].sort((a, b) => order.get(a.id) - order.get(b.id));
  fs.writeFileSync(LESSONS_PATH, JSON.stringify(merged, null, 2) + "\n");
}
console.log(`完成：新增 ${results.length} 項，全部標為 reviewed: false，請審核後改成 true。`);
