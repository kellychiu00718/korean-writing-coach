"use client";

import Link from "next/link";
import { useState } from "react";
import type { Round, RoundStep } from "@/lib/stats";

const SORTS = [
  { id: "date", label: "日期" },
  { id: "level", label: "級數" },
  { id: "tries", label: "第幾次寫對" },
] as const;
type Sort = (typeof SORTS)[number]["id"];

const OUTCOME_BADGE: Record<Round["outcome"], { text: string; className: string }> = {
  first: { text: "第 1 次就寫對", className: "bg-sage-soft text-sage-ink" },
  second: { text: "第 2 次寫對", className: "bg-sage-soft text-sage-ink" },
  third: { text: "第 3 次以上寫對", className: "bg-sage-soft text-sage-ink" },
  revealed: { text: "看了參考答案", className: "bg-peach text-ink" },
  open: { text: "還在改", className: "bg-hint text-ink" },
};

// 「第幾次寫對」排序：寫對的照次數，看了答案和還在改的排在最後。
const triesRank = (r: Round) => (r.outcome === "revealed" || r.outcome === "open" ? 99 : r.steps.length);

/** 把 AI 標出要改的那一段畫上底色，讓人一眼看到「當時卡在哪」。 */
function Highlighted({ step }: { step: RoundStep }) {
  if (step.solved || !step.spans.length) return <>{step.sentence}</>;
  const marks: [number, number][] = [];
  for (const span of step.spans) {
    const i = step.sentence.indexOf(span);
    if (i >= 0) marks.push([i, i + span.length]);
  }
  marks.sort((a, b) => a[0] - b[0]);
  const out: React.ReactNode[] = [];
  let pos = 0;
  for (const [s, e] of marks) {
    if (s < pos) continue;
    if (s > pos) out.push(step.sentence.slice(pos, s));
    out.push(
      <mark key={s} className="rounded bg-hint px-0.5 text-ink underline decoration-hint-line decoration-2 underline-offset-4">
        {step.sentence.slice(s, e)}
      </mark>,
    );
    pos = e;
  }
  out.push(step.sentence.slice(pos));
  return <>{out}</>;
}

export function SentenceBook({ rounds }: { rounds: Round[] }) {
  const [sort, setSort] = useState<Sort>("date");
  const sorted = [...rounds].sort((a, b) => {
    if (sort === "level") return a.level - b.level || b.endedAt.localeCompare(a.endedAt);
    if (sort === "tries") return triesRank(a) - triesRank(b) || b.endedAt.localeCompare(a.endedAt);
    return b.endedAt.localeCompare(a.endedAt);
  });

  return (
    <>
      <div role="group" aria-label="排列方式" className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-soft">排列方式</span>
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={sort === s.id}
            onClick={() => setSort(s.id)}
            className={`min-h-11 rounded-full border-2 px-4 transition-colors ${
              sort === s.id ? "border-ink bg-sage-soft font-medium" : "border-line bg-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {sorted.map((r) => {
          const badge = OUTCOME_BADGE[r.outcome];
          return (
            <li key={r.key} className="rounded-3xl border-2 border-ink bg-white p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Link href={`/workshop/${r.grammarId}`} lang="ko" className="text-lg font-bold underline underline-offset-4">
                  {r.form}
                </Link>
                <span className="rounded-full border-2 border-line px-2.5 text-xs leading-6">{r.level} 級</span>
                <span className={`rounded-full px-2.5 text-xs leading-6 ${badge.className}`}>{badge.text}</span>
                <span className="ml-auto text-xs tabular-nums text-ink-soft">{r.stamp}</span>
              </div>
              <ol className="relative grid gap-3">
                {/* 串起每一次的直線 */}
                {r.steps.length > 1 && (
                  <span aria-hidden="true" className="absolute top-3 bottom-3 left-[11px] w-0.5 rounded bg-line" />
                )}
                {r.steps.map((s, i) => (
                  <li key={i} className="relative grid grid-cols-[24px_1fr] gap-3">
                    <span
                      aria-hidden="true"
                      className={`relative mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
                        s.solved ? "border-sage-ink bg-sage text-white" : "border-line bg-white text-ink-soft"
                      }`}
                    >
                      {s.solved ? (
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
                          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        s.attempt
                      )}
                    </span>
                    <div>
                      <p className="text-xs text-ink-soft">
                        第 {s.attempt} 次{s.solved ? "：寫對了" : ""}
                      </p>
                      <p lang="ko" className={`text-lg leading-8 ${s.solved ? "font-medium text-sage-ink" : ""}`}>
                        <Highlighted step={s} />
                      </p>
                      {!s.solved && s.categories.length > 0 && (
                        <p className="mt-1 flex flex-wrap gap-1">
                          {s.categories.map((c) => (
                            <span key={c} className="rounded-full bg-cream px-2 text-xs leading-6 text-ink-soft">
                              {c}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ul>
    </>
  );
}
