import Link from "next/link";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/** 意見回報、隱私權政策這類獨立頁面用：登入的人回句子工坊，沒登入的人回首頁。 */
export async function BackToApp({ className = "" }: { className?: string }) {
  let loggedIn = false;
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    loggedIn = Boolean(user);
  }
  return (
    <Link href={loggedIn ? "/workshop" : "/landing.html"} className={`btn btn-ghost btn-sm ${className}`}>
      <span aria-hidden="true">←</span>
      {loggedIn ? "回到句子工坊" : "回到首頁"}
    </Link>
  );
}
