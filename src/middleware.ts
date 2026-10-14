import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/workshop", "/dictation", "/map", "/me", "/welcome", "/review"];

function isProtected(path: string) {
  return PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * 內容安全政策（CSP）：每次請求產生一次性的 nonce，只有帶著這個 nonce 的腳本能執行
 * （Next.js 會自動把 nonce 加到自己的腳本上），被塞進頁面的惡意腳本跑不起來。
 * 樣式允許行內（React 的 style 屬性需要）；字型來自 Google Fonts；資料連線只到自己和 Supabase。
 * Cloudflare Turnstile（防機器人）要載入它的腳本和一個驗證框。
 */
function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV !== "production";
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseWs = supabase.replace(/^https:/, "wss:");
  return [
    "default-src 'self'",
    // 開發模式的熱更新需要 eval；正式環境不開
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    `connect-src 'self' ${supabase} ${supabaseWs}`.trim(),
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/** 把 CSP 加到請求（讓 Next.js 讀到 nonce）和回應上 */
function withCsp(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  return { headers, csp };
}

function toLogin(request: NextRequest) {
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

/** 只在本機開發用的頁面：正式環境一律 404（頁面裡也有檢查，這裡連標題都不送出） */
const DEV_ONLY = ["/dictation/pending"];

export async function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === "production" && DEV_ONLY.includes(request.nextUrl.pathname)) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { headers, csp } = withCsp(request);
  const next = () => {
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };
  // 還沒設定 Supabase：需要登入的頁面先導到登入頁，那裡會顯示設定說明。
  if (!url || !key) return isProtected(request.nextUrl.pathname) ? toLogin(request) : next();

  let response = next();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // 更新過的 cookie 也要帶進轉給頁面的請求標頭（標頭是另外複製的一份）
        headers.set("cookie", request.cookies.toString());
        response = next();
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(request.nextUrl.pathname)) return toLogin(request);
  return response;
}

export const config = {
  // 靜態檔（圖片、音檔、landing 頁和它的腳本）不需要登入檢查，也不經過這裡，載入比較快
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|landing.html|landing.js|audio/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|m4a|wav|js|css|woff2?|txt|xml)$).*)",
  ],
};
