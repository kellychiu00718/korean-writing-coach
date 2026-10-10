"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const redirect = new URL("/auth/callback", window.location.origin);
    if (next) redirect.searchParams.set("next", next);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirect.toString() },
    });
    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <div className="grid gap-4">
        <div role="status" className="animate-pop rounded-2xl bg-sage-soft px-4 py-3 text-sage-ink">
          <p>
            登入連結已寄到 <b>{email}</b>，去信箱點一下就能開始了 ♡
          </p>
          <p className="mt-1 text-sm">請用現在這個瀏覽器打開連結；換手機或換瀏覽器開會登不進來。</p>
        </div>
        <button type="button" className="btn btn-ghost justify-self-start" onClick={() => setStatus("idle")}>
          信箱填錯了？重新輸入
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-1.5 font-medium">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="field"
        />
      </label>
      <button type="submit" className="btn" disabled={status === "sending"}>
        {status === "sending" ? "寄送中…" : "寄登入連結給我"}
      </button>
      {status === "error" && (
        <p role="alert" className="rounded-2xl bg-hint px-4 py-3">
          寄送失敗了，確認 email 再試一次？
        </p>
      )}
    </form>
  );
}
