import { redirect } from "next/navigation";
import { Mascot } from "@/components/Mascot";
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
      <div className="mb-4 flex items-center gap-3">
        <Mascot size={64} />
        <p className="font-display text-2xl">歡迎來到慢慢寫</p>
      </div>
      <div className="card">
        <h1 className="mb-1 text-2xl font-bold">先認識一下你</h1>
        <p className="mb-5 text-ink-soft">
          我們會依你感興趣的主題出情境題。都可以不填，之後也能在「我的」隨時修改。
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
