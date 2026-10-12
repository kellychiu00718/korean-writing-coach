-- 008：資安修正。在 Supabase → SQL Editor 整段貼上執行一次即可（重複執行也沒關係）。
-- 執行前要先在 .env.local 加好 SUPABASE_SERVICE_ROLE_KEY，否則網站會寫不進資料。
--
-- 1. AI 次數不能再被退還繞過
--    之前使用者看得到自己每次扣次數的編號，又可以自己呼叫退還，等於可以無限次使用 AI。
--    現在：使用者看不到 ai_usage 的內容，只能透過函式查「今天用了幾次」；退還只有伺服器（service role）能做。
drop policy if exists "own usage read" on public.ai_usage;

create or replace function public.ai_used_today()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.ai_usage
  where user_id = auth.uid() and created_at >= public.kst_day_start();
$$;
revoke all on function public.ai_used_today() from public, anon;
grant execute on function public.ai_used_today() to authenticated;

drop function if exists public.refund_ai_quota(uuid);
create or replace function public.refund_ai_quota_for(usage uuid, uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.ai_usage
  where id = usage and user_id = uid and created_at > now() - interval '5 minutes';
end;
$$;
revoke all on function public.refund_ai_quota_for(uuid, uuid) from public, anon, authenticated;
grant execute on function public.refund_ai_quota_for(uuid, uuid) to service_role;

-- 2. 使用者不能再自己寫入練習紀錄、文法地圖、字卡、聽打紀錄和意見回報
--    這些都改由伺服器檢查過後用 service role 寫入（service role 不受 RLS 限制）。
--    讀取自己的資料、刪除自己的字卡照舊。
drop policy if exists "own attempts insert" on public.attempts;
drop policy if exists "own progress insert" on public.grammar_progress;
drop policy if exists "own progress update" on public.grammar_progress;
drop policy if exists "own cards insert" on public.review_cards;
drop policy if exists "own cards update" on public.review_cards;
drop policy if exists "own dictation insert" on public.dictation_attempts;
drop policy if exists "anyone can send feedback" on public.feedback;
