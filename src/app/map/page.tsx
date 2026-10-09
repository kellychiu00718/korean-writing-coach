import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { StateDot } from "@/components/StateDot";
import { displayForm, getLesson, grammar, STATE_LABEL, type ProgressState } from "@/lib/grammar";
import { getProgress } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";

const CHIP: Record<ProgressState | "none", string> = {
  none: "border-line bg-white text-ink-soft",
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
            依國立國語院標準教育課程，1–6 級共 {grammar.length} 項。只有在你自己寫的句子裡用對了，格子才會變成「會用」；休息幾天也不會消失。
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm" aria-label="圖例">
            {(["seen", "know", "use"] as const).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <StateDot state={s} />
                {s === "use" ? "自己寫出來且用對" : STATE_LABEL[s]}
              </span>
            ))}
          </div>
        </section>

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
                  {items.length} 項中，會用 {counts.use}・認得 {counts.know}・看過 {counts.seen}
                </p>
              </div>
              <ul lang="ko" className="flex flex-wrap gap-2">
                {items.map((g) => {
                  const state = progress.get(g.id);
                  const label = `${displayForm(g.form)}：${state ? STATE_LABEL[state] : "還沒遇到"}`;
                  const cls = `inline-block rounded-full border-2 px-3.5 py-1.5 ${CHIP[state ?? "none"]}`;
                  return (
                    <li key={g.id}>
                      {getLesson(g.id) ? (
                        <Link href={`/workshop/${g.id}`} aria-label={label} className={`${cls} hover:-translate-y-0.5`}>
                          {displayForm(g.form)}
                        </Link>
                      ) : (
                        <span aria-label={label} className={cls}>
                          {displayForm(g.form)}
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
          文法分級參考：國立國語院〈국제 통용 한국어 표준 교육과정 적용 연구(4단계)〉文法等級目錄（2017，2020 修訂）。
        </p>
      </main>
    </>
  );
}
