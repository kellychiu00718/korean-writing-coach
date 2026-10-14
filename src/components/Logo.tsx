import Link from "next/link";
import { Mascot } from "@/components/Mascot";

// 腳底在圖的 174/200 高度；文字字形底部到行框底部約 0.117em（20px Noto Sans TC 實測 2.34px）。
const FEET_GAP = 1 - 174 / 200;
const GLYPH_GAP_EM = 0.117;

/** 吉祥物＋文字，文字底部對齊烏龜的腳。 */
export function MascotLockup({
  size,
  textPx,
  children,
}: {
  size: number;
  textPx: number;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-end gap-1.5 font-display leading-none" style={{ fontSize: textPx }}>
      <Mascot size={size} />
      <span style={{ paddingBottom: size * FEET_GAP - textPx * GLYPH_GAP_EM }}>{children}</span>
    </span>
  );
}

export function Logo({ href, size = 40 }: { href: string; size?: number }) {
  // landing.html 是靜態檔，不是 Next.js 頁面；用 <Link> 會去預先載入一個不存在的頁面資料（404）
  const Tag = href.endsWith(".html") ? "a" : Link;
  return (
    <Tag href={href} className="inline-flex no-underline">
      <MascotLockup size={size} textPx={20}>
        慢慢寫
      </MascotLockup>
    </Tag>
  );
}
