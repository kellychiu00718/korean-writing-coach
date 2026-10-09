import type { User } from "@supabase/supabase-js";
import type { Lesson } from "@/lib/grammar";

export type Interest = Lesson["prompts"][number]["scene"];

export const INTERESTS: { id: Interest; label: string; hint: string }[] = [
  { id: "fan", label: "追星", hint: "粉絲信、泡泡聊天、簽售會" },
  { id: "work", label: "職場", hint: "email、자소서、面試" },
  { id: "topik", label: "TOPIK", hint: "51–54 題的寫法" },
  { id: "daily", label: "日常", hint: "生活、旅行、交朋友" },
];

/** 暱稱與興趣存在 Supabase 帳號的 user_metadata，不另外建表。 */
export function getProfile(user: User) {
  const meta = (user.user_metadata ?? {}) as { nickname?: string; interests?: Interest[] };
  return {
    email: user.email ?? "",
    nickname: meta.nickname ?? "",
    interests: (meta.interests ?? []).filter((i) => INTERESTS.some((x) => x.id === i)),
    onboarded: Array.isArray(meta.interests),
  };
}
