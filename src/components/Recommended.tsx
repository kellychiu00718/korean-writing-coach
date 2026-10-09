import Link from "next/link";
import { displayForm, grammar, lessons, type ProgressState } from "@/lib/grammar";
import { INTERESTS, type Interest } from "@/lib/profile";

/** 還不會用、而且有符合興趣情境題的文法，挑幾個推薦。 */
export function Recommended({
  progress,
  interests,
  limit = 4,
}: {
  progress: Map<string, ProgressState>;
  interests: Interest[];
  limit?: number;
}) {
  const order = new Map(grammar.map((g, i) => [g.id, i]));
  const candidates = lessons
    .filter((l) => progress.get(l.id) !== "use")
    .map((l) => {
      const match = l.prompts.find((p) => interests.includes(p.scene));
      // 寫過但還沒寫對的優先，其次是符合興趣的
      const score = (progress.get(l.id) === "know" ? 2 : 0) + (match ? 1 : 0);
      return { lesson: l, match, score };
    })
    .sort((a, b) => b.score - a.score || order.get(a.lesson.id)! - order.get(b.lesson.id)!)
    .slice(0, limit);
  if (!candidates.length) return null;

  return (
    <section className="mb-10" aria-labelledby="recommended">
      <h2 id="recommended" className="mb-3 text-xl font-bold">
        推薦你練
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {candidates.map(({ lesson, match }) => {
          const g = grammar[order.get(lesson.id)!];
          return (
            <li key={lesson.id}>
              <Link
                href={`/workshop/${lesson.id}`}
                className="flex h-full flex-col gap-1 rounded-3xl border-2 border-ink bg-white p-5 transition-transform hover:-translate-y-0.5"
              >
                <span className="text-xs text-ink-soft">
                  {g.level} 級{match && `・${INTERESTS.find((i) => i.id === match.scene)?.label}`}
                </span>
                <span lang="ko" className="text-xl">
                  {displayForm(g.form)}
                </span>
                <span className="text-sm text-ink-soft">{match ? match.situation_zh : lesson.title_zh}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
