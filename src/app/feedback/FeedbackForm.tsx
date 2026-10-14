"use client";

import Link from "next/link";
import { useState } from "react";
import { TURNSTILE_FAILED, useTurnstile } from "@/components/Turnstile";

const KINDS = [
  { id: "bug", label: "回報問題" },
  { id: "idea", label: "功能建議" },
  { id: "other", label: "其他" },
] as const;

export function FeedbackForm({ defaultEmail, page }: { defaultEmail: string; page?: string }) {
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const turnstile = useTurnstile("feedback");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!message.trim()) {
      setStatus("error");
      setError("內容還是空的喔。");
      return;
    }
    setStatus("sending");
    const website = (e.currentTarget.elements.namedItem("website") as HTMLInputElement).value;
    let turnstileToken: string | null;
    try {
      turnstileToken = await turnstile.getToken();
    } catch {
      setStatus("error");
      setError(TURNSTILE_FAILED);
      return;
    }
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          message,
          replyEmail: email || undefined,
          page,
          website: website || undefined,
          turnstileToken: turnstileToken ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "送出失敗了，請稍後再試。");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setError("網路好像斷了，再試一次？");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="grid gap-4">
        <p className="animate-pop rounded-2xl bg-sage-soft px-4 py-3 text-sage-ink">收到了，謝謝你願意告訴我 ♡</p>
        <Link href="/workshop" className="btn btn-ghost justify-self-start">
          回到句子工坊
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6" noValidate>
      <fieldset>
        <legend className="mb-2 font-medium">類型</legend>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <label key={k.id} className="relative">
              <input
                type="radio"
                name="kind"
                value={k.id}
                checked={kind === k.id}
                onChange={() => setKind(k.id)}
                className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
              />
              <span className="inline-flex min-h-11 items-center rounded-full border-2 border-line bg-white px-4 peer-checked:border-ink peer-checked:bg-sage-soft peer-checked:font-medium peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-sage-ink">
                {k.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <label htmlFor="fb-message" className="font-medium">
          想說的話
        </label>
        <textarea
          id="fb-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={6}
          required
          aria-invalid={status === "error" && !message.trim() ? true : undefined}
          placeholder={kind === "bug" ? "在哪個頁面、做了什麼、看到什麼畫面？" : "想到什麼都可以寫"}
          className="field resize-y"
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="fb-email" className="font-medium">
          電子信箱
        </label>
        <input
          id="fb-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="想收到回覆的話再填寫即可"
          className="field"
        />
      </div>
      {/* 給機器人的陷阱欄位，使用者看不到 */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div ref={turnstile.ref} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn" disabled={status === "sending"}>
          {status === "sending" ? "送出中…" : "送出"}
        </button>
        <span className="text-xs text-ink-soft">
          送出的內容依
          <Link href="/privacy" className="underline underline-offset-2">
            隱私權政策
          </Link>
          處理。
        </span>
      </div>
      {status === "error" && (
        <p role="alert" className="rounded-2xl bg-hint px-4 py-3">
          {error}
        </p>
      )}
    </form>
  );
}
