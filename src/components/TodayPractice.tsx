import Link from "next/link";
import { displayForm, getGrammar, getLesson, grammar, lessons, type Lesson, type ProgressState } from "@/lib/grammar";
import { INTERESTS, type Interest } from "@/lib/profile";

type Row = { grammarId: string; state: ProgressState; updatedAt: string };
type Pick = { lesson: Lesson; reason: string; promptIndex: number };

const LIMIT = 3;

/**
 * 一進工坊就看到的練習：先幫「認得」「看過」的文法變成「會用」，
 * 再挑會用的文法換情境複習；新使用者就依興趣推薦。
 */
export function TodayPractice({ rows, interests }: { rows: Row[]; interests: Interest[] }) {
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
    return avoidFirst && lesson.prompts.length > 1 ? (preferred + 1) % lesson.prompts.length : preferred;
  };

  const picks: Pick[] = [];
  const add = (lesson: Lesson, reason: string, avoidFirst = false) => {
    if (picks.length < LIMIT && !picks.some((p) => p.lesson.id === lesson.id)) {
      picks.push({ lesson, reason, promptIndex: promptFor(lesson, avoidFirst) });
    }
  };

  const know = withLesson("know");
  const seen = withLesson("seen");
  const use = withLesson("use");
  know.slice(0, seen.length ? 1 : 2).forEach((r) => add(getLesson(r.grammarId)!, "差一點就會了"));
  seen.slice(0, 1).forEach((r) => add(getLesson(r.grammarId)!, "看過了，試著寫寫看"));
  use.slice(0, 1).forEach((r) => add(getLesson(r.grammarId)!, "換個情境複習", true));
  know.forEach((r) => add(getLesson(r.grammarId)!, "差一點就會了"));
  seen.forEach((r) => add(getLesson(r.grammarId)!, "看過了，試著寫寫看"));
  lessons
    .filter((l) => !stateOf.has(l.id))
    .sort((a, b) => {
      const ma = a.prompts.some((p) => interests.includes(p.scene)) ? 0 : 1;
      const mb = b.prompts.some((p) => interests.includes(p.scene)) ? 0 : 1;
      return ma - mb || order.get(a.id)! - order.get(b.id)!;
    })
    .forEach((l) => add(l, "新的文法"));

  if (!picks.length) return null;

  return (
    <section className="mb-10" aria-labelledby="today">
      <h2 id="today" className="mb-1 text-xl font-bold">
        今天的練習
      </h2>
      <p className="mb-4 text-sm text-ink-soft">依你寫過的句子挑的。想練別的也可以，往下挑就好。</p>
      <ul className="grid gap-3 md:grid-cols-3">
        {picks.map(({ lesson, reason, promptIndex }) => {
          const g = getGrammar(lesson.id)!;
          const prompt = lesson.prompts[promptIndex];
          const scene = INTERESTS.find((i) => i.id === prompt.scene)?.label;
          return (
            <li key={lesson.id}>
              <Link
                href={`/workshop/${lesson.id}?p=${promptIndex}`}
                className="flex h-full flex-col gap-1 rounded-3xl border-2 border-ink bg-white p-5 transition-transform hover:-translate-y-0.5"
              >
                <span className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-full bg-peach px-2 py-0.5 font-medium">{reason}</span>
                  <span className="text-ink-soft">
                    {g.level} 級{scene && `・${scene}`}
                  </span>
                </span>
                <span lang="ko" className="text-xl">
                  {displayForm(g.form)}
                </span>
                <span className="text-sm text-ink-soft">{prompt.situation_zh}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
