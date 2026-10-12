import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 伺服器專用的資料庫連線（service role 金鑰，不受 RLS 限制）。
 * 資料庫已經不讓使用者自己寫入練習紀錄、文法地圖、字卡和意見回報，所有寫入都要經過伺服器檢查後用這個連線寫。
 * 金鑰只放在伺服器的環境變數（沒有 NEXT_PUBLIC_ 開頭），不會被打包進瀏覽器；「server-only」會在有人誤從瀏覽器端匯入時讓建置失敗。
 */
export function adminConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let client: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (!adminConfigured()) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
