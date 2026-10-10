import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { FeedbackForm } from "./FeedbackForm";

export const metadata: Metadata = { title: "意見回報｜慢慢寫" };

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  let email = "";
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? "";
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:px-5">
      <div className="mb-8">
        <Logo href="/landing.html" />
      </div>
      <div className="card">
        <h1 className="mb-1 text-2xl font-bold">意見回報</h1>
        <p className="mb-5 text-ink-soft">遇到問題、有想要的功能，或只是想說說話，都歡迎告訴我。每一則我都會親自看並且回覆噢！</p>
        <FeedbackForm defaultEmail={email} page={from} />
      </div>
    </main>
  );
}
