import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { clips, GENRE_LABEL } from "@/lib/dictation";
import { createClient } from "@/lib/supabase/server";

export default async function DictationPage() {
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
            從新聞、戲劇、音樂和綜藝裡挑出一句，聽完把它打出來。
            <br />
            可以重聽、放慢，打完再對答案，看看自己聽到了多少。
          </p>
        </section>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((c) => {
            const acc = last.get(c.id);
            return (
              <li key={c.id}>
                <Link
                  href={`/dictation/${c.id}`}
                  className="flex h-full flex-col gap-3 rounded-3xl border-2 border-ink bg-white p-4 transition-transform hover:-translate-y-0.5"
                >
                  {/* YouTube 規定縮圖至少 120×70；這裡是 16:9、寬度撐滿卡片 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${c.videoId}/hqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-full min-w-[120px] rounded-2xl object-cover outline outline-1 -outline-offset-1 outline-black/10"
                  />
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
                  <span className="line-clamp-2 text-sm text-ink-soft">{c.source.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
