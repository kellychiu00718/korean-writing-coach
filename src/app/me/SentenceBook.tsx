"use client";

import Link from "next/link";
import { useState } from "react";
import { FilterMenu } from "@/components/FilterMenu";
import { Pager, usePaged } from "@/components/Pager";
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

export function SentenceBook({ rounds }: { rounds: Round[] }) {
  const [sort, setSort] = useState<Sort>("date");
  const [range, setRange] = useState<DateRange>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [tries, setTries] = useState<Tries>("all");

  const { today, weekStart, monthStart } = kstToday();
  const inRange = (r: Round, id: DateRange) => {
    if (id === "today") return r.date === today;
    if (id === "week") return r.date >= weekStart;
    if (id === "month") return r.date >= monthStart;
    // 自訂：還沒選任何日期時不篩，選了才依起訖日期篩
    if (id === "custom") return (!from || r.date >= from) && (!to || r.date <= to);
    return true;
  };
  // 三種篩選可以疊加；每個選項旁的數字是「套用其他兩種篩選後」會剩幾題
  const pass = (r: Round, skip?: "range" | "level" | "tries") =>
    (skip === "range" || inRange(r, range)) &&
    (skip === "level" || level === "all" || String(r.level) === level) &&
    (skip === "tries" || tries === "all" || r.outcome === tries);
  const filtered = rounds.filter((r) => pass(r));
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "level")
      return a.level - b.level || b.endedAt.localeCompare(a.endedAt);
    if (sort === "tries")
      return triesRank(a) - triesRank(b) || b.endedAt.localeCompare(a.endedAt);
    return b.endedAt.localeCompare(a.endedAt);
  });
  // 每頁 10 題；篩選或排列改變時回到第 1 頁
  const paged = usePaged(sorted, 10);
  const resetPage = () => paged.setPage(1);
  // 1～6 級都列出來，還沒練過的級數顯示 0
  const levels = [1, 2, 3, 4, 5, 6];
  const anyFilter = range !== "all" || level !== "all" || tries !== "all";
  function clear() {
    resetPage();
    setRange("all");
    setLevel("all");
    setTries("all");
    setFrom("");
    setTo("");
  }

  return (
    <>
      <div className="mb-4 grid gap-3">
        {/* 跟聽打練習一樣：滑鼠移上去就展開，手機用點的 */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterMenu
            label="日期"
            options={DATE_RANGES.map((d) => ({
              key: d.id,
              label: d.label,
              count: d.id === "custom" ? undefined : rounds.filter((r) => inRange(r, d.id) && pass(r, "range")).length,
              on: range === d.id,
              onSelect: () => (resetPage(), setRange(d.id)),
            }))}
          />
          <FilterMenu
            label="級數"
            options={[
              { key: "all", label: "全部", count: rounds.filter((r) => pass(r, "level")).length, on: level === "all", onSelect: () => (resetPage(), setLevel("all")) },
              ...levels.map((l) => ({
                key: String(l),
                label: `${l} 級`,
                count: rounds.filter((r) => r.level === l && pass(r, "level")).length,
                on: level === String(l),
                onSelect: () => (resetPage(), setLevel(String(l))),
              })),
            ]}
          />
          <FilterMenu
            label="第幾次寫對"
            options={TRIES.map((t) => ({
              key: t.id,
              label: t.label,
              count: rounds.filter((r) => (t.id === "all" || r.outcome === t.id) && pass(r, "tries")).length,
              on: tries === t.id,
              onSelect: () => (resetPage(), setTries(t.id)),
            }))}
          />
          <FilterMenu
            label="排列"
            neutral
            options={SORTS.map((o) => ({
              key: o.id,
              label: o.id === "date" ? "最新的在前" : o.id === "level" ? "級數低到高" : "第幾次寫對",
              on: sort === o.id,
              onSelect: () => (resetPage(), setSort(o.id)),
            }))}
          />
          {anyFilter && (
            <button type="button" onClick={clear} className="inline-flex min-h-11 items-center px-2 text-sm text-ink-soft underline">
              清除篩選
            </button>
          )}
        </div>
        {range === "custom" && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-2">
              從
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => (resetPage(), setFrom(e.target.value))}
                className="field min-h-10 w-auto py-1"
              />
            </label>
            <label className="flex items-center gap-2">
              到
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => (resetPage(), setTo(e.target.value))}
                className="field min-h-10 w-auto py-1"
              />
            </label>
          </div>
        )}
        <p className="text-xs text-ink-soft" aria-live="polite">
          共 {sorted.length} 題
        </p>
      </div>
      {sorted.length === 0 && (
        <p className="card py-10 text-center text-ink-soft">
          這個範圍裡還沒有句子。
        </p>
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {paged.items.map((r) => {
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
      <Pager page={paged.page} pages={paged.pages} onChange={paged.setPage} label="句子本分頁" />
    </>
  );
}
