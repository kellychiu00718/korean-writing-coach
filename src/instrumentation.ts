import type { Instrumentation } from "next";

/** 伺服器上任何頁面或 API 出錯時（使用者會看到錯誤畫面的那種），寄信通知。 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { sendAlert } = await import("@/lib/alert");
  const err = error as Error & { digest?: string };
  const path = request.path.split("?")[0];
  await sendAlert(`${context.routePath}:${err.message}`, `伺服器錯誤：${context.routePath}`, [
    `路徑：${request.method} ${path}`,
    `類型：${context.routeType}`,
    `錯誤：${err.name}: ${err.message}`,
    err.digest ? `編號（digest）：${err.digest}` : "",
  ].filter(Boolean));
};
