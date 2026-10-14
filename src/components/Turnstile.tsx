"use client";

import { useCallback, useRef } from "react";

// Cloudflare Turnstile：確認送出的是真人。平常看不到，只有可疑時才會出現要點一下的框。
// 驗證碼只能用一次，所以每次送出前都重新取一張。

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const TURNSTILE_FAILED = "沒辦法確認你是真人，重新整理頁面再試一次？";

let scriptPromise: Promise<TurnstileApi> | null = null;
function loadScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile script failed"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

type Pending = { resolve: (token: string) => void; reject: (e: Error) => void };

/**
 * 回傳要接在空 <div> 上的 ref，以及送出前呼叫的 getToken()。
 * ref 是 callback ref：畫面切換時 div 換了，驗證框也會跟著搬過去。
 * 沒設定 site key（例如本機沒放金鑰）時 getToken() 回傳 null，由伺服器決定要不要放行。
 */
export function useTurnstile(action: string) {
  const widget = useRef<string | null>(null);
  const pending = useRef<Pending | null>(null);

  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (!SITE_KEY || !el) return;
      let cancelled = false;
      loadScript()
        .then((api) => {
          if (cancelled) return;
          widget.current = api.render(el, {
            sitekey: SITE_KEY,
            action,
            execution: "execute",
            appearance: "interaction-only",
            theme: "light",
            language: "zh-tw",
            callback: (token: string) => pending.current?.resolve(token),
            "error-callback": () => pending.current?.reject(new Error("turnstile error")),
          });
        })
        .catch(() => {});
      return () => {
        cancelled = true;
        if (widget.current) window.turnstile?.remove(widget.current);
        widget.current = null;
      };
    },
    [action],
  );

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!SITE_KEY) return null;
    const api = await loadScript();
    // 剛載入頁面就按送出時，驗證框可能還沒畫好，稍等一下
    for (let i = 0; i < 50 && !widget.current; i++) await new Promise((r) => setTimeout(r, 100));
    const id = widget.current;
    if (!id) throw new Error("turnstile not ready");
    api.reset(id);
    return new Promise<string>((resolve, reject) => {
      const done = () => {
        clearTimeout(timer);
        pending.current = null;
      };
      // 需要使用者點一下的話會等比較久，給 60 秒
      const timer = setTimeout(() => {
        done();
        reject(new Error("turnstile timeout"));
      }, 60_000);
      pending.current = {
        resolve: (token) => {
          done();
          resolve(token);
        },
        reject: (e) => {
          done();
          reject(e);
        },
      };
      api.execute(id);
    });
  }, []);

  return { ref, getToken };
}
