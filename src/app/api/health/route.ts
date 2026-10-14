import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendAlert } from "@/lib/alert";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * 健康檢查：Vercel 排程每天打一次，順便讓資料庫保持有人使用（免費方案一週沒有請求會暫停）。
 * 不公開：要帶 Vercel 排程自動附上的 `Authorization: Bearer <CRON_SECRET>`，否則回 404，外人看不出這裡有東西。
 * 外部的上線監控（UptimeRobot）改看公開頁面，不打這裡。只回 ok 或錯誤，不回任何資料。
 */
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  // 本機沒設定時方便測試；正式環境沒設定就一律拒絕
  if (!secret) return process.env.NODE_ENV !== "production";
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(request: Request) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 });
  if (!adminConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  const { error } = await createAdminClient().from("feedback").select("id", { count: "exact", head: true });
  if (error) {
    await sendAlert("health:db", "資料庫連不上", [`健康檢查讀取資料庫失敗：${error.message}`]);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
