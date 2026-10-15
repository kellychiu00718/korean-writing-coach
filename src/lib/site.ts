// 網站共用的聯絡方式與資料來源標示。landing（public/landing.html）是靜態頁，改這裡時記得一起改。

/** 網站專用信箱（Cloudflare Email Routing 轉寄到 Kelly 的信箱）；頁尾和隱私權政策會自動顯示。 */
export const CONTACT_EMAIL = "hello@writeitslowly.com";

export const PRIVACY_EFFECTIVE_DATE = "2026-10-15";

export const SOURCES = {
  nikl: {
    url: "https://www.korean.go.kr/front/reportData/reportDataView.do?mn_id=207&report_seq=932",
    license: "https://www.kogl.or.kr/info/license.do",
  },
  krdict: {
    url: "https://krdict.korean.go.kr",
    license: "https://creativecommons.org/licenses/by-sa/2.0/kr/",
  },
};
