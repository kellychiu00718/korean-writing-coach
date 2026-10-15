import type { NextConfig } from "next";

// 每個頁面都加上的安全標頭（網站頁面的 CSP 由 middleware 每次產生 nonce 後加上）
const securityHeaders = [
  // 不讓別的網站把這裡嵌進 iframe（防止點擊劫持）
  { key: "X-Frame-Options", value: "DENY" },
  // 瀏覽器不要自己猜檔案類型
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 連到別的網站時只帶網域，不帶完整網址（網址裡可能有登入用的參數）
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 用不到的裝置權限一律關閉
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // 上線後只走 HTTPS
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

// 網站介紹（/about，實際檔案是 public/landing.html）是靜態檔，不經過 middleware，用固定的 CSP：腳本只能來自網站本身（/landing.js），不允許內嵌腳本
const landingCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/about", headers: [{ key: "Content-Security-Policy", value: landingCsp }] },
    ];
  },
  // 網站介紹的網址是 /about；舊網址 /landing.html 轉過來，已經分享出去的連結不會壞
  async redirects() {
    return [{ source: "/landing.html", destination: "/about", permanent: true }];
  },
  async rewrites() {
    return [{ source: "/about", destination: "/landing.html" }];
  },
};

export default nextConfig;
