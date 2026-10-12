import { NextResponse } from "next/server";
import { z } from "zod";
import { getItem } from "@/lib/dictation";
import { compareDictation, keystrokes, netKeystrokes } from "@/lib/dictation-compare";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  clipId: z.string().max(40),
  typed: z.string().trim().min(1).max(300),
  mode: z.enum(["listen", "type"]),
  // 從打下第一個字到按下對答案的時間（毫秒）
  ms: z.number().int().min(0).max(3_600_000),
});

/**
 * 記錄一次聽打。正確率和速度都在伺服器重新計算，使用者沒辦法自己改分數。
 * 速度用的時間是瀏覽器量的，無法完全驗證，所以另外限制在合理範圍內。
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { clipId, typed, mode, ms } = parsed.data;
  const item = getItem(clipId);
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const admin = createAdminClient();
  // 每人每分鐘最多記 20 次：正常練習一分鐘頂多幾句，超過的多半是程式在灌資料（資料庫空間和統計會被灌爆）
  const { count } = await admin
    .from("dictation_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if ((count ?? 0) >= 20) return NextResponse.json({ error: "too many" }, { status: 429 });

  const r = compareDictation(item.text_ko, typed);
  const minutes = ms / 60000;
  // 不到 3 秒算出來的速度不準，記 0（跟畫面上的規則一樣）
  const keys = mode === "type" ? netKeystrokes(r.answerMarks) : keystrokes(typed);
  const kpm = minutes >= 0.05 ? Math.min(3000, Math.round(keys / minutes)) : 0;

  const { error } = await admin.from("dictation_attempts").insert({
    user_id: user.id,
    clip_id: clipId,
    typed,
    accuracy: r.accuracy,
    kpm,
    mode,
  });
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
