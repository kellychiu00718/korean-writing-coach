"use client";

import { useId, useRef, useState } from "react";

export type ProgressTab = "workshop" | "dictation";

const TABS: { id: ProgressTab; label: string }[] = [
  { id: "workshop", label: "句子工坊" },
  { id: "dictation", label: "聽打練習" },
];

/**
 * 「我的進步」分成句子工坊和聽打練習兩個分頁，一次只看一種，畫面比較清爽。
 * 選到哪一頁記在網址（?progress=dictation），重新整理或分享連結都會停在同一頁。
 */
export function ProgressTabs({
  initial,
  workshop,
  dictation,
}: {
  initial: ProgressTab;
  workshop: React.ReactNode;
  dictation: React.ReactNode;
}) {
  const [tab, setTab] = useState<ProgressTab>(initial);
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(id: ProgressTab) {
    setTab(id);
    const url = new URL(window.location.href);
    if (id === "workshop") url.searchParams.delete("progress");
    else url.searchParams.set("progress", id);
    window.history.replaceState(null, "", url);
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="進步紀錄的種類"
        className="mb-5 inline-flex rounded-full border-2 border-ink bg-white p-1 text-sm"
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${baseId}-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => select(t.id)}
            onKeyDown={(e) => {
              // 左右鍵切換分頁（WAI-ARIA tabs 的做法）
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const next = (i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
              select(TABS[next].id);
              refs.current[next]?.focus();
            }}
            className={`inline-flex min-h-10 items-center rounded-full px-4 whitespace-nowrap transition-colors ${
              tab === t.id ? "bg-sage-soft font-medium text-sage-ink" : "text-ink-soft hover:bg-cream"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {TABS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${baseId}-panel-${t.id}`}
          aria-labelledby={`${baseId}-tab-${t.id}`}
          hidden={tab !== t.id}
        >
          {t.id === "workshop" ? workshop : dictation}
        </div>
      ))}
    </>
  );
}
