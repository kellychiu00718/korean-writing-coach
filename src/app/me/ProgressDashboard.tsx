"use client";

import Link from "next/link";
import { useState } from "react";
import { BarList, GrowthChart, type BarDetail } from "@/components/charts";
import type { LearnedGrammar, Round, RoundOutcome } from "@/lib/stats";

const OUTCOME_LABEL: Record<RoundOutcome, string> = {
  first: "第 1 次就寫對",
  second: "第 2 次寫對",
  third: "第 3 次以上寫對",
  revealed: "看了參考答案",
};

type Props = {
  learned: LearnedGrammar[];
  practiceUseCount: number;
  sentenceCount: number;
  roundCount: number;
  outcomes: Record<RoundOutcome, number>;
  outcomeItems: Record<RoundOutcome, BarDetail[]>;
  topCategories: { category: string; count: number; items: BarDetail[] }[];
  solvedRounds: Round[];
};

type Tab = "grammar" | "sentences" | "solved";

export function ProgressDashboard(p: Props) {
  const [tab, setTab] = useState<Tab | null>("grammar");
  const bonus = p.learned.length - p.practiceUseCount;
  const tiles: { id: Tab; label: string; value: number; unit: string; note: string }[] = [
    {
      id: "grammar",
      label: "目前為止應用正確的文法",
      value: p.learned.length,
      unit: "項",
      note: `練習題寫對 ${p.practiceUseCount} 項文法，寫出的句子中另外正確應用了 ${bonus} 項文法`,
    },
    { id: "sentences", label: "目前為止寫過的句子", value: p.sentenceCount, unit: "句", note: "每送出一次算一句，改寫也算" },
    { id: "solved", label: "目前為止寫對的題目", value: p.solvedRounds.length, unit: "題", note: "沒有看參考答案，靠自己寫對的題目" },
  ];

  return (
    <>
      <ul className="mb-5 grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => {
          const open = tab === t.id;
          return (
            <li key={t.id} className="grid">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(open ? null : t.id)}
                className={`grid content-start rounded-3xl border-2 border-ink px-5 py-4 text-left transition-[background-color,transform] duration-150 active:scale-[0.98] ${
                  open ? "bg-sage-soft" : "bg-white hover:bg-cream"
                }`}
              >
                <span className="flex items-center justify-between gap-2 text-sm text-ink-soft">
                  {t.label}
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  >
                    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="font-display text-3xl tabular-nums">
                  {t.value} <span className="font-sans text-base">{t.unit}</span>
                </span>
                <span className="mt-1 text-xs leading-5 text-ink-soft">{t.note}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {tab === "grammar" && (
        <div id="panel-grammar" className="card animate-pop">
          <GrowthChart events={p.learned.map((l) => ({ date: l.date, stamp: l.stamp, form: l.form }))} />
          {p.learned.length > 0 && <LearnedList learned={p.learned} />}
        </div>
      )}

      {tab === "sentences" && (
        <div id="panel-sentences" className="animate-pop grid gap-5 lg:grid-cols-2">
          <div className="card">
            <h3 className="mb-1 font-bold">每一題是第幾次寫對的</h3>
            <p className="mb-3 text-sm text-ink-soft">
              {p.roundCount ? `一共完成 ${p.roundCount} 題，點一下長條可以看是哪些題目。` : "完成第一題後就會出現。"}
            </p>
            {p.roundCount > 0 && (
              <BarList
                unit="題"
                rows={(Object.keys(OUTCOME_LABEL) as RoundOutcome[]).map((k) => ({
                  label: OUTCOME_LABEL[k],
                  value: p.outcomes[k],
                  items: p.outcomeItems[k],
                }))}
              />
            )}
          </div>
          <div className="card">
            <h3 className="mb-1 font-bold">最常需要提示的地方</h3>
            <p className="mb-3 text-sm text-ink-soft">知道自己常在哪裡卡住，下次寫的時候就可以多留意。</p>
            {p.topCategories.length ? (
              <BarList unit="次" rows={p.topCategories.map((c) => ({ label: c.category, value: c.count, items: c.items }))} />
            ) : (
              <p className="text-sm text-ink-soft">目前還沒有紀錄。</p>
            )}
          </div>
        </div>
      )}

      {tab === "solved" && (
        <div id="panel-solved" className="card animate-pop">
          <h3 className="mb-3 font-bold">靠自己寫對的題目</h3>
          {p.solvedRounds.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {p.solvedRounds.map((r) => {
                const last = r.steps.at(-1)!;
                return (
                  <li key={r.key} className="rounded-2xl border-2 border-line bg-white px-4 py-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Link href={`/workshop/${r.grammarId}`} lang="ko" className="font-medium underline underline-offset-4">
                        {r.form}
                      </Link>
                      <span className="rounded-full border-2 border-line px-2 text-xs leading-5">{r.level} 級</span>
                      <span className="rounded-full bg-sage-soft px-2 text-xs leading-5 text-sage-ink">第 {last.attempt} 次寫對</span>
                      <span className="ml-auto text-xs tabular-nums text-ink-soft">{r.stamp}</span>
                    </div>
                    <p lang="ko" className="text-lg">
                      {last.sentence}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">還沒有靠自己寫對的題目，慢慢來就好。</p>
          )}
        </div>
      )}
    </>
  );
}

function LearnedList({ learned }: { learned: LearnedGrammar[] }) {
  return (
    <details className="group mt-4 text-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-medium [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-open:rotate-90">
          <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        詳細
      </summary>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {[...learned].reverse().map((l) => (
          <li key={l.grammarId} className="rounded-2xl border-2 border-line bg-white px-3.5 py-2.5">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Link href={`/workshop/${l.grammarId}`} lang="ko" className="font-medium underline underline-offset-4">
                {l.form}
              </Link>
              <span className="rounded-full border-2 border-line px-2 text-xs leading-5">{l.level} 級</span>
              <span className={`rounded-full px-2 text-xs leading-5 ${l.source === "practice" ? "bg-sage-soft text-sage-ink" : "bg-peach"}`}>
                {l.source === "practice" ? "練習題寫對" : "句子中另外用對"}
              </span>
              <span className="ml-auto text-xs tabular-nums text-ink-soft">{l.stamp}</span>
            </div>
            {l.source === "practice" ? (
              <>
                <p className="text-xs text-ink-soft">練習這個文法時寫過的句子：</p>
                <ul className="mt-0.5 grid gap-0.5">
                  {l.sentences.map((s) => (
                    <li key={s} lang="ko" className={s === l.evidence ? "font-medium text-sage-ink" : ""}>
                      {s === l.evidence ? "✓ " : "・"}
                      {s}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              l.evidence && (
                <p>
                  <span className="text-xs text-ink-soft">用在這句：</span>
                  <span lang="ko">{l.evidence}</span>
                </p>
              )
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
