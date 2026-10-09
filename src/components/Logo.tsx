import Link from "next/link";
import { Mascot } from "@/components/Mascot";

// 腳底在圖的 174/200 高度；文字字形底部到行框底部約 2.34px（20px Noto Sans TC 實測）。
const FEET_GAP = 1 - 174 / 200;
const GLYPH_GAP = 2.34;

/** 吉祥物＋「慢慢寫」，文字底部對齊烏龜的腳。 */
export function Logo({ href, size = 40 }: { href: string; size?: number }) {
  return (
    <Link href={href} className="inline-flex items-end gap-1.5 font-display text-xl leading-none no-underline">
      <Mascot size={size} />
      <span style={{ paddingBottom: size * FEET_GAP - GLYPH_GAP }}>慢慢寫</span>
    </Link>
  );
}
