import { notFound } from "next/navigation";
import { GENRE_LABEL, pendingClips } from "@/lib/dictation";
import { formatTime } from "@/lib/dictation-compare";

export const metadata = { title: "候選片段審核｜慢慢寫" };

/** 只在本機開發時看得到的審核頁：逐題聽合成語音、對照原影片，確認後再開放到網站上。 */
export default function PendingClipsPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const genres = ["drama", "music", "news", "variety"] as const;
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-5">
      <h1 className="text-2xl font-bold">候選片段審核（共 {pendingClips.length}&nbsp;題）</h1>
      <p className="mt-1 mb-6 text-sm text-ink-soft">
        這一頁只有在你的電腦上跑網站時看得到，上線後不會出現。要修改或刪除的題目，把編號告訴 Claude 就好。
      </p>
      {genres.map((g) => {
        const list = pendingClips.filter((c) => c.genre === g);
        if (!list.length) return null;
        return (
          <section key={g} className="mb-8">
            <h2 className="mb-3 text-xl font-bold">
              {GENRE_LABEL[g]}（{list.length}&nbsp;題）
            </h2>
            <ol className="grid gap-3">
              {list.map((c) => (
                <li key={c.id} className="rounded-2xl border-2 border-line bg-white px-4 py-3">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                    <code className="rounded bg-cream px-1.5">{c.id}</code>
                    <span className="rounded-full bg-peach px-2 py-0.5">{c.level}&nbsp;級</span>
                    {c.hardest.map((h) => (
                      <span key={h.text} className="text-ink-soft">
                        <span lang="ko">{h.text}</span>（{h.type}）
                      </span>
                    ))}
                  </div>
                  <p lang="ko" className="text-lg">
                    {c.text_ko}
                  </p>
                  <p className="text-sm text-ink-soft">{c.text_zh}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    {c.audio && <audio controls preload="none" src={c.audio.file} className="h-9 max-w-full" />}
                    <a
                      href={c.start !== undefined ? `${c.source.url}${c.source.url.includes("?") ? "&" : "?"}t=${c.start}s` : c.source.url}
                      target="_blank"
                      rel="noopener"
                      className="underline underline-offset-4"
                    >
                      {c.start !== undefined ? `原影片 ${formatTime(c.start)}` : "原新聞"}
                    </a>
                    <span className="text-xs text-ink-soft">
                      {c.source.channel}・{c.source.title}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </main>
  );
}
