import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { clips, GENRE_LABEL, voiceItems, type Genre } from "@/lib/dictation";
import { createClient } from "@/lib/supabase/server";

const GENRES: Genre[] = ["drama", "music", "news", "variety"];

export default async function DictationPage({ searchParams }: { searchParams: Promise<{ genre?: string }> }) {
  const { genre: g } = await searchParams;
  const genre = GENRES.find((x) => x === g) ?? null;
  const shown = genre ? clips.filter((c) => c.genre === genre) : clips;
  // 同一部影片或同一篇報導有好幾句時，卡片上標「第 N 句」區分
  const order = new Map<string, string>();
  const seen = new Map<string, number>();
  const total = new Map<string, number>();
  for (const c of clips) total.set(c.source.url, (total.get(c.source.url) ?? 0) + 1);
  for (const c of clips) {
    const n = (seen.get(c.source.url) ?? 0) + 1;
    seen.set(c.source.url, n);
    if ((total.get(c.source.url) ?? 0) > 1) order.set(c.id, `第\u00a0${n}\u00a0句`);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dictation");

  // 每個片段最近一次的正確率（新的在前，第一筆就是最近一次）
  const { data } = await supabase
    .from("dictation_attempts")
    .select("clip_id, accuracy")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);
  const last = new Map<string, number>();
  for (const r of data ?? []) if (!last.has(r.clip_id)) last.set(r.clip_id, r.accuracy);

  return (
    <>
      <AppHeader current="/dictation" />
      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-5">
        <section className="py-6 sm:py-10">
          <span className="eyebrow mb-3">聽打練習</span>
          <h1 className="text-3xl font-bold sm:text-4xl">聽一句，打一句</h1>
          <p className="mt-2 max-w-2xl text-ink-soft">
            從戲劇、音樂、新聞、綜藝的台詞，或是課程例句裡挑一句，聽完把它打出來。
            <br />
            可以重聽、放慢，打完再對答案，看看自己聽到了多少。
          </p>
        </section>

        <h2 className="mb-1 text-xl font-bold">戲劇・音樂・新聞・綜藝的台詞</h2>
        <p className="mb-4 text-sm text-ink-soft">
          台詞出自 YouTube 上的影片，用合成語音唸給你聽；對完答案可以去原影片聽韓國人實際怎麼說。
        </p>
        {/* 用網址參數篩選，不需要 JavaScript；選了之後重新整理也會保留 */}
        <nav aria-label="依類型篩選" className="mb-4 flex flex-wrap gap-2">
          {[null, ...GENRES].map((x) => {
            const on = x === genre;
            const count = x ? clips.filter((c) => c.genre === x).length : clips.length;
            return (
              <Link
                key={x ?? "all"}
                href={x ? `/dictation?genre=${x}` : "/dictation"}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-9 items-center rounded-full border-2 px-3 text-sm transition-colors ${
                  on ? "border-sage-ink bg-sage-soft font-medium text-sage-ink" : "border-line bg-white text-ink-soft hover:bg-cream"
                }`}
              >
                {x ? GENRE_LABEL[x] : "全部"}
                <span className="ml-1 tabular-nums opacity-70">{count}</span>
              </Link>
            );
          })}
        </nav>
        <ul className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => {
            const acc = last.get(c.id);
            return (
              <li key={c.id}>
                <Link
                  href={`/dictation/${c.id}`}
                  className="flex h-full flex-col gap-2 rounded-3xl border-2 border-ink bg-white p-4 transition-transform hover:-translate-y-0.5"
                >
                  <span className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="rounded-full bg-peach px-2 py-0.5 font-medium">{GENRE_LABEL[c.genre]}</span>
                    <span className="text-ink-soft">
                      {c.level}&nbsp;級・{c.source.channel}
                    </span>
                    {acc !== undefined && (
                      <span className="ml-auto rounded-full bg-sage-soft px-2 py-0.5 tabular-nums text-sage-ink">
                        上次 {acc}%
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-sm">{c.source.title}</span>
                  {order.has(c.id) && <span className="text-xs text-ink-soft">{order.get(c.id)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        <h2 className="mb-1 text-xl font-bold">課程例句</h2>
        <p className="mb-4 text-sm text-ink-soft">句子工坊裡的例句，用合成語音唸給你聽。</p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {voiceItems.map((v, i) => {
            const acc = last.get(v.id);
            return (
              <li key={v.id}>
                <Link
                  href={`/dictation/${v.id}`}
                  className="flex min-h-14 items-center gap-2 rounded-2xl border-2 border-ink bg-white px-4 py-2 text-sm transition-transform hover:-translate-y-0.5"
                >
                  <span aria-hidden="true">🔊</span>
                  <span className="font-medium">第&nbsp;{i + 1}&nbsp;句</span>
                  <span className="text-ink-soft">{v.level}&nbsp;級</span>
                  {acc !== undefined && (
                    <span className="ml-auto rounded-full bg-sage-soft px-2 py-0.5 tabular-nums text-sage-ink">
                      上次 {acc}%
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
