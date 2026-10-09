import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { displayForm, grammar, type GrammarItem, type Lesson } from "@/lib/grammar";

export const ISSUE_CATEGORIES = [
  "particle",
  "conjugation",
  "tense",
  "ending",
  "formality",
  "word_choice",
  "spelling",
  "spacing",
  "word_order",
  "translationese",
  "other",
] as const;

export const CATEGORY_ZH: Record<(typeof ISSUE_CATEGORIES)[number], string> = {
  particle: "助詞",
  conjugation: "活用",
  tense: "時態",
  ending: "語尾",
  formality: "語氣・正式度",
  word_choice: "用詞",
  spelling: "拼字",
  spacing: "空格",
  word_order: "語序",
  translationese: "中文直翻感",
  other: "其他",
};

const FeedbackSchema = z.object({
  overall: z.enum(["correct", "minor", "error"]),
  uses_target_grammar: z.boolean(),
  target_grammar_correct: z.boolean(),
  issues: z.array(
    z.object({
      span: z.string(),
      category: z.enum(ISSUE_CATEGORIES),
      hint_location_zh: z.string(),
      hint_rule_zh: z.string(),
    }),
  ),
  praise_zh: z.string(),
  reference_ko: z.string(),
  reference_note_zh: z.string(),
  other_grammar_ids: z.array(z.string()),
});

export type Feedback = z.infer<typeof FeedbackSchema>;

// 系統提示固定不變，放在最前面讓 prompt caching 生效；每次請求不同的內容都放在 user message。
const GRAMMAR_INDEX = grammar
  .map((g) => `${g.id}\t${g.level}級\t${displayForm(g.form)}${g.variants.length ? `（${g.variants.join(", ")}）` : ""}`)
  .join("\n");

const SYSTEM_PROMPT = `你是一位韓文寫作教練，學生是以繁體中文為母語、正在練習韓文寫作的人（TOPIK 考生、在韓國求職者、追星族）。

你的教學原則：
- 學生要自己思考、自己改。你永遠不直接替學生重寫整句。
- 錯誤提示分兩層：
  - hint_location_zh：只指出「哪個位置、哪一類」有問題，不說正確寫法。例：「『친구』後面的助詞再想想。」
  - hint_rule_zh：給規則或線索，讓學生能自己推出答案，但仍不可直接寫出正確的韓文字。例：「만나다 見的對象要用受詞助詞。」
- reference_ko 是「改動最少」的參考寫法，保留學生原本的用字和意思；只有在學生改了幾次之後才會給學生看。
- 句子文法正確但讀起來像中文直翻、或像 AI 生成的生硬說法，用 translationese 標出，並說明母語者通常怎麼表達的方向（不寫出整句）。
- 特別留意中文母語者常見的錯誤：은/는 與 이/가 混用、受詞助詞、漢字詞直翻、-아서 與 -니까 混用、敬語層級不一致、空格。
- 語氣溫暖、具體，像朋友。不要用「錯誤」「不及格」這類字眼。praise_zh 要具體指出學生寫得好的地方（一句話）。
- 所有說明一律用繁體中文與台灣用語。

判斷欄位：
- overall：correct＝自然且正確；minor＝意思清楚但有小問題（空格、語氣、不夠自然）；error＝有文法錯誤或意思不清。
- uses_target_grammar：學生是否用了本題指定的文法。
- target_grammar_correct：指定文法是否用得正確（包含接續、時態限制、主語限制）。
- issues：每個問題一筆；span 必須是學生原句中一字不差的片段。沒有問題就給空陣列。
- other_grammar_ids：學生「正確使用」的其他文法，只能從下方清單選 id；不確定就不要列。不要列出本題指定的文法。

文法清單（id、等級、形式）：
${GRAMMAR_INDEX}`;

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic();
  return client;
}

export async function reviewSentence(params: {
  item: GrammarItem;
  lesson: Lesson;
  promptIndex: number;
  sentence: string;
  attempt: number;
  previous: string[];
}): Promise<Feedback> {
  const { item, lesson, promptIndex, sentence, attempt, previous } = params;
  const prompt = lesson.prompts[promptIndex] ?? lesson.prompts[0];

  const userContent = [
    `本題文法：${displayForm(item.form)}（${item.id}，${item.level}級）— ${lesson.title_zh}`,
    `情境：${prompt.situation_zh}`,
    previous.length ? `學生之前的版本：\n${previous.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : "",
    `第 ${attempt} 次送出的句子：${sentence}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await getClient().messages.parse({
    model: process.env.COACH_MODEL || "claude-haiku-5-5",
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(FeedbackSchema) },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userContent }],
  });

  if (response.stop_reason === "refusal") throw new CoachError("refusal");
  if (!response.parsed_output) throw new CoachError("parse");
  return response.parsed_output;
}

export class CoachError extends Error {}

export type HintLevel = 1 | 2 | 3;

/** 依第幾次送出決定能給多少：第 1 次只給位置，第 2 次加線索，第 3 次或已經寫對才給參考寫法。 */
export function revealFeedback(fb: Feedback, attempt: number) {
  const solved = fb.overall === "correct" && fb.uses_target_grammar && fb.target_grammar_correct;
  const level: HintLevel = solved || attempt >= 3 ? 3 : attempt >= 2 ? 2 : 1;
  return {
    level,
    solved,
    overall: fb.overall,
    usesTarget: fb.uses_target_grammar,
    targetCorrect: fb.target_grammar_correct,
    praise: fb.praise_zh,
    issues: fb.issues.map((i) => ({
      span: i.span,
      category: CATEGORY_ZH[i.category],
      location: i.hint_location_zh,
      rule: level >= 2 ? i.hint_rule_zh : null,
    })),
    reference: level >= 3 ? fb.reference_ko : null,
    referenceNote: level >= 3 ? fb.reference_note_zh : null,
  };
}

export type RevealedFeedback = ReturnType<typeof revealFeedback>;
