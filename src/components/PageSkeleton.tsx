import { AppHeader } from "@/components/AppHeader";

/** 換頁時伺服器還在準備資料，先馬上顯示頁面骨架，讓人知道點擊有反應。 */
export function PageSkeleton({ current }: { current?: string }) {
  return (
    <>
      <AppHeader current={current} />
      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-5" aria-busy="true">
        <p role="status" className="sr-only">
          載入中…
        </p>
        <div className="grid gap-3 py-6 motion-safe:animate-pulse sm:py-10" aria-hidden="true">
          <div className="h-7 w-24 rounded-full bg-peach" />
          <div className="h-10 w-3/4 max-w-md rounded-2xl bg-peach" />
          <div className="h-5 w-full max-w-xl rounded-full bg-peach/70" />
        </div>
        <div className="grid gap-4 motion-safe:animate-pulse md:grid-cols-2" aria-hidden="true">
          <div className="h-44 rounded-3xl border-2 border-line bg-white" />
          <div className="h-44 rounded-3xl border-2 border-line bg-white" />
        </div>
      </main>
    </>
  );
}
