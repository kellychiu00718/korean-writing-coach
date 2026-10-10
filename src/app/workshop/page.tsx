import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { TodayPractice } from "@/components/TodayPractice";
import { StateDot } from "@/components/StateDot";
import { CATEGORY_LABEL, displayForm, getLesson, grammar, STATE_LABEL } from "@/lib/grammar";
import { getProfile } from "@/lib/profile";
import { getProgressRows } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";

const LEVELS = [3, 4];

export default async function WorkshopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/workshop");
  const profile = getProfile(user);
  if (!profile.onboarded) redirect("/welcome");
  const rows = await getProgressRows(supabase, user.id);
  const progress = new Map(rows.map((r) => [r.grammarId, r.state]));

  return (
    <>
      <AppHeader current="/workshop" />
      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-5">
        <section className="py-6 sm:py-10">
          <span className="eyebrow mb-3">句子工坊</span>
          <h1 className="text-3xl font-bold sm:text-4xl">今天想練哪一個文法？</h1>
          <p className="mt-2 max-w-2xl text-ink-soft">
            挑一個文法，嘗試自己寫出韓文句子。AI 教練只會一層一層給線索，答案要靠自己一步步想出來。
          </p>
        </section>

        <TodayPractice rows={rows} interests={profile.interests} />

        {LEVELS.map((level) => {
          const items = grammar.filter((g) => g.level === level);
          const ready = items.filter((g) => getLesson(g.id));
          const upcoming = items.filter((g) => !getLesson(g.id));
          return (
            <section key={level} className="mb-12" aria-labelledby={`level-${level}`}>
              <h2 id={`level-${level}`} className="mb-4 text-xl font-bold">
                {level} 級 <span className="text-base font-normal text-ink-soft">（{items.length} 項文法）</span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ready.map((g) => {
                  const lesson = getLesson(g.id)!;
                  const state = progress.get(g.id);
                  return (
                    <li key={g.id}>
                      <Link
                        href={`/workshop/${g.id}`}
                        className="flex h-full flex-col gap-1 rounded-3xl border-2 border-ink bg-white p-5 transition-transform hover:-translate-y-0.5"
                      >
                        <span className="flex items-center justify-between gap-2 text-xs text-ink-soft">
                          {CATEGORY_LABEL[g.category] ?? g.category}
                          {state && state !== "seen" && (
                            <span className="inline-flex items-center gap-1.5">
                              <StateDot state={state} />
                              {STATE_LABEL[state]}
                            </span>
                          )}
                        </span>
                        <span lang="ko" className="text-xl">
                          {displayForm(g.form)}
                        </span>
                        <span className="text-sm text-ink-soft">{lesson.title_zh}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {upcoming.length > 0 && (
                <details className="mt-4 rounded-3xl border-2 border-dashed border-line bg-white/60 px-5 py-3">
                  <summary className="cursor-pointer text-sm text-ink-soft">
                    還在準備中的其餘 {upcoming.length} 項文法
                  </summary>
                  <p lang="ko" className="mt-2 text-sm leading-8 text-ink-soft">
                    {upcoming.map((g) => displayForm(g.form)).join("・")}
                  </p>
                </details>
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}
