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
  examples: { ko: string; zh: string; grammar?: string[] }[];
  pitfall_zh: string;
  prompts: {
    scene: "daily" | "fan" | "work" | "topik";
    situation_zh: string;
    /** 預先寫好的一種寫法：只有當天 AI 次數用完、使用者主動要看時才給 */
    reference_ko: string;
  }[];
  reviewed: boolean;
};

export type ProgressState = "seen" | "know" | "use";

export const STATE_RANK: Record<ProgressState, number> = { seen: 1, know: 2, use: 3 };
// 畫面上只分三種：完全沒碰過和「打開過／在例句裡看過」都算「尚未學習」，資料庫仍分開記 seen。
export const STATE_LABEL: Record<ProgressState, string> = { seen: "尚未學習", know: "大概知道", use: "自己寫出來且用對" };
export const NONE_LABEL = "尚未學習";
export const STATE_DEFINITION: Record<ProgressState, string> = {
  seen: "還沒在句子工坊裡自己練習寫過",
  know: "有練習寫過，但目前還沒有正確應用到句子中",
  use: "在句子工坊裡靠自己將文法正確應用到句子中",
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
