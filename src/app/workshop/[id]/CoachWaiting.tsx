"use client";

import { useEffect, useState } from "react";
import { Mascot } from "@/components/Mascot";

// 等待時間越久，換一句說明，讓人知道教練還在看、沒有當掉。
const STAGES = [
  { after: 0, text: "教練在讀你的句子…" },
  { after: 2500, text: "正在檢查文法用得對不對…" },
  { after: 5500, text: "在想要給你哪一種提示…" },
  { after: 9000, text: "快好了，再等一下下…" },
  { after: 15000, text: "今天比較多人在問，再給教練一點時間～" },
];

// 等的時候順便看的寫作小提醒，都是中文母語者寫韓文常卡住的地方。
const TIPS = [
  "「-아서/어서」後面不能接命令或建議（-(으)세요、-(으)ㅂ시다），這時要改用「-(으)니까」。",
  "TOPIK 53、54 題要用「-다」結尾的書面語，例如 중요하다，不用「-아요/어요」。",
  "助詞要跟前面的名詞寫在一起：친구가、학교에서，中間不空格。",
  "「-(으)ㄹ 수 있다」的「수」要和前後分開寫：먹을 수 있다。",
  "上下文清楚的時候，韓文常常省略主語，不用每一句都寫「저는」。",
  "「은/는」常用來帶出話題或做對比，「이/가」常用來帶出新的資訊。",
  "公告、簡報、正式信件常用「-(스)ㅂ니다」；在泡泡上跟偶像聊天，用「-아요/어요」就很自然。",
  "「안」和「못」都是否定：「안」是不做，「못」是想做但沒辦法。",
  "韓文的逗號和句號用半形的「,」「.」，不用中文的全形標點。",
  "中文的「很」不一定要翻成 아주 或 매우，날씨가 좋아요 就已經很自然了。",
];

export function CoachWaiting() {
  const [elapsed, setElapsed] = useState(0);
  // 只在按下送出後才出現（不會在伺服器端渲染），所以可以直接隨機挑第一則
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length));

  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - start), 500);
    return () => clearInterval(t);
  }, []);

  // 每 6 秒自動換一則；按「再看一則」會從那一則重新計時
  useEffect(() => {
    const t = setTimeout(() => setTip((i) => (i + 1) % TIPS.length), 6000);
    return () => clearTimeout(t);
  }, [tip]);

  const stage = [...STAGES].reverse().find((s) => elapsed >= s.after)!;

  return (
    <div className="animate-pop grid gap-3 rounded-[32px] border-2 border-line bg-white p-4">
      <div className="relative h-9 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-1 border-b-2 border-dotted border-sage" />
        <div className="animate-stroll absolute inset-0">
          <div className="-ml-9 w-9">
            <div className="animate-step origin-bottom">
              <Mascot size={36} />
            </div>
          </div>
        </div>
      </div>
      <p role="status" className="font-medium">
        {stage.text}
      </p>
      <div className="rounded-2xl bg-cream px-4 py-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-xs text-ink-soft">等的時候看一下</span>
          <button
            type="button"
            onClick={() => setTip((i) => (i + 1) % TIPS.length)}
            className="-my-2 inline-flex min-h-11 items-center px-1 text-xs text-ink-soft underline underline-offset-4"
          >
            再看一則
          </button>
        </div>
        <p key={tip} className="animate-pop text-sm leading-6">
          {TIPS[tip]}
        </p>
      </div>
    </div>
  );
}
