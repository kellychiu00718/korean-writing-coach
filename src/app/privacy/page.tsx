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
      <article className="grid min-w-0 grid-cols-1 gap-8 text-[15.5px] [&>*]:min-w-0">
        <header>
          <span className="eyebrow mb-3">隱私權政策</span>
          <h1 className="text-3xl font-bold">我們怎麼處理你的資料</h1>
          <p className="mt-2 text-ink-soft">
            慢慢寫只收集提供練習需要的資料：不放廣告、不做追蹤分析，也不會把你的資料賣給任何人。這份政策依台灣《個人資料保護法》第 8
            條規定的告知事項撰寫；因為網站在韓國經營，也參考了韓國《個人資訊保護法》第 30 條的公開要求。
          </p>
          <p className="mt-1 text-sm text-ink-soft">生效日期：{PRIVACY_EFFECTIVE_DATE}（韓國時間）</p>
        </header>

        <section>
          <h2 className="mb-2 text-xl font-bold">1. 誰在收集你的資料</h2>
          <p>慢慢寫是由個人經營的網站，負責人是 Kelly（網站作者）。聯絡方式寫在第 8 點。</p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold">2. 收集哪些資料、為什麼、保存多久</h2>
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
          <h2 className="mb-2 text-xl font-bold">3. 資料會在哪裡、由誰、怎麼使用</h2>
          <p className="mb-3">
            資料只用在第 2 點寫的用途，使用期間就是表格裡的保存期間。除了下面這些代為處理的服務，以及法律要求的情況以外，我們不會把你的資料提供給其他人。這些服務位在台灣以外的地區，所以資料會被傳送到國外處理：
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
            資料會在你使用功能的當下透過加密連線傳送。AI 回饋由程式自動產生，不會有人工逐句閱讀你的句子，除非你透過意見回報主動提供。依
            Anthropic 的說明，透過 API 傳送的內容預設不會被用來訓練模型（
            <a href="https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training" {...ext} className={a}>
              Anthropic 隱私中心
            </a>
            ）。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold">4. 你的權利</h2>
          <p className="mb-2">依台灣《個人資料保護法》第 3 條，你可以對自己的資料提出以下要求：</p>
          <ul className="grid list-disc gap-1 pl-5">
            <li>查詢或閱覽：在「我的」頁面可以看到你的 email、暱稱、感興趣的主題、寫過的句子和進步紀錄。</li>
            <li>製給複製本：想要一份自己全部資料的檔案，請用第 8 點的聯絡方式告訴我們。</li>
            <li>補充或更正：在「我的」頁面可以直接修改暱稱與感興趣的主題。</li>
            <li>停止收集、處理或使用：請用第 8 點的聯絡方式告訴我們。</li>
            <li>
              刪除：在「我的」頁面按「刪除帳號」，你的 email、寫過的句子、文法地圖和複習字卡會立刻全部刪除，無法復原。
            </li>
          </ul>
          <p className="mt-2">
            透過聯絡方式提出的查詢、閱覽或複製本要求，我們會在 15 天內回覆；補充、更正、停止使用或刪除的要求，會在 30 天內處理完成。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold">5. 不提供資料會怎樣</h2>
          <ul className="grid list-disc gap-1 pl-5">
            <li>Email 是登入需要的，沒有 email 就無法使用句子工坊、文法地圖等需要登入的功能。</li>
            <li>暱稱、感興趣的主題、意見回報的回覆用 email 都是選填，不填也能正常使用。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold">6. 我們怎麼保護資料</h2>
          <ul className="grid list-disc gap-1 pl-5">
            <li>全站使用加密連線（HTTPS）。</li>
            <li>資料庫設定為每個人只能讀取自己的資料。</li>
            <li>只收集必要的資料；登入不需要密碼，所以我們不保存任何密碼。</li>
            <li>萬一發生資料外洩，我們會在查明後盡快通知受影響的使用者，並說明處理方式。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold">7. 兒童</h2>
          <p>本網站不提供給 14 歲以下的兒童使用。</p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold">8. 聯絡方式</h2>
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
          <h2 className="mb-2 text-xl font-bold">9. 政策變更</h2>
          <p>內容有變更時，會更新這一頁的生效日期；影響較大的變更，會在網站上另外通知。</p>
        </section>
      </article>
    </main>
  );
}
