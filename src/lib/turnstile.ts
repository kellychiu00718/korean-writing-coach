import "server-only";

// 向 Cloudflare 確認 Turnstile 驗證碼。登入由 Supabase 自己驗證，這裡給意見回報等自己的 API 用。

export async function verifyTurnstile(request: Request, token: string | undefined, action: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // 本機沒放金鑰時放行；正式環境沒設定就一律擋下，避免防護默默失效
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    const result = (await res.json()) as { success: boolean; action?: string; hostname?: string };
    // 驗證碼要是為這個動作、在這個網站上取得的
    return result.success && result.action === action && result.hostname === new URL(request.url).hostname;
  } catch {
    return false;
  }
}
