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

const OUTCOME_BADGE: Record<
  Round["outcome"],
  { text: string; className: string }
> = {
  first: { text: "第 1 次就寫對", className: "bg-sage-soft text-sage-ink" },
  second: { text: "第 2 次寫對", className: "bg-sage-soft text-sage-ink" },
  third: { text: "第 3 次寫對", className: "bg-sage-soft text-sage-ink" },
  revealed: { text: "看了參考答案", className: "bg-peach text-ink" },
  open: { text: "還在練習中", className: "bg-hint text-ink" },
};

// 「第幾次寫對」排序：寫對的照次數，看了答案和還在練習中的排在最後。
const triesRank = (r: Round) =>
  r.outcome === "revealed" || r.outcome === "open" ? 99 : r.steps.length;

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
      <mark
        key={s}
        className="rounded bg-hint px-0.5 text-ink underline decoration-hint-line decoration-2 underline-offset-4"
      >
        {step.sentence.slice(s, e)}
      </mark>,
    );
    pos = e;
  }
  out.push(step.sentence.slice(pos));
  return <>{out}</>;
}

const DATE_RANGES = [
  { id: "all", label: "全部" },
  { id: "today", label: "今天" },
  { id: "week", label: "這週" },
  { id: "month", label: "這個月" },
  { id: "custom", label: "自訂" },
] as const;
type DateRange = (typeof DATE_RANGES)[number]["id"];

const TRIES = [
  { id: "all", label: "全部" },
  { id: "first", label: "第 1 次" },
  { id: "second", label: "第 2 次" },
  { id: "third", label: "第 3 次" },
  { id: "revealed", label: "看了參考答案" },
  { id: "open", label: "還在練習中" },
] as const;
type Tries = (typeof TRIES)[number]["id"];

