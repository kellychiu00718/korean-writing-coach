"use client";

import { useState } from "react";

/** 在頁面裡分頁（資料已經在畫面上，不用重新載入）：回傳這一頁的項目和頁碼元件需要的值 */
export function usePaged<T>(items: T[], perPage: number) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(page, pages);
  return {
    items: items.slice((current - 1) * perPage, current * perPage),
    page: current,
    pages,
    setPage,
  };
}

/** 頁碼：上一頁、頁碼（太多時中間省略）、下一頁；跟聽打練習列表的頁碼長得一樣 */
export function Pager({ page, pages, onChange, label = "分頁" }: { page: number; pages: number; onChange: (n: number) => void; label?: string }) {
  if (pages <= 1) return null;
  const nums = [...new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
  const btn = "inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border-2 px-3 text-sm tabular-nums";
  return (
    <nav aria-label={label} className="mt-6 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <button type="button" onClick={() => onChange(page - 1)} className={`${btn} border-line bg-white hover:bg-cream`}>
          上一頁
        </button>
      )}
      {nums.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && n - nums[i - 1] > 1 && (
            <span className="px-1 text-ink-soft" aria-hidden="true">
              …
            </span>
          )}
          <button
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            aria-label={`第 ${n} 頁`}
            className={`${btn} ${n === page ? "border-sage-ink bg-sage-soft font-medium text-sage-ink" : "border-line bg-white hover:bg-cream"}`}
          >
            {n}
          </button>
        </span>
      ))}
      {page < pages && (
        <button type="button" onClick={() => onChange(page + 1)} className={`${btn} border-line bg-white hover:bg-cream`}>
          下一頁
        </button>
      )}
    </nav>
  );
}
