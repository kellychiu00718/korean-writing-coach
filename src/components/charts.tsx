"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

// 圖表用的綠：比品牌 sage 飽和一點，在白底上才看得清楚（已通過對比與彩度檢查）。
const CHART_GREEN = "#2F9A7F";

export type GrowthEvent = { date: string; stamp: string; form: string };

type Point = { label: string; caption: string; total: number };

/**
 * 「自己寫出來且用對」文法數的累積曲線。
 * 依時間：每寫對一項文法就往上一階，標出幾點幾分；依日期：每天結算一次。
 */
export function GrowthChart({ events }: { events: GrowthEvent[] }) {
  const [mode, setMode] = useState<"time" | "day">("time");
  const [hover, setHover] = useState<number | null>(null);
  // 依實際寬度畫圖，手機上文字才不會跟著縮到看不清楚。
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(560);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setW(Math.max(280, Math.round(entry.contentRect.width))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [events.length]);
  if (events.length === 0) {
    return (
      <p className="rounded-2xl bg-cream px-4 py-6 text-center text-ink-soft">
        寫對第一句之後，這裡就會開始長出曲線。
      </p>
    );
  }

  let points: Point[];
  if (mode === "time") {
    points = [
      { label: "開始", caption: "還沒開始", total: 0 },
      ...events.map((e, i) => ({
        label: e.stamp,
        caption: `${e.stamp}　寫對 ${e.form}`,
        total: i + 1,
      })),
    ];
  } else {
    const byDay: Point[] = [];
    events.forEach((e, i) => {
      const last = byDay.at(-1);
      if (last?.label === e.date.slice(5)) {
        last.total = i + 1;
        last.caption = `${e.date}　這天結束時`;
      } else
        byDay.push({
          label: e.date.slice(5),
          caption: `${e.date}　這天結束時`,
          total: i + 1,
        });
    });
    points =
      byDay.length === 1
        ? [{ label: "開始", caption: "還沒開始", total: 0 }, ...byDay]
        : byDay;
  }

  const H = W < 420 ? 190 : 210;
  const pad = { l: 36, r: 20, t: 16, b: 30 };
  const max = Math.max(...points.map((p) => p.total));
  const yMax = Math.max(4, Math.ceil(max / 4) * 4);
  const last = points.length - 1;
  const x = (i: number) => pad.l + (i / last) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / yMax) * (H - pad.t - pad.b);
  // 依時間用階梯線（每一階就是寫對一項），依日期用折線。
  const path =
    mode === "time"
      ? points
          .map((p, i) =>
            i ? `H${x(i)} V${y(p.total)}` : `M${x(0)},${y(p.total)}`,
          )
          .join(" ")
      : points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.total)}`).join(" ");
  const active = Math.min(hover ?? last, last);
  // x 軸只標頭、尾，點太多時中間再標一個，避免字疊在一起。
  const ticks = [
    ...new Set([0, last > 3 ? Math.round(last / 2) : -1, last]),
  ].filter((i) => i >= 0);

  return (
    <figure>
      <div
        role="group"
        aria-label="時間單位"
        className="mb-3 inline-flex rounded-full border-2 border-line bg-cream p-1 text-sm"
      >
        {(
          [
            ["time", "依時間"],
            ["day", "依日期"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => {
              setMode(id);
              setHover(null);
            }}
            className={`min-h-9 rounded-full px-4 transition-colors ${mode === id ? "bg-white font-medium text-ink shadow-sm" : "text-ink-soft"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div ref={boxRef}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none"
          role="img"
          aria-label={`自己寫對的文法從 0 項累積到 ${max} 項`}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * W;
            const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * last);
            setHover(Math.min(last, Math.max(0, i)));
          }}
          onPointerLeave={() => setHover(null)}
        >
          {[0, yMax / 2, yMax].map((v) => (
            <g key={v}>
              <line
                x1={pad.l}
                x2={W - pad.r}
                y1={y(v)}
                y2={y(v)}
                stroke="#F0D9C6"
              />
              <text
                x={pad.l - 8}
                y={y(v) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#6E5157"
              >
                {v}
              </text>
            </g>
          ))}
          {ticks.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
              fontSize="11"
              fill="#6E5157"
            >
              {points[i].label}
            </text>
          ))}
          <path
            d={path}
            fill="none"
            stroke={CHART_GREEN}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {mode === "time" &&
            points
              .slice(1)
              .map((p, i) => (
                <circle
                  key={i}
                  cx={x(i + 1)}
                  cy={y(p.total)}
                  r="3"
                  fill={CHART_GREEN}
                />
              ))}
          <line
            x1={x(active)}
            x2={x(active)}
            y1={pad.t}
            y2={H - pad.b}
            stroke="#4A3036"
            strokeOpacity="0.2"
          />
          <circle
            cx={x(active)}
            cy={y(points[active].total)}
            r="5"
            fill={CHART_GREEN}
            stroke="#fff"
            strokeWidth="2"
          />
        </svg>
      </div>
      <figcaption
        className="mt-1 text-sm tabular-nums text-ink-soft"
        aria-live="polite"
      >
        <span>{points[active].caption}</span>，累積{" "}
        <b className="text-ink">{points[active].total}</b> 項文法
      </figcaption>
    </figure>
  );
}

export type BarDetail = {
  form: string;
  grammarId: string;
  text: string;
  note?: string;
  stamp: string;
};

/**
 * 水平長條清單：每條都直接標數字，不靠顏色辨識。
 * 有細項的列可以點開，看是哪些文法、哪些句子。
 */
export function BarList({
  rows,
  unit,
}: {
  rows: { label: string; value: number; items?: BarDetail[] }[];
  unit: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const baseId = useId();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="grid gap-1">
      {rows.map((r, idx) => {
        const expandable = Boolean(r.items?.length);
        const isOpen = open === r.label;
        const panelId = `${baseId}-${idx}`;
        const bar = (
          <>
            <span className="truncate text-left">{r.label}</span>
            <span className="h-3 rounded-full bg-cream">
              <span
                className="block h-3 rounded-full"
                style={{
                  width: `${(r.value / max) * 100}%`,
                  minWidth: r.value ? 6 : 0,
                  background: CHART_GREEN,
                }}
              />
            </span>
            <span className="flex items-center gap-1 tabular-nums text-ink-soft">
              {r.value} {unit}
              {expandable && (
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                >
                  <path
                    d="M4 6l4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          </>
        );
        const rowClass =
          "grid min-h-11 w-full grid-cols-[7.5rem_1fr_auto] items-center gap-3 rounded-xl px-2 text-sm";
        return (
          <li key={r.label}>
            {expandable ? (
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : r.label)}
                className={`${rowClass} cursor-pointer hover:bg-cream`}
              >
                {bar}
              </button>
            ) : (
              <div className={rowClass}>{bar}</div>
            )}
            {expandable && isOpen && (
              <ul
                id={panelId}
                className="animate-pop mt-1 mb-2 grid gap-2 sm:grid-cols-2"
              >
                {r.items!.map((it, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border-2 border-line bg-white px-3.5 py-2.5 text-sm"
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <Link
                        href={`/workshop/${it.grammarId}`}
                        lang="ko"
                        className="font-medium underline underline-offset-4"
                      >
                        {it.form}
                      </Link>
                      <span className="text-xs tabular-nums text-ink-soft">
                        {it.stamp}
                      </span>
                    </div>
                    <p lang="ko" className="text-base">
                      {it.text}
                    </p>
                    {it.note && (
                      <p lang="ko" className="mt-0.5 text-xs text-ink-soft">
                        {it.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
