import type { SupabaseClient } from "@supabase/supabase-js";
import { STATE_RANK, type ProgressState } from "@/lib/grammar";

export async function getProgress(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("grammar_progress")
    .select("grammar_id, state")
    .eq("user_id", userId);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.grammar_id as string, r.state as ProgressState]));
}

/** 只升不降：已經是「會用」的文法，不會因為之後寫錯或只是打開頁面而降回去。 */
export async function promote(
  supabase: SupabaseClient,
  userId: string,
  changes: { grammarId: string; state: ProgressState; evidence?: string }[],
) {
  if (!changes.length) return [];
  const ids = changes.map((c) => c.grammarId);
  const { data, error } = await supabase
    .from("grammar_progress")
    .select("grammar_id, state")
    .eq("user_id", userId)
    .in("grammar_id", ids);
  if (error) throw error;
  const current = new Map((data ?? []).map((r) => [r.grammar_id as string, r.state as ProgressState]));

  const rows = changes
    .filter((c) => {
      const now = current.get(c.grammarId);
      return !now || STATE_RANK[c.state] > STATE_RANK[now];
    })
    .map((c) => ({
      user_id: userId,
      grammar_id: c.grammarId,
      state: c.state,
      evidence: c.evidence ?? null,
      updated_at: new Date().toISOString(),
    }));
  if (!rows.length) return [];

  const { error: upsertError } = await supabase.from("grammar_progress").upsert(rows);
  if (upsertError) throw upsertError;
  return rows.map((r) => ({ grammarId: r.grammar_id, state: r.state }));
}
