import { redirect } from "next/navigation";
import { MascotLockup } from "@/components/Logo";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "../me/ProfileForm";

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/welcome");
  const profile = getProfile(user);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-10">
      <p className="mb-4">
        <MascotLockup size={64} textPx={24}>
          歡迎來到慢慢寫
        </MascotLockup>
      </p>
      <div className="card">
        <h1 className="mb-1 text-2xl font-bold">先認識一下你</h1>
        <p className="mb-5 text-ink-soft">
          我們會根據你感興趣的主題，提供文法情境練習題。也可以先不填寫，之後可以在「我的」頁面隨時更改。
        </p>
        <ProfileForm
          nickname={profile.nickname}
          interests={profile.interests}
          submitLabel="開始練習"
          redirectTo="/workshop"
        />
      </div>
    </main>
  );
}
