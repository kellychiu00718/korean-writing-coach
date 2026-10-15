import type { Metadata } from "next";
import { headers } from "next/headers";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "慢慢寫 천천히 쓰기",
  description: "先自己想，再讓 AI 陪你改。給想把韓文寫得像自己的你。",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // 讀請求標頭讓每一頁都在請求時產生，Next.js 才能把 middleware 給的 CSP nonce 加到自己的腳本上
  await headers();
  return (
    // 瀏覽器擴充功能（例如 Grammarly）會在 html、body 上加屬性，造成 hydration 警告；只忽略這兩層的屬性差異。
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Jua&family=Noto+Sans+TC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <SiteFooter />
        <SiteAnalytics />
      </body>
    </html>
  );
}
