import type { NextConfig } from "next";

// 每個頁面都加上的安全標頭
const securityHeaders = [
  // 不讓別的網站把這裡嵌進 iframe（防止點擊劫持）
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
