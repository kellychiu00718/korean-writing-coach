"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CONFIRM_WORD = "刪除";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");

  async function onDelete() {
    setStatus("deleting");
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_own_account");
    if (error) {
      setStatus("error");
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/landing.html";
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        刪除帳號…
      </button>
    );
  }

  return (
    <div className="grid gap-3 rounded-2xl border-2 border-ink bg-hint px-4 py-4">
      <p>
        刪除後，你寫過的所有句子和文法地圖都會一起刪掉，<b>無法復原</b>。確定的話，請在下面輸入「{CONFIRM_WORD}」。
      </p>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        aria-label={`輸入「${CONFIRM_WORD}」確認`}
        className="field bg-white"
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-sm"
          disabled={typed.trim() !== CONFIRM_WORD || status === "deleting"}
          onClick={onDelete}
        >
          {status === "deleting" ? "刪除中…" : "永久刪除我的帳號"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          先不要
        </button>
      </div>
      {status === "error" && (
        <p role="alert" className="text-sm">
          刪除失敗了。可能是網站還沒完成刪除功能的設定，請稍後再試，或聯絡網站作者。
        </p>
      )}
    </div>
  );
}
