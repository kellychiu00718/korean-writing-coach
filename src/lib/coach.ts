import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { displayForm, getGrammar, grammar, type GrammarItem, type Lesson } from "@/lib/grammar";

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
      clue_type: z.enum(["choices", "initials", "grammar"]),
      clue_zh: z.string(),
      choices: z.array(z.string()),
    }),
  ),
  praise_zh: z.string(),
  reference_ko: z.string(),
  reference_note_zh: z.string(),
  alternatives: z.array(z.object({ ko: z.string(), note_zh: z.string() })),
  other_grammar_ids: z.array(z.string()),
  retracted_zh: z.string(),
});

export type Feedback = z.infer<typeof FeedbackSchema>;

// 系統提示固定不變，放在最前面讓 prompt caching 生效；每次請求不同的內容都放在 user message。
const GRAMMAR_INDEX = grammar
  .map((g) => `${g.id}\t${g.level}級\t${displayForm(g.form)}${g.variants.length ? `（${g.variants.join(", ")}）` : ""}`)
  .join("\n");

const SYSTEM_PROMPT = `你是一位韓文寫作教練，學生是以繁體中文為母語、正在練習韓文寫作的人（TOPIK 考生、在韓國求職者、追星族）。

你的教學原則：
- 學生要自己思考、自己改。你永遠不直接替學生重寫整句。
- 每個問題的提示分兩層，兩層都要具體到學生看完知道「下一步要動哪個字」：
  - hint_location_zh（第 1 層，內容不要寫「第 1 層」字樣）：指出位置，並明說要改的是哪一種東西：單字、助詞、語尾、時態、活用、空格或語序。不說正確寫法。
    好的例子：「『친구가』的助詞要換一個。」「句尾『좋아해진다』的語尾要換，單字本身沒問題。」
    不可以：「語感有點生硬」「程度再深一點」這類沒有指出要改什麼的說法。
  - 第 2 層線索，依情況選一種 clue_type，寫在 clue_zh：
    - choices：在 choices 放 2–3 個韓文選項（含正確的一個，順序打亂），clue_zh 說明要從中選哪個、判斷的依據。適合助詞、語尾、易混淆單字。
    - initials：要換單字時，clue_zh 給中文意思＋該字的初聲，例如「意思是『越來越…』的副詞，初聲 ㅈㅈ」。choices 給空陣列。
    - grammar：要換句型時，clue_zh 指出要用的文法名稱和接法，例如「用 -아/어지다 表示變化」。choices 給空陣列。
- reference_ko 是「改動最少」的參考寫法：保留學生原本的用字和意思，而且一定要用到本題指定的文法。學生寫對或改了兩次之後才會看到。
- reference_note_zh：一句話說明參考寫法改了哪裡、為什麼；學生已經寫對就說明這句好在哪。
- alternatives：0–2 個「也很自然」的其他說法（ko＋note_zh 說明差別，例如更口語、更正式、強調變化）。只是風格選擇、不算錯的建議，一律放這裡，不要放進 issues。
- 句子文法正確但讀起來像中文直翻、或像 AI 生成的生硬說法，用 translationese 標出；第 1 層同樣要指出是哪個字或哪個語尾。
- 學生用了和參考寫法不同的單字或句型，只要意思符合情境、文法正確，就算對，不要因為「跟你想的不一樣」而扣分。
- 母語者確實會這樣說的句子就是對的。例如兩個表原因的連結語尾連用（-느라고 … -는 바람에）只要因果鏈合理，就是自然的韓文，不要當成重複。
- 判斷要前後一致：user message 會附上你之前對每一版的判斷。學生沒改的地方，除非你之前判斷錯了，否則結論要和之前一樣。
- 如果發現之前某一版的提示其實判斷錯了（那裡本來就沒問題，或類別標錯），這次就不要再標，並在 retracted_zh 用一句話向學生說明、道歉，例如「上一次說『카페에 갔다』的空格要改，是我看錯了，這裡本來就是對的，抱歉！」。沒有這種情況就給空字串。
- issues 裡的每一個問題，在 reference_ko 中都一定要被改掉；如果參考寫法裡那段跟學生寫的一模一樣，代表那裡沒問題，不要列。
- 拿不準時，以「母語者會不會這樣說」為準。
- 特別留意中文母語者常見的錯誤：은/는 與 이/가 混用、受詞助詞、漢字詞直翻、-아서 與 -니까 混用、敬語層級不一致、空格。
- 語氣溫暖、具體，像朋友。不要用「錯誤」「不及格」這類字眼。praise_zh 要具體指出學生寫得好的地方（一句話）。
- 所有說明一律用繁體中文與台灣用語。

判斷欄位：
- overall：correct＝自然且正確；minor＝意思清楚但有小問題（空格、語氣、不夠自然）；error＝有文法錯誤或意思不清。
- uses_target_grammar：學生是否用了本題指定的文法。
- target_grammar_correct：指定文法是否用得正確（包含接續、時態限制、主語限制）。
- issues：每個問題一筆；span 必須是學生原句中一字不差的片段。沒有問題就給空陣列。
- other_grammar_ids：學生「正確使用」的其他文法（2 級以上），只能從下方清單選 id；不確定就不要列。不要列 1 級的基本時態與語尾（如 -었-、-어요），也不要列出本題指定的文法。

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
  previous: PreviousVersion[];
}): Promise<Feedback> {
  const { item, lesson, promptIndex, sentence, attempt, previous } = params;
  const prompt = lesson.prompts[promptIndex] ?? lesson.prompts[0];

  const userContent = [
    `本題文法：${displayForm(item.form)}（${item.id}，${item.level}級）— ${lesson.title_zh}`,
    `情境：${prompt.situation_zh}`,
    previous.length
      ? `學生之前的版本，以及你當時的判斷：\n${previous
          .map((v, i) => {
            const flagged = v.issues.length
              ? v.issues.map((x) => `［${x.category}］${x.span}`).join("、")
              : "沒有標出問題";
            return `${i + 1}. ${v.sentence}\n   你當時的判斷：${OVERALL_ZH[v.overall] ?? v.overall}；標出：${flagged}`;
          })
          .join("\n")}`
      : "",
    `第 ${attempt} 次送出的句子：${sentence}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await getClient().messages.parse({
    model: process.env.COACH_MODEL || "claude-haiku-5-5",
    max_tokens: 4000,
    output_config: { effort: (process.env.COACH_EFFORT as "low" | "medium" | "high") || "medium", format: zodOutputFormat(FeedbackSchema) },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userContent }],
  });

  if (response.stop_reason === "refusal") throw new CoachError("refusal");
  if (!response.parsed_output) throw new CoachError("parse");
  return reconcile(response.parsed_output, sentence, previous);
}

