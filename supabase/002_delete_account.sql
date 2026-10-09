-- 讓使用者刪除自己的帳號。在 Supabase SQL Editor 執行一次即可。
-- 刪除 auth.users 的資料後，attempts 與 grammar_progress 會因為 on delete cascade 一併刪除。

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
