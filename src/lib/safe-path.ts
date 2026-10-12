/**
 * 登入後要導回的頁面只接受站內路徑。
 * - 「//evil.com」「/\evil.com」瀏覽器都會當成別的網站。
 * - 瀏覽器解析網址時會刪掉 tab 和換行，所以「/<tab>/evil.com」也會變成「//evil.com」。
 * 所以先拒絕任何空白和控制字元，再實際用 URL 解析一次，確認解析後還是同一個網站，才放行。
 */
export function safePath(next: string | null | undefined, fallback = "/workshop") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  // 空白、控制字元（含 tab、換行）一律不收
  if (/[\s\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const base = "https://same.origin";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
