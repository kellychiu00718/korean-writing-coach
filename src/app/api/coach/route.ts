import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CoachError, revealFeedback, reviewSentence, type RevealedFeedback } from "@/lib/coach";
import { getGrammar, getLesson, type ProgressState } from "@/lib/grammar";
import { promote } from "@/lib/progress";
import { AUTO_ADD_FROM_ATTEMPT, saveReviewCard } from "@/lib/review";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  grammarId: z.string(),
  promptIndex: z.number().int().min(0),
  sentence: z.string().trim().min(1).max(300),
});

const DAILY_LIMIT = Number(process.env.DAILY_AI_LIMIT || 30);

/** 韓國時間（UTC+9）今天 00:00 的 UTC 時間。 */
function startOfTodayKst() {
  const kst = new Date(Date.now() + 9 * 3600_000);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - 9 * 3600_000).toISOString();
}

function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "送出的內容格式不對。");
  const { grammarId, promptIndex, sentence } = parsed.data;

  const item = getGrammar(grammarId);
  const lesson = getLesson(grammarId);
  if (!item || !lesson || promptIndex >= lesson.prompts.length) return fail(404, "找不到這個題目。");
  if (!/[가-힣]/.test(sentence)) return fail(400, "試著用韓文寫寫看吧！");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "請先登入。");

  const { count, error: countError } = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfTodayKst());
  if (countError) return fail(500, "讀取紀錄時出了問題，請稍後再試。");
  if ((count ?? 0) >= DAILY_LIMIT) {
    return fail(429, `今天的 AI 回饋次數（${DAILY_LIMIT} 次）用完了，明天再繼續吧。`);
  }

  // 第幾次送出由伺服器判斷，避免直接跳到第 3 層拿答案。上一輪已經揭曉參考寫法，就開新的一輪。
  const { data: history, error: historyError } = await supabase
    .from("attempts")
    .select("sentence, attempt, feedback")
    .eq("user_id", user.id)
    .eq("grammar_id", grammarId)
    .eq("prompt_index", promptIndex)
    .order("created_at", { ascending: false })
    .limit(10);
  if (historyError) return fail(500, "讀取紀錄時出了問題，請稍後再試。");

  const rows = (history ?? []) as { sentence: string; attempt: number; feedback: RevealedFeedback }[];
  const last = rows[0];
  const roundOpen = last && last.feedback.level < 3;
  const attempt = roundOpen ? last.attempt + 1 : 1;
  const previous = roundOpen ? rows.slice(0, last.attempt).map((r) => r.sentence).reverse() : [];
  const shownReferences = rows.map((r) => r.feedback.reference).filter((r): r is string => Boolean(r));

  let revealed: RevealedFeedback;
  let otherIds: string[];
  try {
    const fb = await reviewSentence({ item, lesson, promptIndex, sentence, attempt, previous });
    revealed = revealFeedback(fb, attempt, sentence, grammarId);
    otherIds = fb.other_grammar_ids;
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return fail(500, "AI 金鑰還沒設定好。");
    if (error instanceof Anthropic.RateLimitError) return fail(503, "現在使用的人有點多，過幾秒再試一次。");
    if (error instanceof Anthropic.APIError) return fail(502, "AI 暫時沒有回應，請稍後再試。");
    if (error instanceof CoachError) return fail(502, "這句 AI 沒辦法判斷，換個寫法試試看？");
    throw error;
  }

  // 只存已揭曉的內容，參考寫法不會提早出現在資料庫裡。
  const { error: insertError } = await supabase.from("attempts").insert({
    user_id: user.id,
    grammar_id: grammarId,
    prompt_index: promptIndex,
    sentence,
    attempt,
    overall: revealed.overall,
    feedback: revealed,
  });
  if (insertError) return fail(500, "儲存時出了問題，請稍後再試。");

  // 照抄已經看過的參考寫法，只算「大概知道」。
  const copied = shownReferences.some((r) => r.replace(/\s/g, "") === sentence.replace(/\s/g, ""));
  const changes: { grammarId: string; state: ProgressState; evidence?: string }[] = [];
  if (revealed.usesTarget && revealed.targetCorrect && !copied) {
    changes.push({ grammarId, state: "use", evidence: sentence });
  } else if (revealed.usesTarget) {
    changes.push({ grammarId, state: "know" });
  }
  if (revealed.overall !== "error" && !copied) {
    for (const id of new Set(otherIds)) {
      if (id !== grammarId && getGrammar(id)) changes.push({ grammarId: id, state: "use", evidence: sentence });
    }
  }

  let promoted: { grammarId: string; state: string }[] = [];
  try {
    promoted = await promote(supabase, user.id, changes);
  } catch {
    // 地圖沒更新不影響這次回饋，下次寫對會再補上。
  }

  // 錯了兩次（第 3 次才結束這題）就自動加入複習字卡；失敗不影響這次回饋。
  let reviewCard: "auto" | null = null;
  if (revealed.level === 3 && attempt >= AUTO_ADD_FROM_ATTEMPT) {
    const saved = await saveReviewCard(supabase, user.id, grammarId, promptIndex, "auto").catch(() => null);
    if (saved?.ok) reviewCard = "auto";
  }

  return NextResponse.json({
    attempt,
    feedback: revealed,
    promoted,
    reviewCard,
    remaining: Math.max(0, DAILY_LIMIT - (count ?? 0) - 1),
  });
}
