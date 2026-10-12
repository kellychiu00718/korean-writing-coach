import Link from "next/link";
import type { Hardest } from "@/lib/dictation";

/** 卡片需要的欄位（伺服器挑好再傳，不含台詞本身） */
export type CardData = {
  id: string;
  genre: string;
  level: number;
  hardest: Hardest[];
};

/**
 * 聽打句子的卡片：不放影片標題（可能透露台詞），改放這句最難的單字或文法和它的級數。
 * tag：推薦區用的綠色標籤（推薦理由）。
 */
export function ClipCard({ clip, acc, tag }: { clip: CardData; acc?: number; tag?: string }) {
  const hardest = clip.hardest.slice(0, 2);
  return (
    <Link
      href={`/dictation/${clip.id}`}
      className="flex h-full flex-col gap-2 rounded-3xl border-2 border-ink bg-white p-4 transition-transform hover:-translate-y-0.5"
    >
      <span className="flex flex-wrap items-center gap-1.5 text-xs">
        {tag && <span className="rounded-full bg-sage-soft px-2 py-0.5 font-medium text-sage-ink">{tag}</span>}
        <span className="rounded-full bg-peach px-2 py-0.5 font-medium">{clip.genre}</span>
        <span className="text-ink-soft">{clip.level}&nbsp;級</span>
        {acc !== undefined && !tag && (
          <span className="ml-auto rounded-full bg-sage-soft px-2 py-0.5 tabular-nums text-sage-ink">上次 {acc}%</span>
        )}
      </span>
      {hardest.length > 0 ? (
        <span className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-ink-soft">最難的：</span>
          {hardest.map((h) => (
            <span key={`${h.type}${h.text}`} className="rounded-full bg-cream px-2 py-0.5">
              <span lang="ko" className="ko-inline">
                {h.text}
              </span>
              <span className="text-xs text-ink-soft">
                （{h.level}&nbsp;級{h.type}）
              </span>
            </span>
          ))}
        </span>
      ) : (
        <span className="text-sm text-ink-soft">沒有 2 級以上的單字和文法</span>
      )}
    </Link>
  );
}
