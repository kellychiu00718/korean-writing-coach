"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

const ITEMS = [
  { href: "/me", label: "我的" },
  { href: "/review", label: "複習字卡" },
];

/**
 * 「我的」下拉選單：滑鼠移上去就打開，手機和鍵盤用點的。
 * 選單外層有 overflow-x-auto（窄螢幕可以左右滑），一般的絕對定位會被裁掉，所以選單用 fixed 定位在按鈕下方。
 */
export function MyMenu({ current }: { current?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();
  const active = ITEMS.some((i) => i.href === current);

  function place() {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    // 選單寬 160px；靠右對齊按鈕，但不超出畫面左右邊緣
    const left = Math.min(Math.max(8, r.right - 160), window.innerWidth - 168);
    setPos({ top: r.bottom + 6, left });
  }

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    place();
    setOpen(true);
  }
  function hideSoon() {
    // 留一點時間讓滑鼠從按鈕移到選單上
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onMove = () => setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return (
    <div
      className="shrink-0"
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
            requestAnimationFrame(() => menuRef.current?.querySelector("a")?.focus());
          }
        }}
        className={`inline-flex min-h-11 items-center gap-0.5 rounded-full px-[5px] text-xs min-[360px]:px-2 min-[360px]:text-[13px] font-medium whitespace-nowrap min-[380px]:px-2.5 min-[380px]:text-sm sm:px-4 ${
          active ? "bg-peach ring-2 ring-ink" : "hover:bg-peach"
        }`}
      >
        我的
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        ref={menuRef}
        id={menuId}
        hidden={!open}
        style={{ top: pos.top, left: pos.left }}
        className="animate-pop fixed z-50 grid w-40 gap-1 rounded-2xl border-2 border-ink bg-white p-1.5 shadow-[0_4px_0_var(--color-ink)]"
      >
        {ITEMS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={current === i.href ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-medium ${
              current === i.href ? "bg-peach" : "hover:bg-cream"
            }`}
          >
            {i.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
