import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { StateDot } from "@/components/StateDot";
import { displayForm, getLesson, grammar, NONE_LABEL, STATE_DEFINITION, STATE_LABEL, type ProgressState } from "@/lib/grammar";
import { AlmostThere } from "@/components/AlmostThere";
import { getProgress } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";

const CHIP: Record<ProgressState | "none", string> = {
  none: "border-ink border-dashed bg-white",
  seen: "border-ink border-dashed bg-white",
  know: "border-ink bg-peach",
  use: "border-ink bg-sage",
};

export default async function MapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/map");
  const progress = await getProgress(supabase, user.id);

  const useCount = [...progress.values()].filter((s) => s === "use").length;

  return (
    <>
      <AppHeader current="/map" />
      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-5">
        <section className="py-6 sm:py-10">
          <span className="eyebrow mb-3">文法地圖</span>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {useCount > 0 ? `你已經能自己寫出 ${useCount} 項文法` : "你的地圖從第一句開始亮起來"}
          </h1>
          <p className="mt-2 max-w-2xl text-ink-soft">
            依韓國國立國語院標準教育課程，韓檢 1–6 級總共 {grammar.length} 項文法。
            <br />
            只有靠自己將文法寫出來應用在句子裡面，格子才會標示成綠色；
            <br />
            這裡不追求快速達標，累了就休息，隨時歡迎回來，慢慢來，沒關係的。
          </p>
          <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-3" aria-label="圖例">
            {(["seen", "know", "use"] as const).map((s) => (
              <div key={s} className="rounded-2xl border-2 border-line bg-white px-4 py-2.5">
                <dt className="inline-flex items-center gap-1.5 font-bold">
                  <StateDot state={s} />
                  {STATE_LABEL[s]}
                </dt>
                <dd className="text-ink-soft">{STATE_DEFINITION[s]}</dd>
              </div>
            ))}
          </dl>
        </section>

        <AlmostThere progress={progress} />

        {[1, 2, 3, 4, 5, 6].map((level) => {
          const items = grammar.filter((g) => g.level === level);
          const counts = { seen: 0, know: 0, use: 0 };
          for (const g of items) {
            const s = progress.get(g.id);
            if (s) counts[s]++;
          }
          return (
            <section key={level} className="mb-10" aria-labelledby={`map-${level}`}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`map-${level}`} className="text-xl font-bold">
                  {level} 級
                </h2>
                <p className="text-sm text-ink-soft">
                  {items.length} 項文法中，自己寫出來且用對 {counts.use}・大概知道 {counts.know}・尚未學習 {items.length - counts.use - counts.know}
                </p>
              </div>
              <ul lang="ko" className="flex flex-wrap gap-2">
                {items.map((g) => {
                  const state = progress.get(g.id);
                  const label = `${displayForm(g.form)}：${state ? STATE_LABEL[state] : NONE_LABEL}`;
                  const cls = `inline-block rounded-full border-2 px-3.5 py-1.5 ${CHIP[state ?? "none"]}`;
                  return (
                    <li key={g.id}>
                      {getLesson(g.id) ? (
                        <Link href={`/workshop/${g.id}`} aria-label={label} className={`${cls} transition-transform hover:-translate-y-0.5`}>
                          {displayForm(g.form)}
                        </Link>
                      ) : (
                        <span className={cls}>
                          {displayForm(g.form)}
                          <span className="sr-only">：{state ? STATE_LABEL[state] : NONE_LABEL}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        <p className="text-xs text-ink-soft">
          本網站的文法、詞彙分級，使用國立國語院於 2017 年以
          <a href="https://www.kogl.or.kr/info/license.do" target="_blank" rel="noopener" className="underline underline-offset-2">
            公共누리 제1유형
          </a>
          開放的〈국제 통용 한국어 표준 교육과정 적용 연구(4단계)〉어휘・문법 등급 목록（2020 修訂版），原始資料可在
          <a
            href="https://www.korean.go.kr/front/reportData/reportDataView.do?mn_id=207&report_seq=932"
            target="_blank"
            rel="noopener"
            className="underline underline-offset-2"
          >
            國立國語院網站
          </a>
          免費下載。
        </p>
      </main>
    </>
  );
}
