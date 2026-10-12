"use client";

import Link from "next/link";
import { useState } from "react";
import { AccuracyChart, SpeedChart } from "@/components/charts";
import { Pager, usePaged } from "@/components/Pager";
import { TYPING_GRADES, UNDERSTOOD } from "@/lib/dictation-compare";
import type { DictationStats } from "@/lib/dictation-stats";

type Tab = "practiced" | "accuracy" | "level" | "speed";

/**
 * 我的頁面的聽打練習：跟句子工坊一樣，四個數字方塊點了就在下面展開詳細內容。
 * 練過的句子：每一句的紀錄；正確率：每天的長條圖；最高級數：各級聽懂幾句；打字速度：折線圖。
 */
export function DictationProgress({ s }: { s: DictationStats }) {
  const [tab, setTab] = useState<Tab | null>("practiced");
  const trend = s.recentAvg !== null && s.prevAvg !== null ? s.recentAvg - s.prevAvg : null;
  const tiles: { id: Tab; label: string; value: number | string; unit: string; note: string }[] = [
    {
      id: "practiced",
      label: "練過的句子",
      value: s.practiced,
      unit: "句",
      note: `聽力模式總共練了 ${s.attempts} 次`,
    },
    {
      id: "accuracy",
      label: "最近 10 次的平均正確率",
      value: s.recentAvg ?? "—",
      unit: s.recentAvg !== null ? "%" : "",
      note:
        trend === null
          ? "練滿 20 次後，會跟前 10 次比較"
          : trend === 0
            ? "跟前 10 次一樣"
            : `比前 10 次${trend > 0 ? "進步" : "退步"} ${Math.abs(trend)} 個百分點`,
    },
    {
      id: "level",
      label: "聽懂的最高級數",
      value: s.topLevel ?? "—",
      unit: s.topLevel !== null ? "級" : "",
      note: `正確率 ${UNDERSTOOD}% 以上才算聽懂`,
    },
    {
      id: "speed",
      label: "最近的打字速度",
      value: s.speedAvg ?? "—",
      unit: s.speedAvg !== null ? "타／分" : "",
      note:
        s.speedAvg === null
          ? "在打字模式測一次就會出現"
          : s.speedGrade
            ? `最近 5 次平均，大約是 ${s.speedGrade}的速度`
            : `最近 5 次平均，還沒到 3 級（${TYPING_GRADES[2].min} 타）`,
    },
  ];

  return (
    <>
      <ul className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => {
          const open = tab === t.id;
          return (
            <li key={t.id} className="grid">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`dpanel-${t.id}`}
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
                  <span className="whitespace-nowrap">
                    {t.value} <span className="font-sans text-base">{t.unit}</span>
                  </span>
                </span>
                <span className="mt-1 text-xs leading-5 text-ink-soft">{t.note}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {tab === "practiced" && (
        <div id="dpanel-practiced" className="card animate-pop">
          <h3 className="mb-3 font-bold">練過的句子</h3>
          {s.practicedList.length ? <PracticedList list={s.practicedList} /> : <Empty>用聽力模式練第一句之後，練過的句子會列在這裡。</Empty>}
        </div>
      )}

      {tab === "accuracy" && (
        <div id="dpanel-accuracy" className="card animate-pop">
          <h3 className="mb-3 font-bold">每天的正確率</h3>
          {s.days.length ? (
            <AccuracyChart days={s.days} goal={UNDERSTOOD} />
          ) : (
            <Empty>用聽力模式練第一句之後，這裡就會開始長出長條。</Empty>
          )}
        </div>
      )}

      {tab === "level" && (
        <div id="dpanel-level" className="card animate-pop">
          <h3 className="mb-1 font-bold">聽懂的級數</h3>
          <p className="mb-3 text-sm text-ink-soft">
            整條長條是題庫裡這一級的全部句子，淺綠是你練過的、深綠是其中聽懂（{UNDERSTOOD}% 以上）的。下面另外算你聽懂的句子裡，出現過幾個這一級的單字和文法（分母是題庫所有句子裡出現過的）。級數依國立國語院的分級。
          </p>
          {s.practiced ? <LevelRows s={s} /> : <Empty>練過的句子會依級數排在這裡。</Empty>}
        </div>
      )}

      {tab === "speed" && (
        <div id="dpanel-speed" className="card animate-pop">
          <h3 className="mb-3 font-bold">打字速度</h3>
          {s.speeds.length ? (
            <SpeedChart points={s.speeds} grades={TYPING_GRADES} />
          ) : (
            <Empty>在題目頁切到「打字模式」測一次速度，這裡就會開始畫線。</Empty>
          )}
        </div>
      )}
    </>
  );
}

function PracticedList({ list }: { list: DictationStats["practicedList"] }) {
  const paged = usePaged(list, 10);
  return (
    <>
      <ul className="grid gap-2 sm:grid-cols-2">
        {paged.items.map((c) => (
          <li key={c.id} className="rounded-2xl border-2 border-line bg-white px-4 py-3">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-peach px-2 leading-5 font-medium">{c.genre}</span>
              <span className="text-ink-soft">{c.level}&nbsp;級</span>
              <span
                className={`rounded-full px-2 leading-5 tabular-nums ${c.best >= UNDERSTOOD ? "bg-sage-soft text-sage-ink" : "bg-hint"}`}
              >
                最高 {c.best}%
              </span>
              <span className="ml-auto tabular-nums text-ink-soft">{c.stamp}</span>
            </div>
            <p lang="ko" className="text-base">
              {c.text}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-ink-soft">
              <span className="tabular-nums">
                最近一次 {c.last}%・練了 {c.tries} 次
              </span>
              <Link href={`/dictation/${c.id}`} className="underline underline-offset-4">
                再練一次
              </Link>
            </p>
          </li>
        ))}
      </ul>
      <Pager page={paged.page} pages={paged.pages} onChange={paged.setPage} label="練過的句子分頁" />
    </>
  );
}

function LevelRows({ s }: { s: DictationStats }) {
  return (
    <ul className="grid gap-3">
      {s.levels.map((l) => (
        <li key={l.level} className="grid grid-cols-[3rem_1fr] items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-medium">{l.level}&nbsp;級</span>
          {/* 淺色是練過的句子，綠色是其中聽懂的 */}
          <span
            className="relative h-3 overflow-hidden rounded-full bg-cream"
            role="img"
            aria-label={`${l.level} 級：題庫 ${l.total} 句，練過 ${l.practiced} 句，聽懂 ${l.understood} 句`}
          >
            <span className="absolute inset-y-0 left-0 rounded-full bg-sage-soft" style={{ width: pct(l.practiced, l.total) }} />
            <span className="absolute inset-y-0 left-0 rounded-full bg-sage" style={{ width: pct(l.understood, l.total) }} />
          </span>
          <span className="col-start-2 text-xs text-ink-soft tabular-nums">
            {l.level}&nbsp;級的句子：題庫 {l.total} 句，練過 {l.practiced}、聽懂 {l.understood}
            <br />
            聽懂過的 {l.level}&nbsp;級單字 {l.words}／{l.wordsTotal} 個、文法 {l.grammar}／{l.grammarTotal} 個
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 長條寬度：限制在 0–100%，資料異常（例如題庫減少）時也不會畫出框外 */
function pct(value: number, total: number) {
  return `${Math.min(100, Math.max(0, (value / Math.max(1, total)) * 100))}%`;
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl bg-cream px-4 py-6 text-center text-ink-soft">
      {children}
      <br />
      <Link href="/dictation" className="mt-1 inline-block underline underline-offset-4">
        去聽打練習
      </Link>
    </p>
  );
}
