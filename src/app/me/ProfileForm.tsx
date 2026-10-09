"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { INTERESTS, type Interest } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm({
  nickname: initialNickname,
  interests: initialInterests,
  submitLabel = "儲存",
  redirectTo,
}: {
  nickname: string;
  interests: Interest[];
  submitLabel?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initialNickname);
  const [interests, setInterests] = useState<Interest[]>(initialInterests);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function toggle(id: Interest) {
    setInterests((cur) => (cur.includes(id) ? cur.filter((i) => i !== id) : [...cur, id]));
    setStatus("idle");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const { error } = await createClient().auth.updateUser({
      data: { nickname: nickname.trim().slice(0, 20), interests },
    });
    if (error) {
      setStatus("error");
      return;
    }
    setStatus("saved");
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <label className="grid gap-1.5 font-medium">
        暱稱
        <input
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setStatus("idle");
          }}
          maxLength={20}
          placeholder="想被怎麼稱呼？"
          className="field"
        />
      </label>
      <fieldset>
        <legend className="mb-2 font-medium">想多練哪些主題？（可複選）</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {INTERESTS.map((i) => {
            const on = interests.includes(i.id);
            return (
              <label
                key={i.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3 ${
                  on ? "border-ink bg-sage-soft" : "border-line bg-white"
                }`}
              >
                <input type="checkbox" checked={on} onChange={() => toggle(i.id)} className="mt-1.5 size-4 accent-[#2F5F55]" />
                <span>
                  <b className="block">{i.label}</b>
                  <span className="text-sm text-ink-soft">{i.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn" disabled={status === "saving"}>
          {status === "saving" ? "儲存中…" : submitLabel}
        </button>
        <span role="status" className="text-sm text-sage-ink">
          {status === "saved" && !redirectTo && "已儲存 ♡"}
        </span>
        {status === "error" && (
          <span role="alert" className="text-sm">
            儲存失敗了，再試一次？
          </span>
        )}
      </div>
    </form>
  );
}
