import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import type { RevealedFeedback } from "@/lib/coach";
import { CATEGORY_LABEL, displayForm, getGrammar } from "@/lib/grammar";
import { getLesson } from "@/lib/lessons";
import { getProfile } from "@/lib/profile";
import { DAILY_LIMIT, usedToday } from "@/lib/limits";
import { promote } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";
import { CoachPanel, type RoundEntry } from "./CoachPanel";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { id } = await params;
  const { p } = await searchParams;
  const item = getGrammar(id);
  const lesson = getLesson(id);
  if (!item || !lesson) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/workshop/${id}`);

  // 打開這課＝看過本題文法；例句裡出現的其他文法也算看過。
  const exampleIds = [...new Set(lesson.examples.flatMap((ex) => ex.grammar ?? []))];
  const { interests } = getProfile(user);
  // 從「今天的練習」點進來會帶 ?p= 指定情境；否則優先選符合興趣的情境
  const requested = Number(p);
  const initialPrompt =
    Number.isInteger(requested) && requested >= 0 && requested < lesson.prompts.length
      ? requested
      : Math.max(0, lesson.prompts.findIndex((pr) => interests.includes(pr.scene)));

  // 三件事互不相關，同時送出：標記看過、讀還沒結束的那一輪（重新整理也能接著寫）、讀這課的字卡。
  const [, { data }, { data: cardRows }, used] = await Promise.all([
    promote(supabase, user.id, [id, ...exampleIds].map((g) => ({ grammarId: g, state: "seen" as const }))).catch(() => []),
    supabase
      .from("attempts")
      .select("prompt_index, sentence, attempt, feedback")
      .eq("user_id", user.id)
      .eq("grammar_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("review_cards").select("prompt_index").eq("user_id", user.id).eq("grammar_id", id),
    usedToday(supabase),
  ]);
  const remaining = used === null ? null : Math.max(0, DAILY_LIMIT - used);
  // 預先寫好的參考寫法不送到瀏覽器，次數用完時才由 /api/reference 給
  const prompts = lesson.prompts.map(({ scene, situation_zh }) => ({ scene, situation_zh }));
  const cardPrompts = (cardRows ?? []).map((r) => r.prompt_index as number);

  const openRounds: Record<number, RoundEntry[]> = {};
  for (let i = 0; i < lesson.prompts.length; i++) {
    const rows = (data ?? []).filter((r) => r.prompt_index === i);
    const last = rows[0];
    if (last && (last.feedback as RevealedFeedback).level < 3) {
      openRounds[i] = rows
        .slice(0, last.attempt)
        .reverse()
        .map((r) => ({ attempt: r.attempt, sentence: r.sentence, feedback: r.feedback as RevealedFeedback }));
    }
  }

  return (
    <>
      <AppHeader current="/workshop" />
      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-5">
        <Link href="/workshop" className="text-sm text-ink-soft hover:underline">
          ← 回到句子工坊
        </Link>
        <div className="mt-4 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <section className="card" aria-labelledby="lesson-title">
            <span className="eyebrow mb-3">
              {item.level} 級・{CATEGORY_LABEL[item.category] ?? item.category}
            </span>
            <h1 id="lesson-title" lang="ko" className="text-3xl">
              {displayForm(item.form)}
            </h1>
            <p className="mb-4 text-lg font-medium">{lesson.title_zh}</p>
            <p className="mb-4">{lesson.core_zh}</p>
            <p className="mb-4 rounded-2xl bg-peach px-4 py-3 text-sm">
              <b>接法：</b>
              <span lang="ko" className="ko-inline">{lesson.pattern}</span>
            </p>
            <h2 className="mb-2 text-base font-bold">例句</h2>
            <ul className="mb-4 grid gap-2">
              {lesson.examples.map((ex) => (
                <li key={ex.ko} className="rounded-2xl border-2 border-line px-4 py-2">
                  <span lang="ko" className="block text-lg">
                    {ex.ko}
                  </span>
                  <span className="text-sm text-ink-soft">{ex.zh}</span>
                  {ex.grammar && ex.grammar.length > 0 && (
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-ink-soft">句子裡還有：</span>
                      {ex.grammar.map((gid) => {
                        const g = getGrammar(gid);
                        if (!g) return null;
                        const label = `${displayForm(g.form)}（${g.level} 級）`;
                        return getLesson(gid) ? (
                          <Link key={gid} href={`/workshop/${gid}`} lang="ko" className="inline-flex min-h-9 items-center rounded-full border-2 border-ink bg-white px-3 hover:bg-peach">
                            {label}
                          </Link>
                        ) : (
                          <span key={gid} lang="ko" className="inline-flex min-h-9 items-center rounded-full border-2 border-dashed border-line bg-white px-3" title="這個文法的練習還在準備中">
                            {label}
                          </span>
                        );
                      })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="rounded-2xl bg-hint px-4 py-3 text-sm">
              <b>中文母語者常卡在這裡：</b>
              {lesson.pitfall_zh}
            </div>
          </section>

          <CoachPanel grammarId={id} prompts={prompts} openRounds={openRounds} initialRemaining={remaining} initialPrompt={initialPrompt} cardPrompts={cardPrompts} />
        </div>
      </main>
    </>
  );
}
