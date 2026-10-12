import Link from "next/link";
import { AccuracyChart, SpeedChart } from "@/components/charts";
import { TYPING_GRADES } from "@/lib/dictation-compare";
import { type DictationStats, UNDERSTOOD } from "@/lib/dictation-stats";

/** 我的頁面：聽打練習的進步（聽力模式的正確率、聽懂的級數、打字模式的速度） */
export function DictationProgress({ s }: { s: DictationStats }) {
  const trend = s.recentAvg !== null && s.prevAvg !== null ? s.recentAvg - s.prevAvg : null;
  const tiles = [
    {
      label: "練過的句子",
      value: s.practiced,
      unit: "句",
      note: `聽力模式總共練了 ${s.attempts} 次`,
    },
    {
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
      label: "聽懂的最高級數",
      value: s.topLevel ?? "—",
      unit: s.topLevel !== null ? "級" : "",
      note: `正確率 ${UNDERSTOOD}% 以上才算聽懂`,
    },
    {
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
        {tiles.map((t) => (
          <li key={t.label} className="grid content-start rounded-3xl border-2 border-ink bg-white px-5 py-4">
            <span className="text-sm text-ink-soft">{t.label}</span>
            <span className="font-display text-3xl tabular-nums">
              <span className="whitespace-nowrap">
                {t.value} <span className="font-sans text-base">{t.unit}</span>
              </span>
            </span>
            <span className="mt-1 text-xs leading-5 text-ink-soft">{t.note}</span>
          </li>
        ))}
      </ul>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-bold">每天的正確率</h3>
          {s.days.length ? (
            <AccuracyChart days={s.days} goal={UNDERSTOOD} />
          ) : (
            <Empty>用聽力模式練第一句之後，這裡就會開始長出長條。</Empty>
          )}
        </div>

        <div className="card">
          <h3 className="mb-1 font-bold">聽懂的級數</h3>
          <p className="mb-3 text-sm text-ink-soft">
            長條是各級的句子練過幾句（淺綠）、聽懂（{UNDERSTOOD}% 以上）幾句（深綠）；下面另外算你聽懂的句子裡，出現過哪一級的單字和文法。級數依國立國語院的分級。
          </p>
          {s.practiced ? (
            <ul className="grid gap-3">
              {s.levels.map((l) => (
                <li key={l.level} className="grid grid-cols-[3rem_1fr] items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium">{l.level}&nbsp;級</span>
                  {/* 淺色是練過的句子，綠色是其中聽懂的 */}
                  <span
                    className="relative h-3 rounded-full bg-cream"
                    role="img"
                    aria-label={`${l.level} 級：練過 ${l.practiced} 句，聽懂 ${l.understood} 句`}
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-sage-soft"
                      style={{ width: `${(l.practiced / Math.max(1, ...s.levels.map((x) => x.practiced))) * 100}%` }}
                    />
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-sage"
                      style={{ width: `${(l.understood / Math.max(1, ...s.levels.map((x) => x.practiced))) * 100}%` }}
                    />
                  </span>
                  <span className="col-start-2 text-xs text-ink-soft tabular-nums">
                    {l.level}&nbsp;級的句子：聽懂 {l.understood}／練過 {l.practiced}
                    <br />
                    聽懂過的 {l.level}&nbsp;級單字 {l.words} 個、文法 {l.grammar} 個
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>練過的句子會依級數排在這裡。</Empty>
          )}
        </div>

        <div className="card lg:col-span-2">
          <h3 className="mb-3 font-bold">打字速度</h3>
          {s.speeds.length ? (
            <SpeedChart points={s.speeds} grades={TYPING_GRADES} />
          ) : (
            <Empty>在題目頁切到「打字模式」測一次速度，這裡就會開始畫線。</Empty>
          )}
        </div>
      </div>
    </>
  );
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
