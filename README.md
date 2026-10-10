# 慢慢寫 천천히 쓰기（暫名）

繁體中文介面的韓文寫作練習網站。核心理念：**先自己想，再讓 AI 陪你改。**

## MVP 功能

-   **句子工坊**（`/workshop`）：選文法 → 看情境 → 自己寫一句 → AI 教練分三層給提示（位置 → 線索 → 參考寫法）。第幾層由伺服器決定，參考寫法不會提早送到瀏覽器或存進資料庫。
-   **文法地圖**（`/map`）：國立國語院標準教育課程 1–6 級 336 項文法，狀態「看過 → 認得 → 會用」只升不降。照抄看過的參考寫法只算「認得」。
-   **Landing page**（`/landing.html`）

## 第一次設定

1.  使用 Node 22：`fnm use`（專案根目錄有 `.node-version`）
2.  `npm install`
3.  到 [supabase.com](https://supabase.com) 建一個免費專案：
    -   SQL Editor 貼上 `supabase/schema.sql` 執行
    -   Authentication → URL Configuration：Site URL 填 `http://localhost:3000`，Redirect URLs 加上 `http://localhost:3000/auth/callback`
4.  `cp .env.example .env.local`，填入 Supabase URL／anon key 和 `ANTHROPIC_API_KEY`
5.  `npm run dev`，打開 <http://localhost:3000>

## 資料庫設定（依序在 Supabase SQL Editor 執行）

1. `supabase/schema.sql`：練習紀錄與文法地圖
2. `supabase/002_delete_account.sql`：刪除帳號
3. `supabase/003_review_cards.sql`：複習字卡
4. `supabase/004_feedback.sql`：意見回報（在 Supabase 後台 Table Editor → `feedback` 查看）

## 上線前待辦

- `src/lib/site.ts` 的 `CONTACT_EMAIL` 填入網站專用信箱（頁尾與隱私權政策會顯示）
- 確認 Supabase 專案所在地區，更新 `src/app/privacy/page.tsx` 的「所在地」
- 隱私權政策是依網站實際資料流程擬的草稿，正式公開前建議請熟悉韓國／台灣個資法的人看過
- 部署平台（例如 Vercel）確定後，加進隱私權政策的委託處理表

## 補齊 3–4 級課程內容

目前手寫了 12 項（`src/data/lessons.json`），其餘用 Claude 草擬：

``` bash
node --env-file=.env.local scripts/draft-lessons.mjs --limit 5   # 先試 5 項看品質
node --env-file=.env.local scripts/draft-lessons.mjs             # 3–4 級全部
```

草擬的內容都是 `reviewed: false`，審核後改成 `true`。

## 資料來源

-   文法、詞彙分級：國立國語院〈2017년 국제 통용 한국어 표준 교육과정 적용 연구(4단계)〉어휘・문법 등급 목록（2020 修訂版）→ `src/data/grammar.json`、`src/data/vocab.json`。上線前再確認授權標示。

## 主要檔案

| 檔案 | 用途 |
|----|----|
| `src/lib/coach.ts` | Claude 回饋（結構化輸出、系統提示快取、分層揭露） |
| `src/app/api/coach/route.ts` | 驗證、每日次數上限、判斷第幾次送出、更新地圖 |
| `src/lib/progress.ts` | 文法地圖狀態只升不降 |
| `src/app/workshop/[id]/CoachPanel.tsx` | 寫句子與提示階梯的介面 |
| `supabase/schema.sql` | 資料表與 RLS |
