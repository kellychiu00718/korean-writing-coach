import { displayForm, getGrammar, grammar, type Lesson, type ProgressState } from "@/lib/grammar";
import { getLesson, lessons } from "@/lib/lessons";
import { INTERESTS, type Interest } from "@/lib/profile";
import { RecommendedPractice, type Candidate } from "./RecommendedPractice";

type Row = { grammarId: string; state: ProgressState; updatedAt: string };
type Pick = { lesson: Lesson; reason: string; promptIndex: number };

/**
 * 一進工坊就看到的練習：先幫「大概知道」和看過但還沒寫的文法變成「自己寫出來且用對」，
 * 再挑已經寫對的文法換情境複習；新使用者就依興趣推薦。
 */
export function TodayPractice({
  rows,
  interests,
}: {
  rows: Row[];
  interests: Interest[];
}) {
  const order = new Map(grammar.map((g, i) => [g.id, i]));
  const stateOf = new Map(rows.map((r) => [r.grammarId, r.state]));
  const withLesson = (state: ProgressState) =>
    rows
      .filter((r) => r.state === state && getLesson(r.grammarId))
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

  // 優先出符合興趣的情境；複習時換一個不同的情境
  const promptFor = (lesson: Lesson, avoidFirst = false) => {
    const idx = lesson.prompts.findIndex((p) => interests.includes(p.scene));
    const preferred = idx >= 0 ? idx : 0;
    return avoidFirst && lesson.prompts.length > 1
      ? (preferred + 1) % lesson.prompts.length
      : preferred;
  };

  const picks: Pick[] = [];
  const add = (lesson: Lesson, reason: string, avoidFirst = false) => {
    if (!picks.some((p) => p.lesson.id === lesson.id)) {
      picks.push({
        lesson,
        reason,
        promptIndex: promptFor(lesson, avoidFirst),
      });
    }
  };

  const know = withLesson("know");
  const seen = withLesson("seen");
  const use = withLesson("use");
  know
    .slice(0, seen.length ? 1 : 2)
    .forEach((r) => add(getLesson(r.grammarId)!, "差一點就會了"));
  seen
    .slice(0, 1)
    .forEach((r) => add(getLesson(r.grammarId)!, "還沒寫過，試著寫寫看"));
  use
    .slice(0, 1)
    .forEach((r) => add(getLesson(r.grammarId)!, "換個情境複習", true));
  know.forEach((r) => add(getLesson(r.grammarId)!, "差一點就會了"));
  seen.forEach((r) => add(getLesson(r.grammarId)!, "還沒寫過，試著寫寫看"));
  lessons
    .filter((l) => !stateOf.has(l.id))
    .sort((a, b) => {
      const ma = a.prompts.some((p) => interests.includes(p.scene)) ? 0 : 1;
      const mb = b.prompts.some((p) => interests.includes(p.scene)) ? 0 : 1;
      return ma - mb || order.get(a.id)! - order.get(b.id)!;
    })
    .forEach((l) => add(l, "新的文法"));
  use.forEach((r) => add(getLesson(r.grammarId)!, "換個情境複習", true));

  if (!picks.length) return null;

  // 全部候選都交給畫面；先顯示排在最前面的 3 題，按「換一批」再從候選裡重抽。
  const pool: Candidate[] = picks.map(({ lesson, reason, promptIndex }) => {
    const g = getGrammar(lesson.id)!;
    return {
      id: lesson.id,
      form: displayForm(g.form),
      level: g.level,
      reason,
      promptIndex,
      prompts: lesson.prompts.map((p) => ({
        scene: INTERESTS.find((i) => i.id === p.scene)?.label ?? "",
        situation: p.situation_zh,
      })),
    };
  });
  return <RecommendedPractice pool={pool} />;
}
