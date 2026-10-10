"use client";

import Link from "next/link";
import { useState } from "react";

export type Candidate = {
  id: string;
  form: string;
  level: number;
  reason: string;
  promptIndex: number;
  prompts: { scene: string; situation: string }[];
};

type Shown = { c: Candidate; promptIndex: number };

const COUNT = 3;

function shuffle<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 推薦練習：第一次照優先順序顯示，按「換一批」就從候選裡重抽，情境也跟著換。 */
export function RecommendedPractice({ pool }: { pool: Candidate[] }) {
  const [shown, setShown] = useState<Shown[]>(() =>
    pool.slice(0, COUNT).map((c) => ({ c, promptIndex: c.promptIndex })),
  );
  const [spins, setSpins] = useState(0);

  function reroll() {
    const current = new Set(shown.map((s) => s.c.id));
    // 候選夠多時，盡量換成畫面上沒有的文法；不夠時至少換情境
    const fresh = shuffle(pool.filter((c) => !current.has(c.id)));
    const rest = shuffle(pool.filter((c) => current.has(c.id)));
    const next = [...fresh, ...rest].slice(0, COUNT).map((c) => {
      const old = shown.find((s) => s.c.id === c.id);
      let promptIndex = Math.floor(Math.random() * c.prompts.length);
      if (old && c.prompts.length > 1 && promptIndex === old.promptIndex)
        promptIndex = (promptIndex + 1) % c.prompts.length;
      return { c, promptIndex };
    });
    setShown(next);
    setSpins((n) => n + 1);
  }

  return (
    <section className="mb-10" aria-labelledby="today">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 id="today" className="text-xl font-bold">
          推薦練習
        </h2>
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
      </div>
      <p className="mb-4 text-sm text-ink-soft">
        依照你的興趣或是寫過的句子挑選的，想練習別的，直接往下尋找你想要練習的文法！
      </p>
      <ul className="grid gap-3 md:grid-cols-3" aria-live="polite">
        {shown.map(({ c, promptIndex }) => {
          const prompt = c.prompts[promptIndex];
          return (
            <li key={`${c.id}-${promptIndex}-${spins}`} className="animate-pop">
              <Link
                href={`/workshop/${c.id}?p=${promptIndex}`}
                className="flex h-full flex-col gap-1 rounded-3xl border-2 border-ink bg-white p-5 transition-transform hover:-translate-y-0.5"
              >
                <span className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-full bg-peach px-2 py-0.5 font-medium">
                    {c.reason}
                  </span>
                  <span className="text-ink-soft">
                    {c.level} 級{prompt.scene && `・${prompt.scene}`}
                  </span>
                </span>
                <span lang="ko" className="text-xl">
                  {c.form}
                </span>
                <span className="text-sm text-ink-soft">
                  {prompt.situation}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
