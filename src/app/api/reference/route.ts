import { NextResponse } from "next/server";
import { z } from "zod";
import { getLesson } from "@/lib/lessons";
import { DAILY_LIMIT, usedToday } from "@/lib/limits";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({ grammarId: z.string(), promptIndex: z.number().int().min(0) });

/** 當天 AI 次數用完、這題又還卡著時，給預先寫好的參考寫法。次數還沒用完就不給，要先自己試。 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "送出的內容格式不對。" }, { status: 400 });
  const prompt = getLesson(parsed.data.grammarId)?.prompts[parsed.data.promptIndex];
  if (!prompt) return NextResponse.json({ error: "找不到這個題目。" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  const used = await usedToday(supabase);
  if (used === null) return NextResponse.json({ error: "讀取紀錄時出了問題，請稍後再試。" }, { status: 500 });
  if (used < DAILY_LIMIT) return NextResponse.json({ error: "今天還可以請教練看，先自己試試看吧！" }, { status: 403 });

  return NextResponse.json({ reference: prompt.reference_ko });
}
