import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  kind: z.enum(["bug", "idea", "other"]),
  message: z.string().trim().min(1).max(2000),
  replyEmail: z.string().trim().max(200).optional(),
  page: z.string().max(300).optional(),
  // 機器人常會把所有欄位填滿；這個欄位對使用者是隱藏的，有值就當成垃圾訊息
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "內容好像有點問題，確認一下再送出？" }, { status: 400 });
  const { kind, message, replyEmail, page } = parsed.data;
  if (replyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyEmail)) {
    return NextResponse.json({ error: "電子信箱的格式好像不太對。" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("feedback").insert({
    user_id: user?.id ?? null,
    kind,
    message,
    reply_email: replyEmail || null,
    page: page || null,
  });
  if (error) return NextResponse.json({ error: "送出失敗了，請稍後再試。" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
