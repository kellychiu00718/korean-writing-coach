import Link from "next/link";
import { displayForm, grammar, type ProgressState } from "@/lib/grammar";
import { getLesson } from "@/lib/lessons";

/** 「大概知道」的文法：寫過但還沒寫對。溫和地邀請回來再試，不催促。 */
export function AlmostThere({ progress }: { progress: Map<string, ProgressState> }) {
  const items = grammar.filter((g) => progress.get(g.id) === "know" && getLesson(g.id));
  if (!items.length) return null;
  return (
    <section className="mb-8 rounded-3xl bg-peach px-5 py-4" aria-labelledby="almost-there">
      <h2 id="almost-there" className="text-lg font-bold">
        差一點就會了
      </h2>
      <p className="mb-3 text-sm text-ink-soft">這些文法你已經寫過了，想到的時候再寫一句試試看。</p>
      <ul lang="ko" className="flex flex-wrap gap-2">
        {items.map((g) => (
          <li key={g.id}>
            <Link
              href={`/workshop/${g.id}`}
              className="inline-block rounded-full border-2 border-ink bg-white px-3.5 py-1.5 transition-transform hover:-translate-y-0.5"
            >
              {displayForm(g.form)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
