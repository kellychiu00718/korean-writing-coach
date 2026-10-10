import type { SupabaseClient } from "@supabase/supabase-js";
import type { RevealedFeedback } from "@/lib/coach";
import { displayForm, getGrammar } from "@/lib/grammar";

type AttemptRow = {
  grammar_id: string;
  prompt_index: number;
  sentence: string;
  attempt: number;
  feedback: RevealedFeedback;
  created_at: string;
};

export type RoundOutcome = "first" | "second" | "third" | "revealed";


const KST = 9 * 3600_000;

/** 韓國時間的日期字串（YYYY-MM-DD）。 */
export function kstDate(iso: string) {
  return new Date(new Date(iso).getTime() + KST).toISOString().slice(0, 10);
}

/** 韓國時間的「MM-DD HH:mm」，在伺服器先排好，避免瀏覽器時區不同造成畫面不一致。 */
export function kstStamp(iso: string) {
  const s = new Date(new Date(iso).getTime() + KST).toISOString();
  return `${s.slice(5, 10)} ${s.slice(11, 16)}`;
}

export type RoundStep = {
  attempt: number;
  sentence: string;
  overall: RevealedFeedback["overall"];
  solved: boolean;
  spans: string[];
  categories: string[];
  stamp: string;
};

export type Round = {
  key: string;
  grammarId: string;
  form: string;
  level: number;
  outcome: RoundOutcome | "open";
  steps: RoundStep[];
  /** 排序用：結束（或最後一次送出）的時間。 */
  endedAt: string;
  date: string;
  stamp: string;
};

export type LearnedGrammar = {
  grammarId: string;
  form: string;
  level: number;
  /** practice＝練習這個文法時寫對；bonus＝練習別的文法時，句子裡順便用對。 */
  source: "practice" | "bonus";
  evidence: string | null;
  at: string;
  date: string;
  stamp: string;
  /** 練習這個文法時寫過的所有句子（舊→新）。 */
  sentences: string[];
};

export type DetailItem = { form: string; grammarId: string; text: string; note?: string; stamp: string };

export async function getStats(supabase: SupabaseClient, userId: string) {
  const [{ data: attemptData, error: attemptError }, { data: progressData, error: progressError }] = await Promise.all([
    supabase
      .from("attempts")
      .select("grammar_id, prompt_index, sentence, attempt, feedback, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(2000),
    supabase.from("grammar_progress").select("grammar_id, state, evidence, updated_at").eq("user_id", userId),
  ]);
  if (attemptError) throw attemptError;
  if (progressError) throw progressError;
  const attempts = (attemptData ?? []) as AttemptRow[];
  const formOf = (id: string) => displayForm(getGrammar(id)?.form ?? id);

  // 把送出紀錄接成一輪一輪：第 1 次送出開始新的一輪，揭曉參考答案（level 3）時結束。
  const rounds: Round[] = [];
  const openByKey = new Map<string, Round>();
  for (const a of attempts) {
    const key = `${a.grammar_id}#${a.prompt_index}`;
    let round = openByKey.get(key);
    if (!round || a.attempt === 1) {
      round = {
        key: `${key}#${rounds.length}`,
        grammarId: a.grammar_id,
        form: formOf(a.grammar_id),
        level: getGrammar(a.grammar_id)?.level ?? 0,
        outcome: "open",
        steps: [],
        endedAt: a.created_at,
        date: kstDate(a.created_at),
        stamp: kstStamp(a.created_at),
      };
      rounds.push(round);
      openByKey.set(key, round);
    }
    round.steps.push({
      attempt: a.attempt,
      sentence: a.sentence,
      overall: a.feedback.overall,
      solved: a.feedback.solved,
      spans: a.feedback.issues.map((i) => i.span).filter(Boolean),
      categories: [...new Set(a.feedback.issues.map((i) => i.category))],
      stamp: kstStamp(a.created_at),
    });
    round.endedAt = a.created_at;
    round.date = kstDate(a.created_at);
    round.stamp = kstStamp(a.created_at);
    if (a.feedback.level >= 3) {
      round.outcome = !a.feedback.solved ? "revealed" : a.attempt === 1 ? "first" : a.attempt === 2 ? "second" : "third";
      openByKey.delete(key);
    }
  }

  const outcomes: Record<RoundOutcome, number> = { first: 0, second: 0, third: 0, revealed: 0 };
  const outcomeItems: Record<RoundOutcome, DetailItem[]> = { first: [], second: [], third: [], revealed: [] };
  for (const r of rounds) {
    if (r.outcome === "open") continue;
    outcomes[r.outcome]++;
    const last = r.steps.at(-1)!;
    outcomeItems[r.outcome].push({
      form: r.form,
      grammarId: r.grammarId,
      text: last.sentence,
      note: r.outcome === "revealed" ? `寫了 ${r.steps.length} 次` : `第 ${last.attempt} 次寫對`,
      stamp: r.stamp,
    });
  }
  for (const k of Object.keys(outcomeItems) as RoundOutcome[]) outcomeItems[k].reverse();

  // 每一類需要提示的地方：記下是哪個文法、哪個句子、標出的是哪一段。
  const categoryItems = new Map<string, DetailItem[]>();
  for (const a of attempts) {
    for (const issue of a.feedback.issues) {
      const list = categoryItems.get(issue.category) ?? [];
      list.push({
        form: formOf(a.grammar_id),
        grammarId: a.grammar_id,
        text: a.sentence,
        note: issue.span ? `要改的地方：${issue.span}` : undefined,
        stamp: kstStamp(a.created_at),
      });
      categoryItems.set(issue.category, list);
    }
  }
  const topCategories = [...categoryItems.entries()]
    .sort((x, y) => y[1].length - x[1].length)
    .slice(0, 5)
    .map(([category, items]) => ({ category, count: items.length, items: [...items].reverse() }));

  // 「自己寫出來且用對」只升不降，所以 updated_at 就是寫對的時間。
  const practicedSolved = new Set(rounds.filter((r) => r.steps.some((s) => s.solved)).map((r) => r.grammarId));
  const sentencesByGrammar = new Map<string, string[]>();
  for (const a of attempts) {
    const list = sentencesByGrammar.get(a.grammar_id) ?? [];
    if (!list.includes(a.sentence)) list.push(a.sentence);
    sentencesByGrammar.set(a.grammar_id, list);
  }
  const learned: LearnedGrammar[] = (progressData ?? [])
    .filter((p) => p.state === "use")
    .map((p) => {
      const at = p.updated_at as string;
      const id = p.grammar_id as string;
      return {
        grammarId: id,
        form: formOf(id),
        level: getGrammar(id)?.level ?? 0,
        source: practicedSolved.has(id) ? ("practice" as const) : ("bonus" as const),
        evidence: (p.evidence as string | null) ?? null,
        at,
        date: kstDate(at),
        stamp: kstStamp(at),
        sentences: sentencesByGrammar.get(id) ?? [],
      };
    })
    .sort((x, y) => x.at.localeCompare(y.at));

  const closed = rounds.filter((r) => r.outcome !== "open");
  return {
    useCount: learned.length,
    practiceUseCount: learned.filter((l) => l.source === "practice").length,
    sentenceCount: attempts.length,
    roundCount: closed.length,
    outcomes,
    outcomeItems,
    topCategories,
    learned,
    /** 沒看參考答案、靠自己寫對的題目（新→舊）。 */
    solvedRounds: closed.filter((r) => r.outcome !== "revealed").reverse(),
    rounds: rounds.slice(-60).reverse(),
  };
}
