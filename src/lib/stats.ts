import type { SupabaseClient } from "@supabase/supabase-js";
import type { RevealedFeedback } from "@/lib/coach";

type AttemptRow = {
  grammar_id: string;
  prompt_index: number;
  sentence: string;
  attempt: number;
  feedback: RevealedFeedback;
  created_at: string;
};

export type RoundOutcome = "first" | "second" | "third" | "revealed";

export const OUTCOME_LABEL: Record<RoundOutcome, string> = {
  first: "第 1 次就寫對",
  second: "第 2 次寫對",
  third: "第 3 次以上寫對",
  revealed: "看了參考答案",
};

/** 韓國時間的日期字串（YYYY-MM-DD）。 */
export function kstDate(iso: string) {
  return new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

export async function getStats(supabase: SupabaseClient, userId: string) {
  const [{ data: attemptData, error: attemptError }, { data: progressData, error: progressError }] = await Promise.all([
    supabase
      .from("attempts")
      .select("grammar_id, prompt_index, sentence, attempt, feedback, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(2000),
    supabase.from("grammar_progress").select("grammar_id, state, updated_at").eq("user_id", userId),
  ]);
  if (attemptError) throw attemptError;
  if (progressError) throw progressError;
  const attempts = (attemptData ?? []) as AttemptRow[];

  // 每一輪在揭曉參考答案（level 3）時結束；記錄是第幾次寫對，或看了答案。
  const outcomes: Record<RoundOutcome, number> = { first: 0, second: 0, third: 0, revealed: 0 };
  for (const a of attempts) {
    if (a.feedback.level < 3) continue;
    if (!a.feedback.solved) outcomes.revealed++;
    else if (a.attempt === 1) outcomes.first++;
    else if (a.attempt === 2) outcomes.second++;
    else outcomes.third++;
  }

  const categoryCounts = new Map<string, number>();
  for (const a of attempts) {
    for (const issue of a.feedback.issues) {
      categoryCounts.set(issue.category, (categoryCounts.get(issue.category) ?? 0) + 1);
    }
  }
  const topCategories = [...categoryCounts.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));

  // 「會用」只升不降，所以 updated_at 就是變成會用的時間，可以直接累加成成長曲線。
  const useDates = (progressData ?? [])
    .filter((p) => p.state === "use")
    .map((p) => kstDate(p.updated_at as string))
    .sort();
  const growth: { date: string; total: number }[] = [];
  useDates.forEach((d, i) => {
    if (growth.at(-1)?.date === d) growth[growth.length - 1].total = i + 1;
    else growth.push({ date: d, total: i + 1 });
  });

  const solvedSentences = attempts
    .filter((a) => a.feedback.solved)
    .reverse()
    .slice(0, 50)
    .map((a) => ({ grammarId: a.grammar_id, sentence: a.sentence, date: kstDate(a.created_at) }));

  return {
    useCount: useDates.length,
    sentenceCount: attempts.length,
    practiceDays: new Set(attempts.map((a) => kstDate(a.created_at))).size,
    outcomes,
    topCategories,
    growth,
    solvedSentences,
  };
}
