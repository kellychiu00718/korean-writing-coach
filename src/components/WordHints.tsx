// 情境下面的單字提示：這課要練的是文法，不要讓沒學過的單字卡住。
// 會放在 <p> 裡，所以只用 span。
export function WordHints({ words, className = "" }: { words?: { ko: string; zh: string }[]; className?: string }) {
  if (!words?.length) return null;
  return (
    <span className={`flex flex-wrap items-center gap-1.5 text-xs text-ink-soft ${className}`}>
      <span>可能用到的單字</span>
      {words.map((w) => (
        <span key={w.ko} className="whitespace-nowrap rounded-full border border-line bg-white px-2 py-0.5">
          <span lang="ko" className="text-ink">
            {w.ko}
          </span>{" "}
          {w.zh}
        </span>
      ))}
    </span>
  );
}
