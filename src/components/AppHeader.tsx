import Link from "next/link";
import { Mascot } from "@/components/Mascot";

const NAV = [
  { href: "/workshop", label: "句子工坊" },
  { href: "/map", label: "文法地圖" },
  { href: "/me", label: "我的" },
];

export function AppHeader({ current }: { current?: string }) {
  return (
    <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <Link href="/workshop" className="flex items-center gap-2 font-display text-xl no-underline">
        <Mascot />
        慢慢寫
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2" aria-label="主要選單">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={current === n.href ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-medium sm:px-4 ${
              current === n.href ? "bg-peach ring-2 ring-ink" : "hover:bg-peach"
            }`}
          >
            {n.label}
          </Link>
        ))}
        <form action="/auth/signout" method="post">
          <button type="submit" className="rounded-full px-3 py-1.5 text-sm text-ink-soft hover:bg-peach">
            登出
          </button>
        </form>
      </nav>
    </header>
  );
}
