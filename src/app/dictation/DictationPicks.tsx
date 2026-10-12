"use client";

import { useState } from "react";
import { type CardData, ClipCard } from "./ClipCard";

export type PickCandidate = CardData & { reason: string };

const COUNT = 3;

function shuffle<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 推薦練習：跟句子工坊一樣，先照優先順序顯示 3 句，按「換一批」從候選裡重抽。 */
export function DictationPicks({ pool }: { pool: PickCandidate[] }) {
  const [shown, setShown] = useState(() => pool.slice(0, COUNT));
  const [spins, setSpins] = useState(0);

  function reroll() {
    const current = new Set(shown.map((c) => c.id));
    // 候選夠多時，換成畫面上沒有的句子
    const fresh = shuffle(pool.filter((c) => !current.has(c.id)));
    const rest = shuffle(pool.filter((c) => current.has(c.id)));
    setShown([...fresh, ...rest].slice(0, COUNT));
    setSpins((n) => n + 1);
  }

  return (
    <section className="mb-10" aria-labelledby="picks-title">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 id="picks-title" className="text-xl font-bold">
          推薦練習
        </h2>
        {pool.length > COUNT && (
          <button
            type="button"
            onClick={reroll}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-ink bg-white px-4 text-sm font-medium transition-transform duration-100 hover:bg-cream active:scale-[0.96]"
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={{ transform: `rotate(${spins * 360}deg)` }}
            >
              <path
                d="M16 10a6 6 0 1 1-1.76-4.24M16 3.5v3.5h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            換一批
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-ink-soft">依照你的興趣或是練習過的句子挑選的，想練習別的，直接往下尋找其他句子！</p>
      <ul className="grid gap-3 md:grid-cols-3" aria-live="polite">
        {shown.map((c) => (
          <li key={`${c.id}-${spins}`} className="animate-pop">
            <ClipCard clip={c} tag={c.reason} />
          </li>
        ))}
      </ul>
    </section>
  );
}
