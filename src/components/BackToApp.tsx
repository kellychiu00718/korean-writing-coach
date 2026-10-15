import Link from "next/link";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/** 意見回報、隱私權政策這類獨立頁面用：登入的人回句子工坊，沒登入的人回網站介紹。 */
export async function BackToApp({ className = "" }: { className?: string }) {
  let loggedIn = false;
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    loggedIn = Boolean(user);
  }
  // 網站介紹 /about 是靜態檔，用一般連結；用 <Link> 會去預先載入不存在的頁面資料（404）
  const Tag = loggedIn ? Link : "a";
  return (
    <Tag href={loggedIn ? "/workshop" : "/about"} className={`btn btn-ghost btn-sm ${className}`}>
      <span aria-hidden="true">←</span>
      {loggedIn ? "回到句子工坊" : "回到網站介紹"}
    </Tag>
  );
}
