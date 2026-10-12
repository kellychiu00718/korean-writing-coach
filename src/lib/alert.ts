import "server-only";

/**
 * 出錯時寄信通知 Kelly（用 Resend 的 API）。
 * 需要環境變數 RESEND_API_KEY、ALERT_EMAIL_TO、ALERT_EMAIL_FROM；沒設定就只寫進伺服器紀錄。
 * 同一種錯誤 10 分鐘內只寄一次，避免被同一個問題洗信箱。信裡只放錯誤訊息和網址路徑，不放使用者寫的內容。
 */
const lastSent = new Map<string, number>();
const QUIET_MS = 10 * 60 * 1000;

export async function sendAlert(key: string, subject: string, lines: string[]) {
  console.error(`[alert] ${subject}\n${lines.join("\n")}`);
  const { RESEND_API_KEY, ALERT_EMAIL_TO, ALERT_EMAIL_FROM } = process.env;
  if (!RESEND_API_KEY || !ALERT_EMAIL_TO || !ALERT_EMAIL_FROM) return;
  const now = Date.now();
  if (now - (lastSent.get(key) ?? 0) < QUIET_MS) return;
  lastSent.set(key, now);
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: ALERT_EMAIL_FROM,
        to: ALERT_EMAIL_TO,
        subject: `[慢慢寫] ${subject}`,
        text: [...lines, "", `時間（UTC）：${new Date(now).toISOString()}`].join("\n"),
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // 通知寄不出去也不能讓網站跟著出錯
  }
}
