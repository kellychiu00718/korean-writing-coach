import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BarList, GrowthChart } from "@/components/charts";
import { getProfile } from "@/lib/profile";
import { getStats, OUTCOME_LABEL, type RoundOutcome } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccount } from "./DeleteAccount";
import { ProfileForm } from "./ProfileForm";
import { SentenceBook } from "./SentenceBook";

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me");

  const profile = getProfile(user);
  const stats = await getStats(supabase, user.id);

  return (
    <>
      <AppHeader current="/me" />
      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-5">
        <section className="py-6 sm:py-10">
          <span className="eyebrow mb-3">我的</span>
          <h1 className="text-3xl font-bold sm:text-4xl">{profile.nickname ? `${profile.nickname}，歡迎回來` : "歡迎回來"}</h1>
          <p className="mt-2 text-ink-soft">這裡記錄下你慢慢累積了什麼。</p>
        </section>

        <section aria-labelledby="growth" className="mb-10">
          <h2 id="growth" className="mb-4 text-xl font-bold">
            我的進步
          </h2>
          <dl className="mb-5 grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "自己寫對的文法",
                value: stats.useCount,
                unit: "項",
                note: `練習題寫對 ${stats.practiceUseCount} 項＋句子裡順便用對 ${stats.useCount - stats.practiceUseCount} 項`,
              },
              { label: "寫過的句子", value: stats.sentenceCount, unit: "句", note: "每送出一次算一句，改寫也算" },
              {
                label: "自己改對的題目",
                value: stats.selfFixedCount,
                unit: "題",
                note: "第一次沒寫對，看了提示後自己改對，沒有看參考答案",
              },
            ].map((s) => (
              <div key={s.label} className="rounded-3xl border-2 border-ink bg-white px-5 py-4">
                <dt className="text-sm text-ink-soft">{s.label}</dt>
                <dd className="font-display text-3xl tabular-nums">
                  {s.value} <span className="font-sans text-base">{s.unit}</span>
                </dd>
                <dd className="mt-1 text-xs leading-5 text-ink-soft">{s.note}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-3 font-bold">自己寫對的文法，一點一點長出來</h3>
              <GrowthChart events={stats.learned.map((l) => ({ date: l.date, stamp: l.stamp, form: l.form }))} />
              {stats.learned.length > 0 && (
                <details className="group mt-4 text-sm">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-medium [&::-webkit-details-marker]:hidden">
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-open:rotate-90">
                      <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    詳細
                  </summary>
                  <ul className="mt-2 grid gap-2">
                    {[...stats.learned].reverse().map((l) => (
                      <li key={l.grammarId} className="rounded-2xl border-2 border-line bg-white px-3.5 py-2.5">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Link href={`/workshop/${l.grammarId}`} lang="ko" className="font-medium underline underline-offset-4">
                            {l.form}
                          </Link>
                          <span className="rounded-full border-2 border-line px-2 text-xs leading-5">{l.level} 級</span>
                          <span
                            className={`rounded-full px-2 text-xs leading-5 ${l.source === "practice" ? "bg-sage-soft text-sage-ink" : "bg-peach"}`}
                          >
                            {l.source === "practice" ? "練習題寫對" : "順便用對"}
                          </span>
                          <span className="ml-auto text-xs tabular-nums text-ink-soft">{l.stamp}</span>
                        </div>
                        {l.source === "practice" ? (
                          <>
                            <p className="text-xs text-ink-soft">練習這個文法時寫過的句子：</p>
                            <ul className="mt-0.5 grid gap-0.5">
                              {l.sentences.map((s) => (
                                <li key={s} lang="ko" className={s === l.evidence ? "font-medium text-sage-ink" : ""}>
                                  {s === l.evidence ? "✓ " : "・"}
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          l.evidence && (
                            <p>
                              <span className="text-xs text-ink-soft">用在這句：</span>
                              <span lang="ko">{l.evidence}</span>
                            </p>
                          )
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            <div className="grid content-start gap-5">
              <div className="card">
                <h3 className="mb-1 font-bold">每一題是第幾次寫對的</h3>
                <p className="mb-3 text-sm text-ink-soft">
                  {stats.roundCount ? `一共完成 ${stats.roundCount} 題，點一下長條可以看是哪些題目。` : "完成第一題後就會出現。"}
                </p>
                {stats.roundCount > 0 && (
                  <BarList
                    unit="題"
                    rows={(Object.keys(OUTCOME_LABEL) as RoundOutcome[]).map((k) => ({
                      label: OUTCOME_LABEL[k],
                      value: stats.outcomes[k],
                      items: stats.outcomeItems[k],
                    }))}
                  />
                )}
              </div>
              <div className="card">
                <h3 className="mb-1 font-bold">最常需要提示的地方</h3>
                <p className="mb-3 text-sm text-ink-soft">知道自己常在哪裡卡住，下次寫的時候就可以多留意。</p>
                {stats.topCategories.length ? (
                  <BarList
                    unit="次"
                    rows={stats.topCategories.map((c) => ({ label: c.category, value: c.count, items: c.items }))}
                  />
                ) : (
                  <p className="text-sm text-ink-soft">目前還沒有紀錄。</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="sentences" className="mb-10">
          <h2 id="sentences" className="mb-1 text-xl font-bold">
            我的句子本
          </h2>
          <p className="mb-4 text-ink-soft">這些都是你寫出來的句子。</p>
          {stats.rounds.length ? (
            <SentenceBook rounds={stats.rounds} />
          ) : (
            <p className="rounded-2xl bg-cream px-4 py-6 text-center text-ink-soft">
              還沒有句子。<Link href="/workshop" className="underline underline-offset-4">去句子工坊寫第一句</Link>吧！
            </p>
          )}
        </section>

        <section aria-labelledby="profile" className="mb-10 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card">
            <h2 id="profile" className="mb-4 text-xl font-bold">
              個人設定
            </h2>
            <p className="mb-4 text-sm text-ink-soft">
              目前登入的電子信箱：{profile.email}
              <br />
              登入不用密碼：每次都會寄一次性的登入連結到這個信箱，只有打得開這個信箱的人才登得進來。
            </p>
            <ProfileForm nickname={profile.nickname} interests={profile.interests} />
          </div>
          <div className="card self-start">
            <h2 className="mb-2 text-xl font-bold">刪除帳號</h2>
            <p className="mb-4 text-sm text-ink-soft">會一併刪除你寫過的句子和文法地圖。</p>
            <DeleteAccount />
          </div>
        </section>
      </main>
    </>
  );
}
