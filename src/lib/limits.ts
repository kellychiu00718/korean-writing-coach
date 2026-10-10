import type { SupabaseClient } from "@supabase/supabase-js";

/** 每人每天可以請 AI 教練看幾次（韓國時間每天 00:00 重算）。資料庫另有天花板 50 次。 */
export const DAILY_LIMIT = Number(process.env.DAILY_AI_LIMIT || 30);
/** 全站每天最多呼叫幾次 AI，避免大量註冊帳號把費用刷爆。資料庫另有天花板 2000 次。 */
export const GLOBAL_DAILY_LIMIT = Number(process.env.GLOBAL_DAILY_AI_LIMIT || 300);

/** 韓國時間（UTC+9）今天 00:00 的 UTC 時間。 */
export function startOfTodayKst() {
  const kst = new Date(Date.now() + 9 * 3600_000);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - 9 * 3600_000).toISOString();
}

/** 今天已經用了幾次；讀取失敗回傳 null。 */
export async function usedToday(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfTodayKst());
  return error ? null : (count ?? 0);
}

type Quota = { ok: true; remaining: number; usageId: string } | { ok: false; reason: "user" | "global" | "error" };

/** 呼叫 AI 前先扣一次；檢查和扣次數在資料庫裡一次完成，同時送出很多次也不會超過上限。 */
export async function consumeQuota(supabase: SupabaseClient): Promise<Quota> {
  const { data, error } = await supabase
    .rpc("consume_ai_quota", { per_user: DAILY_LIMIT, global_cap: GLOBAL_DAILY_LIMIT })
    .single<{ remaining: number; usage_id: string | null }>();
  if (error || !data) return { ok: false, reason: "error" };
  if (data.remaining === -1) return { ok: false, reason: "user" };
  if (data.remaining === -2) return { ok: false, reason: "global" };
  return { ok: true, remaining: data.remaining, usageId: data.usage_id! };
}

/** AI 沒有成功回覆時，把剛扣的那一次還回去。 */
export async function refundQuota(supabase: SupabaseClient, usageId: string) {
  await supabase.rpc("refund_ai_quota", { usage: usageId });
}
