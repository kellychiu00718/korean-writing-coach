import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { displayForm, getGrammar } from "@/lib/grammar";
import { getLesson } from "@/lib/lessons";
import { createClient } from "@/lib/supabase/server";
import { ReviewDeck, type Card } from "./ReviewDeck";

export default async function ReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/review");

  // 兩個查詢同時送出，不用一個等一個
  const [{ data, error }, { data: attempts }] = await Promise.all([
    supabase
      .from("review_cards")
      .select("id, grammar_id, prompt_index, situation_zh, my_sentence, reference_ko, note_zh, source, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("attempts").select("grammar_id, prompt_index").eq("user_id", user.id),
  ]);

  // 每一題總共寫了幾次；修改次數＝寫的次數減掉第一次
  const writes = new Map<string, number>();
  for (const a of attempts ?? []) {
    const key = `${a.grammar_id}:${a.prompt_index}`;
    writes.set(key, (writes.get(key) ?? 0) + 1);
  }

  const cards: Card[] = (data ?? []).map((r) => {
    const g = getGrammar(r.grammar_id);
    return {
      id: r.id,
      grammarId: r.grammar_id,
      promptIndex: r.prompt_index,
      form: g ? displayForm(g.form) : r.grammar_id,
      level: g?.level ?? 0,
      // 題目文字改過的話用最新版，找不到才用加入時存下的那份
      situation: getLesson(r.grammar_id)?.prompts[r.prompt_index]?.situation_zh ?? r.situation_zh,
      mine: r.my_sentence,
      reference: r.reference_ko,
      note: r.note_zh,
      source: r.source,
      revisions: Math.max(0, (writes.get(`${r.grammar_id}:${r.prompt_index}`) ?? 1) - 1),
    };
  });

  return (
    <>
      <AppHeader current="/review" />
      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-5">
        <section className="py-6 sm:py-10">
          <span className="eyebrow mb-3">複習字卡</span>
          <h1 className="text-3xl font-bold sm:text-4xl">卡住的地方，再複習一次！</h1>
          <p className="mt-2 max-w-2xl text-ink-soft">
            修改了兩次以上的題目會自動放進來，你也可以自己加入想多複習的題目。
          </p>
        </section>

        {error ? (
          <p className="rounded-2xl bg-hint px-4 py-3">複習字卡還沒準備好，請稍後再試。</p>
        ) : cards.length ? (
          <ReviewDeck cards={cards} />
        ) : (
          <p className="card py-10 text-center text-ink-soft">
            目前還沒有字卡。在
            <Link href="/workshop" className="underline underline-offset-4">
              句子工坊
            </Link>
            寫完一題後，就能把它加進來。
          </p>
        )}
      </main>
    </>
  );
}
