"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

// 圖表一律用品牌色：長條 Aqua Sage，滑鼠指到的那一條換成 Whimsy Rose。
const BAR = "#89B9AD";
const BAR_ACTIVE = "#E78895";

export type GrowthEvent = { date: string; stamp: string; form: string };

type Bucket = { label: string; title: string; forms: string[]; total: number };

/**
 * 每個時段新寫對了幾項文法的長條圖。
 * 依時間：同一分鐘寫對的算一格；依日期：以「天」為一格。只列出有練習的時段，不畫空白的日子。
 */
export function GrowthChart({ events }: { events: GrowthEvent[] }) {
  const [mode, setMode] = useState<"time" | "day">("time");
  const [active, setActive] = useState<number | null>(null);
  // 依實際寬度畫圖，手機上文字才不會跟著縮到看不清楚。
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(560);
  // 量提示框的高度：上方放不下時改放到長條下方，不會衝出卡片
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipH, setTipH] = useState(0);
  useLayoutEffect(() => {
    if (tipRef.current) setTipH(tipRef.current.offsetHeight);
  }, [active, mode]);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(160, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [events.length]);
  if (events.length === 0) {
    return <p className="rounded-2xl bg-cream px-4 py-6 text-center text-ink-soft">寫對第一句之後，這裡就會開始長出長條。</p>;
  }

  const buckets: Bucket[] = [];
  events.forEach((e, i) => {
    // stamp 是「MM-DD HH:mm」（韓國時間）
    // stamp 是「MM-DD HH:mm」（韓國時間），同一分鐘寫對的算一格
    const key = mode === "time" ? e.stamp : e.date.slice(5);
    const title = mode === "time" ? `${e.date} ${e.stamp.slice(6)}` : e.date;
    const last = buckets.at(-1);
    if (last?.label === key) {
      last.forms.push(e.form);
      last.total = i + 1;
    } else buckets.push({ label: key, title, forms: [e.form], total: i + 1 });
  });

  const H = W < 420 ? 190 : 210;
  const pad = { l: 28, r: 8, t: 12, b: mode === "time" ? 42 : 30 };
  const max = Math.max(...buckets.map((b) => b.forms.length));
  const yMax = Math.max(2, max);
  const ticks = yMax <= 4 ? Array.from({ length: yMax + 1 }, (_, i) => i) : [0, Math.round(yMax / 2), yMax];
  const plotW = W - pad.l - pad.r;
  const slot = plotW / buckets.length;
  const barW = Math.min(48, Math.max(6, slot - 8));
  const x = (i: number) => pad.l + slot * i + (slot - barW) / 2;
  const y = (v: number) => pad.t + (1 - v / yMax) * (H - pad.t - pad.b);
  const base = y(0);
  // 標籤太多時跳著標，避免疊字。
  const every = Math.ceil(buckets.length / Math.max(1, Math.floor(plotW / 56)));
  const tip = active !== null ? buckets[active] : null;

  return (
    <figure>
      <div role="group" aria-label="時間單位" className="mb-3 inline-flex rounded-full border-2 border-line bg-cream p-1 text-sm">
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
              setActive(null);
            }}
            className={`min-h-9 rounded-full px-4 transition-colors ${mode === id ? "bg-white font-medium text-ink shadow-sm" : "text-ink-soft"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div ref={boxRef} className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`每個${mode === "time" ? "時間點" : "日子"}新寫對的文法數，目前累積 ${events.length} 項`}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#F0D9C6" />
              <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6E5157">
                {v}
              </text>
            </g>
          ))}
          {buckets.map((b, i) => {
            const top = y(b.forms.length);
            const r = Math.min(4, barW / 2);
            return (
              <g
                key={b.label}
                tabIndex={0}
                role="button"
                aria-label={`${b.title}：新寫對 ${b.forms.length} 項（${b.forms.join("、")}），累積 ${b.total} 項`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(i)}
                className="cursor-pointer outline-none"
              >
                {/* 比長條大的透明感應區 */}
                <rect x={pad.l + slot * i} y={pad.t} width={slot} height={base - pad.t} fill="transparent" />
                <path
                  d={`M${x(i)},${base} V${top + r} q0,${-r} ${r},${-r} H${x(i) + barW - r} q${r},0 ${r},${r} V${base} Z`}
                  fill={active === i ? BAR_ACTIVE : BAR}
                />
                {i % every === 0 && (
                  <text x={x(i) + barW / 2} y={base + 18} textAnchor="middle" fontSize="12" fill="#6E5157">
                    {mode === "time" ? (
                      <>
                        <tspan>{b.label.slice(6)}</tspan>
                        <tspan x={x(i) + barW / 2} dy="15" fontSize="11">
                          {b.label.slice(0, 5)}
                        </tspan>
                      </>
                    ) : (
                      b.label
                    )}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={pad.l} x2={W - pad.r} y1={base} y2={base} stroke="#4A3036" strokeOpacity="0.35" />
        </svg>
        {tip && active !== null && (
          <div
            ref={tipRef}
            role="status"
            className="pointer-events-none absolute z-10 w-max rounded-2xl border-2 border-ink bg-white px-3 py-2 text-sm shadow-md"
            style={tipPosition(x(active) + barW / 2, y(tip.forms.length), W, tipH)}
          >
            <p className="text-xs tabular-nums text-ink-soft">{tip.title}</p>
            <p className="whitespace-nowrap">
              新寫對 <b className="tabular-nums">{tip.forms.length}</b> 項：
            </p>
            {/* 每個文法自成一塊，只在文法之間換行 */}
            <ul className="flex flex-wrap gap-y-0.5">
              {tip.forms.map((f, i) => (
                <li key={i} lang="ko" className="whitespace-nowrap">
                  {f}
                  {i < tip.forms.length - 1 ? "、" : ""}
                </li>
              ))}
            </ul>
            <p className="text-xs tabular-nums text-ink-soft">累積 {tip.total} 項</p>
          </div>
        )}
      </div>
      <figcaption className="mt-1 text-sm text-ink-soft">
        每一條是那{mode === "time" ? "個時間點" : "一天"}新寫對的文法數，滑鼠移到長條上可以看是哪些文法。
      </figcaption>
    </figure>
  );
}

/** 提示框靠近左右邊時改成靠邊對齊，不會超出卡片。 */
function tipPosition(cx: number, barTop: number, width: number, height: number): React.CSSProperties {
  const MAX = 240;
  // 長條上方放不下就放到長條頂端下方
  const below = barTop - 8 - height < 0;
  const base = { top: below ? barTop + 8 : barTop - 8 };
  const dy = below ? "0" : "-100%";
  if (cx < width * 0.3) {
    const left = Math.max(0, cx - 24);
    return { ...base, left, maxWidth: Math.min(MAX, width - left), transform: `translateY(${dy})` };
  }
  if (cx > width * 0.7) {
    const right = Math.max(0, width - cx - 24);
    return { ...base, right, maxWidth: Math.min(MAX, width - right), transform: `translateY(${dy})` };
  }
  // 置中時，寬度不能超過離左右兩邊較近的那一側的兩倍
  return { ...base, left: cx, maxWidth: Math.min(MAX, 2 * Math.min(cx, width - cx)), transform: `translate(-50%, ${dy})` };
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
                  background: BAR,
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
