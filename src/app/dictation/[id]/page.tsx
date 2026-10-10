import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { GENRE_LABEL, getItem, nextItemId } from "@/lib/dictation";
import { createClient } from "@/lib/supabase/server";
import { DictationPlayer } from "./DictationPlayer";

export default async function DictationClipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
            {item.kind === "video" ? GENRE_LABEL[item.genre] : "語音朗讀"}
          </span>
          <span className="text-ink-soft">{item.level}&nbsp;級</span>
        </div>
        <DictationPlayer item={item} userId={user.id} nextId={next} lastAccuracy={data?.[0]?.accuracy ?? null} />
      </main>
    </>
  );
}
