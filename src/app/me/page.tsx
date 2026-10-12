import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { getProfile } from "@/lib/profile";
import { getDictationStats } from "@/lib/dictation-stats";
import { getStats } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccount } from "./DeleteAccount";
import { DictationProgress } from "./DictationProgress";
import { ProfileForm } from "./ProfileForm";
import { ProgressDashboard } from "./ProgressDashboard";
import { ProgressTabs } from "./ProgressTabs";
import { SentenceBook } from "./SentenceBook";

export default async function MePage({ searchParams }: { searchParams: Promise<{ progress?: string }> }) {
  const initialTab = (await searchParams).progress === "dictation" ? "dictation" : "workshop";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me");

  const profile = getProfile(user);
  const [stats, dictation] = await Promise.all([getStats(supabase, user.id), getDictationStats(supabase, user.id)]);

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
          <ProgressTabs
            initial={initialTab}
            workshop={
              <ProgressDashboard
                learned={stats.learned}
                practiceUseCount={stats.practiceUseCount}
                sentenceCount={stats.sentenceCount}
                roundCount={stats.roundCount}
                outcomes={stats.outcomes}
                outcomeItems={stats.outcomeItems}
                topCategories={stats.topCategories}
                solvedRounds={stats.solvedRounds}
              />
            }
            dictation={<DictationProgress s={dictation} />}
          />
        </section>

        <section aria-labelledby="sentences" className="mb-10">
          <h2 id="sentences" className="mb-1 text-xl font-bold">
            我的句子本
          </h2>
          <p className="mb-4 text-ink-soft">這些都是你寫出來的句子。</p>
          {stats.rounds.length ? (
            <SentenceBook rounds={stats.rounds} />
          ) : (
            <p className="card py-10 text-center text-ink-soft">
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
