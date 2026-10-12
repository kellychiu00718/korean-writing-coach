import { NextResponse } from "next/server";
import { z } from "zod";
import { saveReviewCard } from "@/lib/review";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({ grammarId: z.string(), promptIndex: z.number().int().min(0) });

/** 使用者自己把一題加入複習字卡。 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "送出的內容格式不對。" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  if (!adminConfigured()) return NextResponse.json({ error: "加入失敗了，請稍後再試。" }, { status: 500 });
  // 字卡只能由伺服器寫：會先確認這題的參考答案已經揭曉
  const result = await saveReviewCard(createAdminClient(), user.id, parsed.data.grammarId, parsed.data.promptIndex, "manual");
  if (!result.ok) {
    const message =
      result.reason === "not_revealed" ? "這題寫完、看到參考答案之後才能加入喔。" : "加入失敗了，請稍後再試。";
    return NextResponse.json({ error: message }, { status: result.reason === "not_revealed" ? 400 : 500 });
  }
  return NextResponse.json({ ok: true });
}
