import Link from "next/link";
import { Mascot } from "@/components/Mascot";
import { supabaseConfigured } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <Link href="/landing.html" className="mb-6 flex items-center gap-2 font-display text-xl">
        <Mascot size={40} />
        慢慢寫
      </Link>
      <div className="card">
        <h1 className="mb-1 text-2xl font-bold">登入開始練習</h1>
        <p className="mb-5 text-ink-soft">輸入 email，我們會寄一個登入連結給你，不用設定密碼。</p>
        {error === "link" && (
          <p role="alert" className="mb-4 rounded-2xl bg-hint px-4 py-3">
            登入連結失效或已經用過了，再寄一次吧。
          </p>
        )}
        {supabaseConfigured() ? (
          <LoginForm next={next} />
        ) : (
          <p className="rounded-2xl bg-hint px-4 py-3">
            網站還沒連上會員系統。請先在 <code>.env.local</code> 填好 Supabase 設定（見 README）。
          </p>
        )}
      </div>
    </main>
  );
}
