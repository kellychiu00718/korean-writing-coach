import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CONTACT_EMAIL, PRIVACY_EFFECTIVE_DATE } from "@/lib/site";

export const metadata: Metadata = { title: "隱私權政策｜慢慢寫" };

const ext = { target: "_blank", rel: "noopener" } as const;
const a = "underline underline-offset-2";

const COLLECTED = [
  { item: "Email", why: "寄送登入連結、辨識你的帳號", keep: "到你刪除帳號為止" },
  { item: "暱稱、感興趣的主題（選填）", why: "在「我的」頁面打招呼、依主題出情境題", keep: "到你刪除帳號為止" },
  {
    item: "你寫的句子、AI 回饋、文法地圖、複習字卡",
    why: "提供寫作練習、記錄你的進步",
    keep: "到你刪除帳號為止；複習字卡可以隨時自己移除",
  },
  { item: "意見回報的內容與回覆用 email（選填）", why: "回覆你、改善網站", keep: "收到後最多保存 1 年" },
  { item: "登入狀態（cookie）", why: "讓你不用每次都重新登入", keep: "登出或過期後失效" },
];

const PROCESSORS = [
  {
    name: "Supabase Inc.",
    task: "會員登入與資料庫（存放上面列的資料）",
    where: "新加坡或日本的資料中心",
    data: "上表所有項目",
  },
  {
    name: "Anthropic PBC",
    task: "AI 教練：產生句子回饋",
    where: "美國",
    data: "你送出的句子、題目情境與文法（不包含 email 和暱稱）",
  },
  {
    name: "Google LLC（Google Fonts）",
    task: "提供網站字型",
    where: "美國等地",
    data: "瀏覽器在下載字型時會送出的 IP 位址與瀏覽器資訊",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5">
      <div className="mb-8">
        <Logo href="/landing.html" />
      </div>
      <article className="grid gap-8 text-[15.5px]">
        <header>
          <span className="eyebrow mb-3">隱私權政策</span>
          <h1 className="text-3xl font-bold">我們怎麼處理你的資料</h1>
          <p className="mt-2 text-ink-soft">
            慢慢寫只收集提供練習所需要的資料，不放廣告、不做追蹤分析，也不會把你的資料賣給任何人。以下依韓國《個人資訊保護法》第 30
            條與台灣《個人資料保護法》的告知要求整理。
          </p>
          <p className="mt-1 text-sm text-ink-soft">生效日期：{PRIVACY_EFFECTIVE_DATE}（韓國時間）</p>
        </header>

        <section>
          <h2 className="mb-2 text-xl font-bold">1. 收集哪些資料、為什麼、保存多久</h2>
          <div className="overflow-x-auto rounded-2xl border-2 border-line bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-cream">
                <tr>
                  <th className="px-4 py-2 font-medium">資料</th>
                  <th className="px-4 py-2 font-medium">用途</th>
                  <th className="px-4 py-2 font-medium">保存期間</th>
                </tr>
              </thead>
              <tbody>
                {COLLECTED.map((r) => (
                  <tr key={r.item} className="border-t border-line align-top">
                    <td className="px-4 py-2">{r.item}</td>
                    <td className="px-4 py-2">{r.why}</td>
                    <td className="px-4 py-2">{r.keep}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            另外，瀏覽器會在你自己的裝置上記住「開場動畫是否已經播過」，這份紀錄不會傳給我們。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold">2. 委託處理與資料傳送到國外</h2>
          <p className="mb-3">
            慢慢寫由個人經營，以下服務會代為處理部分資料。除了這些服務與法律要求的情況以外，我們不會把你的資料提供給其他人。
          </p>
          <div className="overflow-x-auto rounded-2xl border-2 border-line bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-cream">
                <tr>
                  <th className="px-4 py-2 font-medium">服務</th>
                  <th className="px-4 py-2 font-medium">處理內容</th>
                  <th className="px-4 py-2 font-medium">所在地</th>
                  <th className="px-4 py-2 font-medium">傳送的資料</th>
                </tr>
              </thead>
              <tbody>
                {PROCESSORS.map((p) => (
                  <tr key={p.name} className="border-t border-line align-top">
                    <td className="px-4 py-2">{p.name}</td>
                    <td className="px-4 py-2">{p.task}</td>
                    <td className="px-4 py-2">{p.where}</td>
                    <td className="px-4 py-2">{p.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            資料會在你使用功能的當下透過加密連線傳送。依 Anthropic 的說明，透過 API 傳送的內容預設不會被用來訓練模型（
            <a href="https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training" {...ext} className={a}>
              Anthropic 隱私中心
            </a>
            ）。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold">3. 你的權利</h2>
          <ul className="grid list-disc gap-1 pl-5">
            <li>查詢與更正：在「我的」頁面可以看到並修改暱稱與感興趣的主題。</li>
            <li>
              刪除：在「我的」頁面按「刪除帳號」，你的 email、寫過的句子、文法地圖和複習字卡會立刻全部刪除，無法復原。
            </li>
            <li>其他要求（例如想取得一份自己的資料、停止某項處理）：請用下方的聯絡方式告訴我們，我們會盡快處理。</li>
          </ul>
          <p className="mt-2">本網站不提供給 14 歲以下的兒童使用。</p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold">4. 我們怎麼保護資料</h2>
          <ul className="grid list-disc gap-1 pl-5">
            <li>全站使用加密連線（HTTPS）。</li>
            <li>資料庫設定為每個人只能讀取自己的資料。</li>
            <li>只收集必要的資料；登入不需要密碼，所以我們不保存任何密碼。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold">5. 個人資料保護負責人與聯絡方式</h2>
          <p>負責人：Kelly（網站作者）</p>
          <p>
            聯絡方式：
            {CONTACT_EMAIL ? (
              <a href={`mailto:${CONTACT_EMAIL}`} className={a}>
                {CONTACT_EMAIL}
              </a>
            ) : (
              <span>（網站專用信箱準備中）</span>
            )}
            ，或使用
            <Link href="/feedback" className={a}>
              意見回報表單
            </Link>
            。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold">6. 政策變更</h2>
          <p>內容有變更時，會更新這一頁的生效日期；影響較大的變更，會在網站上另外通知。</p>
        </section>
      </article>
    </main>
  );
}
