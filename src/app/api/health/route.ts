import { NextResponse } from "next/server";
import { sendAlert } from "@/lib/alert";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * 健康檢查：外部的上線監控每幾分鐘打一次；Vercel 排程每天打一次，順便讓資料庫保持有人使用（免費方案一週沒有請求會暫停）。
 * 只回 ok 或錯誤，不回任何資料。
 */
export async function GET() {
  if (!adminConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  const { error } = await createAdminClient().from("feedback").select("id", { count: "exact", head: true });
  if (error) {
    await sendAlert("health:db", "資料庫連不上", [`健康檢查讀取資料庫失敗：${error.message}`]);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
