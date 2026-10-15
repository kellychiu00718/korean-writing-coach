import Link from "next/link";
import { Logo } from "@/components/Logo";
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
      <div className="mb-6">
        <Logo href="/about" size={48} />
      </div>
      <div className="card">
        <h1 className="mb-1 text-2xl font-bold">登入開始練習</h1>
        <p className="mb-5 text-ink-soft">輸入電子信箱，我們會寄一個登入連結給你。</p>
        {error === "link" && (
          <p role="alert" className="mb-4 rounded-2xl bg-hint px-4 py-3">
            這個登入連結沒辦法使用了：可能已經用過、超過 1 小時，或是在另一個瀏覽器打開。請在下面重新寄一封；收到後可以點連結，也可以輸入信裡的驗證碼。
          </p>
        )}
        {supabaseConfigured() ? (
          <LoginForm next={next} />
        ) : (
          <p className="rounded-2xl bg-hint px-4 py-3">
            網站還沒連上會員系統。請先在 <code>.env.local</code> 填好 Supabase 設定（見 README）。
          </p>
        )}
        <p className="mt-4 text-xs text-ink-soft">
          登入後我們會用你的電子信箱寄送登入連結並保存你的練習紀錄，詳見
          <Link href="/privacy" className="underline underline-offset-2">
            隱私權政策
          </Link>
          。
        </p>
      </div>
      <p className="mt-4 text-center text-sm text-ink-soft">
        第一次來？
        <a href="/about" className="underline underline-offset-2">
          看看慢慢寫怎麼練習
        </a>
      </p>
    </main>
  );
}
