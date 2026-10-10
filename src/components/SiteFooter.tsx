import Link from "next/link";
import { CONTACT_EMAIL, SOURCES } from "@/lib/site";

const ext = { target: "_blank", rel: "noopener" } as const;
const link = "underline underline-offset-2 hover:text-ink";

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-5xl px-4 pt-6 pb-12 text-center text-xs leading-6 text-ink-soft sm:px-5">
      <nav aria-label="網站資訊" className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
        <span className="font-display text-base text-ink">慢慢寫</span>
        <Link href="/feedback" className={link}>
          意見回報
        </Link>
        <Link href="/privacy" className={link}>
          隱私權政策
        </Link>
        {CONTACT_EMAIL && (
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            {CONTACT_EMAIL}
          </a>
        )}
      </nav>
      <p>
        文法、詞彙分級使用國立國語院於 2017 年以
        <a href={SOURCES.nikl.license} {...ext} className={link}>
          公共누리 제1유형
        </a>
        開放的〈국제 통용 한국어 표준 교육과정 적용 연구(4단계)〉어휘・문법 등급 목록，原始資料可在
        <a href={SOURCES.nikl.url} {...ext} className={link}>
          國立國語院網站
        </a>
        免費下載。
      </p>
      <p>
        韓文單字釋義與例句引用自國立國語院
        <a href={SOURCES.krdict.url} {...ext} className={link}>
          《한국어기초사전》
        </a>
        ，依{" "}
        <a href={SOURCES.krdict.license} {...ext} className={link}>
          CC BY-SA 2.0 KR
        </a>{" "}
        授權使用；中文解說為本站自行撰寫。
      </p>
    </footer>
  );
}
