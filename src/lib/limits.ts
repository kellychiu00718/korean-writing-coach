import type { SupabaseClient } from "@supabase/supabase-js";

/** 每人每天可以請 AI 教練看幾次（韓國時間每天 00:00 重算）。 */
export const DAILY_LIMIT = Number(process.env.DAILY_AI_LIMIT || 30);

/** 韓國時間（UTC+9）今天 00:00 的 UTC 時間。 */
export function startOfTodayKst() {
  const kst = new Date(Date.now() + 9 * 3600_000);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - 9 * 3600_000).toISOString();
}

/** 今天已經用了幾次；讀取失敗回傳 null。 */
export async function usedToday(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfTodayKst());
  return error ? null : (count ?? 0);
}
