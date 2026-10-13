"use client";

import type { AuthError } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { safePath } from "@/lib/safe-path";
import { createClient } from "@/lib/supabase/client";

/** Supabase 規定同一個信箱 60 秒內只能再寄一次。 */
const RESEND_SECONDS = 60;

type Problem = { text: string; wait?: number };

/** 把 Supabase 的錯誤翻成看得懂、知道下一步怎麼做的話。 */
function explain(error: AuthError): Problem {
  const seconds = Number(/after (\d+) seconds?/i.exec(error.message)?.[1]);
  if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit" || error.status === 429) {
    if (seconds) return { text: `寄得有點太頻繁了，請等 ${seconds} 秒再試一次。`, wait: seconds };
    return {
      text: "這段時間寄出的登入信已經到上限了，請過一小時左右再試。如果信箱裡已經有一封登入信，可以直接輸入信裡的驗證碼。",
    };
  }
  if (error.code === "email_address_invalid" || error.code === "validation_failed") {
    return { text: "這個電子信箱的格式好像不太對，確認一下拼字再試一次？" };
  }
  if (error.code === "email_address_not_authorized") {
    return { text: "網站目前還沒開放這個電子信箱登入，請透過意見回報告訴我。" };
  }
  return { text: "寄送失敗了，請確認網路連線後再試一次。" };
}

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [view, setView] = useState<"form" | "sent">("form");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  // 可以再寄的時間（只限同一個信箱）；倒數期間按鈕會顯示還要等幾秒
  const [cooldown, setCooldown] = useState({ email: "", until: 0 });
  const [now, setNow] = useState(() => Date.now());
  const current = view === "sent" ? sentTo : email.trim();
  const wait = cooldown.email === current ? Math.max(0, Math.ceil((cooldown.until - now) / 1000)) : 0;

  useEffect(() => {
    if (!wait) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [wait]);

  async function send() {
    const address = view === "sent" ? sentTo : email.trim();
    if (!address) return;
    setBusy(true);
    setProblem(null);
    const redirect = new URL("/auth/callback", window.location.origin);
    if (next) redirect.searchParams.set("next", next);
    const { error } = await createClient().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: redirect.toString() },
    });
    setBusy(false);
    setNow(Date.now());
    if (error) {
      const p = explain(error);
      setProblem(p);
      if (p.wait) setCooldown({ email: address, until: Date.now() + p.wait * 1000 });
      return;
    }
    setSentTo(address);
    setCode("");
    setCodeError("");
    setCooldown({ email: address, until: Date.now() + RESEND_SECONDS * 1000 });
    setView("sent");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\s/g, "");
    if (!/^\d{8}$/.test(token)) {
      setCodeError("驗證碼是信裡的 8 位數字，再確認一下？");
      return;
    }
    setBusy(true);
    setCodeError("");
    const { error } = await createClient().auth.verifyOtp({ email: sentTo, token, type: "email" });
    setBusy(false);
    if (error) {
      setCodeError("驗證碼不對或已經過期了。請確認是最新一封信裡的數字，或重新寄一次。");
      return;
    }
    const safeNext = safePath(next);
    window.location.href = safeNext;
  }

  const sendLabel = busy ? "寄送中…" : wait ? `${wait} 秒後可以再寄一次` : "寄登入連結給我";

  if (view === "sent") {
    return (
      <div className="grid gap-4">
        <div role="status" className="animate-pop rounded-2xl bg-sage-soft px-4 py-3 text-sage-ink">
          <p>
            登入信已寄到 <b className="break-all">{sentTo}</b>，去信箱看看吧 ♡
          </p>
          <p className="mt-1 text-sm">用這個瀏覽器點信裡的連結就能登入；換手機或換瀏覽器登入的話，請輸入信裡的驗證碼。</p>
        </div>

        <form onSubmit={verify} className="grid gap-2" noValidate>
          <label htmlFor="otp" className="font-medium">
            驗證碼
          </label>
          <div className="flex gap-2">
            <input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="8 位數字"
              aria-invalid={codeError ? true : undefined}
              aria-describedby={codeError ? "otp-error" : undefined}
              className="field min-w-0 flex-1 tracking-[0.3em] tabular-nums placeholder:tracking-normal"
            />
            <button type="submit" className="btn shrink-0" disabled={busy}>
              登入
            </button>
          </div>
          {codeError && (
            <p id="otp-error" role="alert" className="rounded-2xl bg-hint px-4 py-3 text-sm">
              {codeError}
            </p>
          )}
        </form>

        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy || wait > 0} onClick={send}>
            {wait ? `${wait} 秒後可以再寄一次` : "沒收到？再寄一次"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setView("form");
              setProblem(null);
            }}
          >
            信箱填錯了？重新輸入
          </button>
        </div>
        {problem && (
          <p role="alert" className="rounded-2xl bg-hint px-4 py-3 text-sm">
            {problem.text}
          </p>
        )}
        <p className="text-xs text-ink-soft">找不到信的話，看看垃圾郵件或促銷內容分類。</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="grid gap-4"
    >
      <label className="grid gap-1.5 font-medium">
        電子信箱
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setProblem(null);
          }}
          placeholder="you@example.com"
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? "send-error" : undefined}
          className="field"
        />
      </label>
      <button type="submit" className="btn" disabled={busy || wait > 0}>
        {sendLabel}
      </button>
      {problem && (
        <p id="send-error" role="alert" className="rounded-2xl bg-hint px-4 py-3">
          {problem.text}
        </p>
      )}
    </form>
  );
}
