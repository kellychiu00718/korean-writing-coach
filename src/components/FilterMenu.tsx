"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

/** 選項：有 href 就是連結（網址參數篩選），沒有就是按鈕（在頁面裡切換，用 onSelect） */
export type FilterOption = {
  key: string;
  label: string;
  count?: number;
  on: boolean;
  href?: string;
  onSelect?: () => void;
};

/**
 * 篩選的下拉按鈕：滑鼠移上去就展開，手機和鍵盤用點的。
 * 按鈕上顯示目前選的值；選了「全部」以外的選項時用綠色標示（neutral 的選單例如排列方式不變色）。
 */
export function FilterMenu({ label, options, neutral = false }: { label: string; options: FilterOption[]; neutral?: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  // 選單超出畫面右邊時往左移（手機上最右邊的按鈕）
  const [shift, setShift] = useState(0);
  const current = options.find((o) => o.on);
  const active = !neutral && current && current.key !== "all";

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function hideSoon() {
    // 留一點時間讓滑鼠從按鈕移到選單上
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return setShift(0);
    const r = menuRef.current?.getBoundingClientRect();
    if (r) setShift(Math.min(0, window.innerWidth - 12 - r.right));
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && show()}
      onPointerLeave={(e) => e.pointerType === "mouse" && hideSoon()}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="true"
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            show();
            requestAnimationFrame(() => document.getElementById(menuId)?.querySelector<HTMLElement>("a, button")?.focus());
          }
        }}
        className={`inline-flex min-h-11 items-center gap-1 rounded-full border-2 px-4 text-sm font-medium whitespace-nowrap transition-colors ${
          active ? "border-sage-ink bg-sage-soft text-sage-ink" : "border-ink bg-white hover:bg-cream"
        }`}
      >
        <span>
          {label}
          {(active || neutral) && current && <span className="font-normal">：{current.label}</span>}
        </span>
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {/* pt-1.5 讓滑鼠從按鈕移到選單時不會離開這個區塊 */}
      <div id={menuId} hidden={!open} className="absolute top-full left-0 z-30 pt-1.5" style={{ transform: `translateX(${shift}px)` }}>
        <div ref={menuRef} className="animate-pop grid w-max min-w-44 gap-1 rounded-2xl border-2 border-ink bg-white p-1.5 shadow-[0_4px_0_var(--color-ink)]">
          {options.map((o) => {
            const cls = `flex min-h-11 w-full items-center justify-between gap-4 rounded-xl px-3 text-left text-sm ${
              o.on ? "bg-sage-soft font-medium text-sage-ink" : "hover:bg-cream"
            }`;
            const body = (
              <>
                {o.label}
                {o.count !== undefined && <span className="tabular-nums text-ink-soft">{o.count}</span>}
              </>
            );
            return o.href ? (
              <Link
                key={o.key}
                href={o.href}
                scroll={false}
                aria-current={o.on ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cls}
              >
                {body}
              </Link>
            ) : (
              <button
                key={o.key}
                type="button"
                aria-pressed={o.on}
                onClick={() => {
                  o.onSelect?.();
                  setOpen(false);
                }}
                className={cls}
              >
                {body}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
