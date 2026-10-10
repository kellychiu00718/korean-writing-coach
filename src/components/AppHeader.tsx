import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MyMenu } from "@/components/MyMenu";
import { SignOutButton } from "@/components/SignOutButton";

const NAV = [
  { href: "/workshop", label: "句子工坊" },
  { href: "/dictation", label: "聽打練習" },
  { href: "/map", label: "文法地圖" },
];

export function AppHeader({ current }: { current?: string }) {
  return (
    <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <Logo href="/workshop" />
      <nav className="flex w-full items-center justify-between overflow-x-auto p-1 sm:w-auto sm:justify-start sm:gap-2" aria-label="主要選單">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={current === n.href ? "page" : undefined}
            className={`inline-flex min-h-11 items-center shrink-0 rounded-full px-[5px] text-xs min-[360px]:px-2 min-[360px]:text-[13px] font-medium whitespace-nowrap min-[380px]:px-2.5 min-[380px]:text-sm sm:px-4 ${
              current === n.href ? "bg-peach ring-2 ring-ink" : "hover:bg-peach"
            }`}
          >
            {n.label}
          </Link>
        ))}
        <MyMenu current={current} />
        <SignOutButton />
      </nav>
    </header>
  );
}
