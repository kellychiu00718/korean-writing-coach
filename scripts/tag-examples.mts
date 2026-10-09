// 標出每個例句裡用到的其他文法（2 級以上），寫回 lessons.json 的 examples[].grammar。
// 用法：npx tsx --env-file=.env.local scripts/tag-examples.mts
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

type Example = { ko: string; zh: string; grammar?: string[] };
type Lesson = { id: string; examples: Example[] };
type Grammar = { id: string; level: number; form: string; variants: string[] };

const LESSONS_PATH = "src/data/lessons.json";
const grammar: Grammar[] = JSON.parse(fs.readFileSync("src/data/grammar.json", "utf8"));
const lessons: Lesson[] = JSON.parse(fs.readFileSync(LESSONS_PATH, "utf8"));
const valid = new Map(grammar.map((g) => [g.id, g]));

const index = grammar
  .filter((g) => g.level >= 2)
  .map((g) => `${g.id}\t${g.level}級\t${g.form.replace(/\d+(\(\d+\))?$/, "")}${g.variants.length ? `（${g.variants.join(", ")}）` : ""}`)
  .join("\n");

const items = lessons.flatMap((l) => l.examples.map((ex, i) => ({ key: `${l.id}#${i}`, target: l.id, ko: ex.ko })));

const Result = z.object({ tags: z.array(z.object({ key: z.string(), ids: z.array(z.string()) })) });

const response = await new Anthropic().messages.parse({
  model: "claude-opus-5-5",
  max_tokens: 16000,
  output_config: { effort: "medium", format: zodOutputFormat(Result) },
  system: `你是韓語文法標註員。對每個例句，列出句中「確實用到」的文法 id（只能從清單選，2 級以上）。
不要列出該例句所屬的目標文法（target）。只列有把握的；同一個文法只列一次。

文法清單：
${index}`,
  messages: [{ role: "user", content: JSON.stringify(items) }],
});
if (!response.parsed_output) throw new Error("no output");

const tags = new Map(response.parsed_output.tags.map((t) => [t.key, t.ids]));
for (const l of lessons) {
  l.examples.forEach((ex, i) => {
    const ids = (tags.get(`${l.id}#${i}`) ?? []).filter((id) => id !== l.id && (valid.get(id)?.level ?? 0) >= 2);
    ex.grammar = [...new Set(ids)];
    console.log(`${l.id} ${ex.ko}  →  ${ex.grammar.map((id) => valid.get(id)!.form).join(", ") || "（無）"}`);
  });
}
fs.writeFileSync(LESSONS_PATH, JSON.stringify(lessons, null, 2) + "\n");
