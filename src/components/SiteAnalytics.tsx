"use client";

import { Analytics } from "@vercel/analytics/next";

// Vercel 網站分析：只記匿名的頁面瀏覽（不用 cookie、不認得是誰）。
// 網址的查詢參數一律拿掉再送出，登入連結裡的 ?code= 之類不會被記到。
export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        url.search = "";
        return { ...event, url: url.toString() };
      }}
    />
  );
}