/** 韓國時間的今天（YYYY-MM-DD），以及這週一、這個月 1 號。 */
function kstToday() {
  const now = new Date(Date.now() + 9 * 3600_000);
  const today = now.toISOString().slice(0, 10);
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  return {
    today,
    weekStart: monday.toISOString().slice(0, 10),
    monthStart: `${today.slice(0, 8)}01`,
  };
}

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-9 rounded-full border-2 px-3 text-sm transition-colors ${
            value === o.id
              ? "border-sage-ink bg-sage-soft font-medium text-sage-ink"
              : "border-line bg-white text-ink-soft hover:bg-cream"
          }`}
        >
          {o.label}
          {o.count !== undefined && (
            <span className="ml-1 tabular-nums opacity-70">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function SentenceBook({ rounds }: { rounds: Round[] }) {
  const [sort, setSort] = useState<Sort>("date");
  const [range, setRange] = useState<DateRange>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [tries, setTries] = useState<Tries>("all");

  const { today, weekStart, monthStart } = kstToday();
  // 只套用目前這個排列方式底下的篩選，畫面上看得到的條件就是全部的條件。
  const filtered = rounds.filter((r) => {
    if (sort === "date") {
      if (range === "today") return r.date === today;
      if (range === "week") return r.date >= weekStart;
      if (range === "month") return r.date >= monthStart;
      if (range === "custom")
        return (!from || r.date >= from) && (!to || r.date <= to);
      return true;
    }
    if (sort === "level") return level === "all" || String(r.level) === level;
    return tries === "all" || r.outcome === tries;
  });
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "level")
      return a.level - b.level || b.endedAt.localeCompare(a.endedAt);
    if (sort === "tries")
      return triesRank(a) - triesRank(b) || b.endedAt.localeCompare(a.endedAt);
    return b.endedAt.localeCompare(a.endedAt);
  });
  // 1～6 級都列出來，還沒練過的級數顯示 0
  const levels = [1, 2, 3, 4, 5, 6];

  return (
    <>
      <div className="mb-4 grid gap-3 rounded-3xl border-2 border-line bg-white p-4">
        <div
          role="group"
          aria-label="排列方式"
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <span className="text-ink-soft">排列方式</span>
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={sort === s.id}
              onClick={() => setSort(s.id)}
              className={`min-h-11 rounded-full border-2 px-4 transition-colors ${
                sort === s.id
                  ? "border-ink bg-sage-soft font-medium"
                  : "border-line bg-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {sort === "date" && (
          <>
            <Chips
              label="日期範圍"
              options={DATE_RANGES}
              value={range}
              onChange={setRange}
            />
            {range === "custom" && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-2">
                  從
                  <input
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => setFrom(e.target.value)}
                    className="field min-h-10 w-auto py-1"
                  />
                </label>
                <label className="flex items-center gap-2">
                  到
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => setTo(e.target.value)}
                    className="field min-h-10 w-auto py-1"
                  />
                </label>
              </div>
            )}
          </>
        )}
        {sort === "level" && (
          <Chips
            label="級數"
            options={[
              { id: "all", label: "全部", count: rounds.length },
              ...levels.map((l) => ({
                id: String(l),
                label: `${l} 級`,
                count: rounds.filter((r) => r.level === l).length,
              })),
            ]}
            value={level}
            onChange={setLevel}
          />
        )}
        {sort === "tries" && (
          <Chips
            label="第幾次寫對"
            options={TRIES.map((t) => ({
              ...t,
              count:
                t.id === "all"
                  ? rounds.length
                  : rounds.filter((r) => r.outcome === t.id).length,
            }))}
            value={tries}
            onChange={setTries}
          />
        )}
        <p className="text-xs text-ink-soft" aria-live="polite">
          共 {sorted.length} 題
        </p>
      </div>
      {sorted.length === 0 && (
        <p className="card py-10 text-center text-ink-soft">
          這個範圍裡還沒有句子。
        </p>
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {sorted.map((r) => {
          const badge = OUTCOME_BADGE[r.outcome];
          return (
            <li
              key={r.key}
              className="rounded-3xl border-2 border-ink bg-white p-5"
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Link
                  href={`/workshop/${r.grammarId}`}
                  lang="ko"
                  className="text-lg font-bold underline underline-offset-4"
                >
                  {r.form}
                </Link>
                <span className="rounded-full border-2 border-line px-2.5 text-xs leading-6">
                  {r.level} 級
                </span>
                <span
                  className={`rounded-full px-2.5 text-xs leading-6 ${badge.className}`}
                >
                  {badge.text}
                </span>
                <span className="ml-auto text-xs tabular-nums text-ink-soft">
                  {r.stamp}
                </span>
              </div>
              <ol className="relative grid gap-3">
                {/* 串起每一次的直線 */}
                {r.steps.length > 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-3 bottom-3 left-[11px] w-0.5 rounded bg-line"
                  />
                )}
                {r.steps.map((s, i) => (
                  <li
                    key={i}
                    className="relative grid grid-cols-[24px_1fr] gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className={`relative mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
                        s.solved
                          ? "border-sage-ink bg-sage text-white"
                          : "border-line bg-white text-ink-soft"
                      }`}
                    >
                      {s.solved ? (
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
                          <path
                            d="M3.5 8.5l3 3 6-7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        s.attempt
                      )}
                    </span>
                    <div>
                      <p className="text-xs text-ink-soft">
                        第 {s.attempt} 次{s.solved ? "：寫對了" : ""}
                      </p>
                      <p
                        lang="ko"
                        className={`text-lg leading-8 ${s.solved ? "font-medium text-sage-ink" : ""}`}
                      >
                        <Highlighted step={s} />
                      </p>
                      {!s.solved && s.categories.length > 0 && (
                        <p className="mt-1 flex flex-wrap gap-1">
                          {s.categories.map((c) => (
                            <span
                              key={c}
                              className="rounded-full bg-cream px-2 text-xs leading-6 text-ink-soft"
                            >
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
