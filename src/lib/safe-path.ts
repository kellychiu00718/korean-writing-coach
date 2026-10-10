/**
 * 登入後要導回的頁面只接受站內路徑。
 * 「//evil.com」和「/\evil.com」瀏覽器都會當成別的網站，所以一律擋掉，改回句子工坊。
 */
export function safePath(next: string | null | undefined, fallback = "/workshop") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
