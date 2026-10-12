import type { SupabaseClient } from "@supabase/supabase-js";
import { clips, levelItems } from "@/lib/dictation";
import { typingGrade } from "@/lib/dictation-compare";
import { kstDate, kstStamp } from "@/lib/stats";

/** 正確率達到這個標準，才算「聽懂」這一句 */
export const UNDERSTOOD = 90;

type Row = { clip_id: string; accuracy: number; kpm: number; mode: string; created_at: string };

export type DayAccuracy = { date: string; count: number; avg: number };
export type LevelRow = { level: number; practiced: number; understood: number; words: number; grammar: number };
export type SpeedPoint = { stamp: string; kpm: number };

export type DictationStats = {
  practiced: number;
  attempts: number;
  /** 最近 10 次的平均正確率；再前面 10 次的平均（不到 20 次時是 null） */
  recentAvg: number | null;
  prevAvg: number | null;
  /** 聽懂過的句子裡最高的級數 */
  topLevel: number | null;
  days: DayAccuracy[];
  levels: LevelRow[];
  speeds: SpeedPoint[];
  /** 最近 5 次打字模式的平均淨速度 */
  speedAvg: number | null;
  speedGrade: string | null;
};

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

/** 聽打練習的進步數據：全部用練習紀錄和國立國語院的分級計算，不用 AI。 */
export async function getDictationStats(supabase: SupabaseClient, userId: string): Promise<DictationStats> {
  const { data } = await supabase
    .from("dictation_attempts")
    .select("clip_id, accuracy, kpm, mode, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(5000);
  const rows = (data ?? []) as Row[];
  const levelOf = new Map(clips.map((c) => [c.id, c.level]));
  // 只算目前題庫裡還有的句子（課程例句等舊題目不算）
  const listen = rows.filter((r) => r.mode !== "type" && levelOf.has(r.clip_id));
  const typing = rows.filter((r) => r.mode === "type" && r.kpm > 0);

  // 每一句最好的一次
  const best = new Map<string, number>();
  for (const r of listen) best.set(r.clip_id, Math.max(best.get(r.clip_id) ?? 0, r.accuracy));
  const understood = [...best].filter(([, a]) => a >= UNDERSTOOD).map(([id]) => id);

  const recent = listen.slice(-10).map((r) => r.accuracy);
  const prev = listen.length >= 20 ? listen.slice(-20, -10).map((r) => r.accuracy) : [];

  const byDay = new Map<string, number[]>();
  for (const r of listen) {
    const d = kstDate(r.created_at);
    byDay.set(d, [...(byDay.get(d) ?? []), r.accuracy]);
  }

  // 聽懂過的句子裡出現的單字和文法，同一個只算一次，算在它自己的級數
  const heard = new Map<string, { type: string; level: number }>();
  for (const id of understood)
    for (const it of levelItems(id)) heard.set(`${it.type}:${it.text}`, { type: it.type, level: it.level });

  const levels: LevelRow[] = [1, 2, 3, 4, 5, 6].map((level) => ({
    level,
    practiced: [...best.keys()].filter((id) => levelOf.get(id) === level).length,
    understood: understood.filter((id) => levelOf.get(id) === level).length,
    words: [...heard.values()].filter((h) => h.level === level && h.type === "單字").length,
    grammar: [...heard.values()].filter((h) => h.level === level && h.type === "文法").length,
  }));

  const speedAvg = avg(typing.slice(-5).map((r) => r.kpm));
  return {
    practiced: best.size,
    attempts: listen.length,
    recentAvg: avg(recent),
    prevAvg: avg(prev),
    topLevel: understood.length ? Math.max(...understood.map((id) => levelOf.get(id) ?? 0)) : null,
    days: [...byDay].map(([date, xs]) => ({ date, count: xs.length, avg: avg(xs)! })),
    levels,
    speeds: typing.map((r) => ({ stamp: kstStamp(r.created_at), kpm: r.kpm })),
    speedAvg,
    speedGrade: speedAvg !== null ? typingGrade(speedAvg) : null,
  };
}
