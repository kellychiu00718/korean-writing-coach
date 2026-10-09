"use client";

import { useState } from "react";

// 圖表用的綠：比品牌 sage 飽和一點，在白底上才看得清楚（已通過對比與彩度檢查）。
const CHART_GREEN = "#2F9A7F";

/** 「會用」文法數的累積成長曲線，滑鼠移上去顯示當天數字。 */
export function GrowthChart({ points }: { points: { date: string; total: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) {
    return <p className="rounded-2xl bg-cream px-4 py-6 text-center text-ink-soft">寫對第一句之後，這裡就會開始長出曲線。</p>;
  }

  const W = 560;
  const H = 200;
  const pad = { l: 36, r: 16, t: 16, b: 28 };
  const series = points.length === 1 ? [{ date: points[0].date, total: 0 }, points[0]] : points;
  const max = Math.max(...series.map((p) => p.total));
  const yMax = Math.max(4, Math.ceil(max / 4) * 4);
  const x = (i: number) => pad.l + (i / (series.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / yMax) * (H - pad.t - pad.b);
  const path = series.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.total)}`).join(" ");
  const last = series.length - 1;
  const active = hover ?? last;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label={`會用的文法從 ${series[0].total} 項成長到 ${series[last].total} 項`}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (series.length - 1));
          setHover(Math.min(last, Math.max(0, i)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {[0, yMax / 2, yMax].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#F0D9C6" strokeWidth="1" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6E5157">
              {v}
            </text>
          </g>
        ))}
        <text x={pad.l} y={H - 8} fontSize="11" fill="#6E5157">
          {series[0].date.slice(5)}
        </text>
        <text x={W - pad.r} y={H - 8} textAnchor="end" fontSize="11" fill="#6E5157">
          {series[last].date.slice(5)}
        </text>
        <path d={path} fill="none" stroke={CHART_GREEN} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <line x1={x(active)} x2={x(active)} y1={pad.t} y2={H - pad.b} stroke="#4A3036" strokeOpacity="0.2" />
        <circle cx={x(active)} cy={y(series[active].total)} r="5" fill={CHART_GREEN} stroke="#fff" strokeWidth="2" />
      </svg>
      <figcaption className="mt-1 text-sm text-ink-soft" aria-live="polite">
        {series[active].date}：會用 <b className="text-ink">{series[active].total}</b> 項文法
      </figcaption>
    </figure>
  );
}

/** 水平長條清單：每條都直接標數字，不靠顏色辨識。 */
export function BarList({ rows, unit }: { rows: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="grid gap-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm" title={`${r.label}：${r.value} ${unit}`}>
          <span className="truncate">{r.label}</span>
          <span className="h-3 rounded-full bg-cream">
            <span
              className="block h-3 rounded-full"
              style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? 6 : 0, background: CHART_GREEN }}
            />
          </span>
          <span className="tabular-nums text-ink-soft">
            {r.value} {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}
