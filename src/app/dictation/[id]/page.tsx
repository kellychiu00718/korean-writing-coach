import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { GENRE_LABEL, getItem, nextItemId } from "@/lib/dictation";
import { createClient } from "@/lib/supabase/server";
import { DictationPlayer, type Mode } from "./DictationPlayer";

export default async function DictationClipPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const mode: Mode = (await searchParams).mode === "type" ? "type" : "listen";
  const item = getItem(id);
  if (!item) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/dictation/${id}`);

  const { data } = await supabase
    .from("dictation_attempts")
    .select("accuracy")
    .eq("user_id", user.id)
    .eq("clip_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  const next = nextItemId(item);

  return (
    <>
      <AppHeader current="/dictation" />
      <main className="mx-auto max-w-3xl px-4 pb-20 sm:px-5">
        <Link href="/dictation" className="text-sm text-ink-soft hover:underline">
          ← 回到聽打練習
        </Link>
        <div className="mt-4 mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-peach px-2.5 py-0.5 font-medium">
            {item.kind === "clip" ? GENRE_LABEL[item.genre] : "語音朗讀"}
          </span>
          <span className="text-ink-soft">{item.level}&nbsp;級</span>
        </div>
        {/* 用連結切換模式，不需要 JavaScript；重新整理也會停在同一個模式 */}
        <nav aria-label="練習模式" className="mb-4 inline-flex rounded-full border-2 border-ink bg-white p-1 text-sm">
          {(
            [
              ["listen", "練習模式"],
              ["type", "打字模式"],
            ] as const
          ).map(([m, label]) => (
            <Link
              key={m}
              href={m === "type" ? `/dictation/${id}?mode=type` : `/dictation/${id}`}
              scroll={false}
              replace
              aria-current={mode === m ? "page" : undefined}
              className={`inline-flex min-h-9 items-center rounded-full px-3.5 whitespace-nowrap transition-colors ${
                mode === m ? "bg-sage-soft font-medium text-sage-ink" : "text-ink-soft hover:bg-cream"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <DictationPlayer
          key={mode}
          item={item}
          userId={user.id}
          nextId={next}
          lastAccuracy={data?.[0]?.accuracy ?? null}
          mode={mode}
        />
      </main>
    </>
  );
}
