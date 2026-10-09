import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BarList, GrowthChart } from "@/components/charts";
import { displayForm, getGrammar } from "@/lib/grammar";
import { getProfile } from "@/lib/profile";
import { getStats, OUTCOME_LABEL, type RoundOutcome } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccount } from "./DeleteAccount";
import { ProfileForm } from "./ProfileForm";

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me");

  const profile = getProfile(user);
  const stats = await getStats(supabase, user.id);
  const rounds = Object.values(stats.outcomes).reduce((a, b) => a + b, 0);

  return (
    <>
      <AppHeader current="/me" />
      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-5">
        <section className="py-6 sm:py-10">
          <span className="eyebrow mb-3">我的</span>
          <h1 className="text-3xl font-bold sm:text-4xl">{profile.nickname ? `${profile.nickname}，歡迎回來` : "歡迎回來"}</h1>
          <p className="mt-2 text-ink-soft">這裡記錄的是你自己寫出來的東西，不比速度，只看你慢慢累積了什麼。</p>
        </section>

        <section aria-labelledby="growth" className="mb-10">
          <h2 id="growth" className="mb-4 text-xl font-bold">
            我的進步
          </h2>
          <dl className="mb-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "會用的文法", value: stats.useCount, unit: "項" },
              { label: "寫過的句子", value: stats.sentenceCount, unit: "句" },
              { label: "練習過的日子", value: stats.practiceDays, unit: "天" },
            ].map((s) => (
              <div key={s.label} className="rounded-3xl border-2 border-ink bg-white px-5 py-4">
                <dt className="text-sm text-ink-soft">{s.label}</dt>
                <dd className="font-display text-3xl tabular-nums">
                  {s.value} <span className="font-sans text-base">{s.unit}</span>
                </dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-3 font-bold">會用的文法，一天一天長出來</h3>
              <GrowthChart points={stats.growth} />
              {stats.growth.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-ink-soft">看數字</summary>
                  <table className="mt-2 w-full text-left">
                    <thead>
                      <tr className="text-ink-soft">
                        <th className="font-normal">日期</th>
                        <th className="font-normal">累積會用</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {stats.growth.map((p) => (
                        <tr key={p.date}>
                          <td>{p.date}</td>
                          <td>{p.total} 項</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
            </div>

            <div className="grid gap-5">
              <div className="card">
                <h3 className="mb-1 font-bold">每一題是第幾次寫對的</h3>
                <p className="mb-3 text-sm text-ink-soft">
                  {rounds ? `一共完成 ${rounds} 題。` : "完成第一題後就會出現。"}
                </p>
                {rounds > 0 && (
                  <BarList
                    unit="題"
                    rows={(Object.keys(OUTCOME_LABEL) as RoundOutcome[]).map((k) => ({
                      label: OUTCOME_LABEL[k],
                      value: stats.outcomes[k],
                    }))}
                  />
                )}
              </div>
              <div className="card">
                <h3 className="mb-1 font-bold">最常需要提示的地方</h3>
                <p className="mb-3 text-sm text-ink-soft">知道自己常卡在哪，下次寫的時候就會多留意。</p>
                {stats.topCategories.length ? (
                  <BarList unit="次" rows={stats.topCategories.map((c) => ({ label: c.category, value: c.count }))} />
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
          <p className="mb-4 text-ink-soft">這些都是你自己寫對的句子。</p>
          {stats.solvedSentences.length ? (
            <ul className="grid gap-2">
              {stats.solvedSentences.map((s, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border-2 border-line bg-white px-4 py-3">
                  <span lang="ko" className="text-lg">
                    {s.sentence}
                  </span>
                  <span className="text-sm text-ink-soft">
                    <Link href={`/workshop/${s.grammarId}`} lang="ko" className="underline underline-offset-4">
                      {displayForm(getGrammar(s.grammarId)?.form ?? "")}
                    </Link>
                    ・{s.date}
                  </span>
                </li>
              ))}
            </ul>
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
              登入 email：{profile.email}
              <br />
              這裡用 email 登入連結，沒有密碼，所以不用記也不用改密碼。
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
