import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RevealedFeedback } from "@/lib/coach";
import { getLesson } from "@/lib/lessons";

/** 錯了兩次（走到第 3 次才結束）就自動加入複習字卡。 */
export const AUTO_ADD_FROM_ATTEMPT = 3;

/**
 * 用這一題最近一次揭曉的參考答案建立（或更新）複習字卡。
 * 參考答案還沒揭曉就不能加，避免字卡提前洩漏答案。
 */
export async function saveReviewCard(
  supabase: SupabaseClient,
  userId: string,
  grammarId: string,
  promptIndex: number,
  source: "auto" | "manual",
) {
  const lesson = getLesson(grammarId);
  const prompt = lesson?.prompts[promptIndex];
  if (!lesson || !prompt) return { ok: false as const, reason: "notfound" };

  const { data, error } = await supabase
    .from("attempts")
    .select("sentence, feedback")
    .eq("user_id", userId)
    .eq("grammar_id", grammarId)
    .eq("prompt_index", promptIndex)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return { ok: false as const, reason: "db" };
  const closed = (data ?? []).find((r) => (r.feedback as RevealedFeedback).level === 3);
  if (!closed) return { ok: false as const, reason: "not_revealed" };
  const fb = closed.feedback as RevealedFeedback;

  const { error: upsertError } = await supabase.from("review_cards").upsert(
    {
      user_id: userId,
      grammar_id: grammarId,
      prompt_index: promptIndex,
      situation_zh: prompt.situation_zh,
      my_sentence: closed.sentence,
      reference_ko: fb.reference ?? closed.sentence,
      note_zh: fb.referenceNote,
      source,
    },
    { onConflict: "user_id,grammar_id,prompt_index" },
  );
  if (upsertError) return { ok: false as const, reason: "db" };
  return { ok: true as const };
}
