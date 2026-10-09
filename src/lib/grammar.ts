import grammarData from "@/data/grammar.json";
import lessonData from "@/data/lessons.json";

export type GrammarItem = {
  id: string;
  level: number;
  category: string;
  form: string;
  variants: string[];
  meaning: string | null;
};

export type Lesson = {
  id: string;
  title_zh: string;
  core_zh: string;
  pattern: string;
  examples: { ko: string; zh: string }[];
  pitfall_zh: string;
  prompts: { scene: "daily" | "fan" | "work" | "topik"; situation_zh: string }[];
  reviewed: boolean;
};

export type ProgressState = "seen" | "know" | "use";

export const STATE_RANK: Record<ProgressState, number> = { seen: 1, know: 2, use: 3 };
export const STATE_LABEL: Record<ProgressState, string> = { seen: "看過", know: "認得", use: "會用" };
export const STATE_DEFINITION: Record<ProgressState, string> = {
  seen: "打開過這個文法，或在例句裡看過",
  know: "自己寫過，但還沒寫對",
  use: "靠自己寫對了（照抄參考答案不算）",
};

export const CATEGORY_LABEL: Record<string, string> = {
  조사: "助詞",
  선어말어미: "先語末語尾",
  연결어미: "連結語尾",
  전성어미: "轉成語尾",
  종결어미: "終結語尾",
  표현: "表現",
};

export const grammar = grammarData as GrammarItem[];
export const lessons = lessonData as Lesson[];

const grammarById = new Map(grammar.map((g) => [g.id, g]));
const lessonById = new Map(lessons.map((l) => [l.id, l]));

export function getGrammar(id: string) {
  return grammarById.get(id);
}

export function getLesson(id: string) {
  return lessonById.get(id);
}

/** 原始資料用數字區分同形異義（-거든1、-다가1(2)），畫面上拿掉。 */
export function displayForm(form: string) {
  return form.replace(/\d+(\(\d+\))?$/, "").replace(/(\D)\d+$/, "$1");
}

export function higherState(a: ProgressState | undefined, b: ProgressState): ProgressState {
  if (!a) return b;
  return STATE_RANK[b] > STATE_RANK[a] ? b : a;
}
