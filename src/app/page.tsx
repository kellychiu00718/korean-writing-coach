import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/workshop");
  }
  redirect("/landing.html");
}
