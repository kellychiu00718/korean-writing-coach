import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CoachError, revealFeedback, reviewSentence, type PreviousVersion, type RevealedFeedback } from "@/lib/coach";
import { getGrammar, type ProgressState } from "@/lib/grammar";
import { getLesson } from "@/lib/lessons";
import { consumeQuota, DAILY_LIMIT, refundQuota } from "@/lib/limits";
import { promote } from "@/lib/progress";
import { AUTO_ADD_FROM_ATTEMPT, saveReviewCard } from "@/lib/review";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// AI 回覆可能要等十幾秒，部署到 Vercel 時讓這支 API 最多可以跑 60 秒
export const maxDuration = 60;

const Body = z.object({
  grammarId: z.string(),
  promptIndex: z.number().int().min(0),
  sentence: z.string().trim().min(1).max(300),
});

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
  // 寫入紀錄要用伺服器專用的連線；還沒設定好就先停，不要扣次數、也不要呼叫 AI
  if (!adminConfigured()) return fail(500, "伺服器設定還沒完成，請稍後再試。");
  const admin = createAdminClient();

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
  const previous: PreviousVersion[] = roundOpen
    ? rows
        .slice(0, last.attempt)
        .reverse()
        .map((r) => ({
          sentence: r.sentence,
          overall: r.feedback.overall,
          issues: r.feedback.issues.map((i) => ({ category: i.category, span: i.span })),
        }))
    : [];
  const shownReferences = rows.map((r) => r.feedback.reference).filter((r): r is string => Boolean(r));

  // 先在資料庫扣一次，扣成功才呼叫 AI；同時送出很多次也不會超過上限
  const quota = await consumeQuota(supabase);
  if (!quota.ok) {
    if (quota.reason === "error") return fail(500, "讀取紀錄時出了問題，請稍後再試。");
    if (quota.reason === "global") return fail(503, "今天使用的人太多了，AI 教練先休息一下，明天再繼續吧。");
    return NextResponse.json(
      { error: `今天的 AI 回饋次數（${DAILY_LIMIT}\u00a0次）用完了，明天會恢復。`, limitReached: true },
      { status: 429 },
    );
  }

  let revealed: RevealedFeedback;
  let otherIds: string[];
  try {
    const fb = await reviewSentence({ item, lesson, promptIndex, sentence, attempt, previous });
    revealed = revealFeedback(fb, attempt, sentence, grammarId);
    otherIds = fb.other_grammar_ids;
  } catch (error) {
    // AI 沒有成功回覆，這次不算
    await refundQuota(admin, quota.usageId, user.id).catch(() => {});
    if (error instanceof Anthropic.AuthenticationError) return fail(500, "AI 金鑰還沒設定好。");
    if (error instanceof Anthropic.RateLimitError) return fail(503, "現在使用的人有點多，過幾秒再試一次。");
    if (error instanceof Anthropic.APIError) return fail(502, "AI 暫時沒有回應，請稍後再試。");
    if (error instanceof CoachError) return fail(502, "這句 AI 沒辦法判斷，換個寫法試試看？");
    throw error;
  }

  // 只存已揭曉的內容，參考寫法不會提早出現在資料庫裡。使用者不能自己寫這張表，只能由伺服器寫。
  const { error: insertError } = await admin.from("attempts").insert({
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
  // 句子裡順便用對的其他文法：整句都正確才算，而且只算畫面上會顯示的 2 級以上文法（이/가、을/를 這類基礎助詞不另外計入）。
  if (revealed.overall === "correct" && !copied) {
    for (const id of new Set(otherIds)) {
      if (id !== grammarId && (getGrammar(id)?.level ?? 0) >= 2) {
        changes.push({ grammarId: id, state: "use", evidence: sentence });
      }
    }
  }

  let promoted: { grammarId: string; state: string }[] = [];
  try {
    promoted = await promote(admin, user.id, changes);
  } catch {
    // 地圖沒更新不影響這次回饋，下次寫對會再補上。
  }

  // 錯了兩次（第 3 次才結束這題）就自動加入複習字卡；失敗不影響這次回饋。
  let reviewCard: "auto" | null = null;
  if (revealed.level === 3 && attempt >= AUTO_ADD_FROM_ATTEMPT) {
    const saved = await saveReviewCard(admin, user.id, grammarId, promptIndex, "auto").catch(() => null);
    if (saved?.ok) reviewCard = "auto";
  }

  return NextResponse.json({
    attempt,
    feedback: revealed,
    promoted,
    reviewCard,
    remaining: quota.remaining,
  });
}