export type PreviousVersion = {
  sentence: string;
  overall: string;
  issues: { category: string; span: string }[];
};

const OVERALL_ZH: Record<string, string> = { correct: "正確", minor: "有小問題", error: "有錯" };

/** 只去掉標點、保留空格，用來判斷兩句是否「連空格都一樣」。 */
const sameText = (a: string, b: string) =>
  a.replace(/[.,!?。！？~]/g, "").replace(/\s+/g, " ").trim() === b.replace(/[.,!?。！？~]/g, "").replace(/\s+/g, " ").trim();

/**
 * 用 AI 自己給的參考寫法檢查它的判斷有沒有自相矛盾：
 * - 參考寫法跟學生的句子一模一樣（連空格都一樣），就代表不用改，算寫對。
 * - 某個問題的片段原封不動出現在參考寫法裡，代表參考寫法沒改那裡，這個問題不成立。
 * 另外，句子和上一版完全一樣、這次卻改判正確，一定要跟學生說明上次看錯了。
 */
export function reconcile(fb: Feedback, sentence: string, previous: PreviousVersion[]): Feedback {
  let out = fb;
  const issues = fb.issues.filter(
    (i) => !(sentence.includes(i.span) && i.span.replace(/\s/g, "").length >= 2 && fb.reference_ko.includes(i.span)),
  );
  if (issues.length !== fb.issues.length) {
    out = { ...out, issues, ...(issues.length === 0 && { overall: "correct" as const }) };
  }
  if (fb.uses_target_grammar && sameText(fb.reference_ko, sentence)) {
    out = { ...out, overall: "correct", target_grammar_correct: true, issues: [] };
  }
  const last = previous.at(-1);
  if (!out.retracted_zh && out.overall === "correct" && last && last.overall !== "correct" && sameText(last.sentence, sentence)) {
    out = { ...out, retracted_zh: "這句跟上一版一模一樣，上一次的提示是教練看錯了，這句本來就是對的，抱歉讓你多改了一次！" };
  }
  return out;
}

export class CoachError extends Error {}

export type HintLevel = 1 | 2 | 3;

const normalize = (s: string) => s.replace(/[\s.,!?。！？~]/g, "");

/** 依第幾次送出決定能給多少：第 1 次只給位置，第 2 次加線索，第 3 次或已經寫對才給參考寫法。 */
export function revealFeedback(fb: Feedback, attempt: number, sentence: string, targetId: string) {
  const solved = fb.overall === "correct" && fb.uses_target_grammar && fb.target_grammar_correct;
  const level: HintLevel = solved || attempt >= 3 ? 3 : attempt >= 2 ? 2 : 1;
  const otherGrammar = [...new Set(fb.other_grammar_ids)]
    .filter((id) => id !== targetId)
    .map((id) => getGrammar(id))
    .filter((g): g is GrammarItem => Boolean(g) && g!.level >= 2)
    .map((g) => ({ id: g.id, form: displayForm(g.form), level: g.level }));
  return {
    level,
    solved,
    overall: fb.overall,
    usesTarget: fb.uses_target_grammar,
    targetCorrect: fb.target_grammar_correct,
    praise: fb.praise_zh,
    retracted: fb.retracted_zh || null,
    issues: fb.issues.map((i) => ({
      span: i.span,
      category: CATEGORY_ZH[i.category],
      location: i.hint_location_zh,
      clue: level >= 2 ? i.clue_zh : null,
      choices: level >= 2 && i.clue_type === "choices" ? i.choices : [],
    })),
    otherGrammar,
    reference: level >= 3 ? fb.reference_ko : null,
    referenceNote: level >= 3 ? fb.reference_note_zh : null,
    sameAsReference: level >= 3 && normalize(fb.reference_ko) === normalize(sentence),
    alternatives: level >= 3 ? fb.alternatives : [],
  };
}

export type RevealedFeedback = ReturnType<typeof revealFeedback>;
