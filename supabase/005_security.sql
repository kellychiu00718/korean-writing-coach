-- 005：防止 AI 次數被刷、資料被灌爆。在 Supabase → SQL Editor 整段貼上執行一次即可（重複執行也沒關係）。

-- 1. AI 使用次數另外記在這張表，使用者不能直接新增或刪除（沒有寫入的 policy），
--    只能透過下面的函式「先扣次數、再呼叫 AI」，同時送出很多次也不會超過上限。
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_created_idx on public.ai_usage (created_at);
create index if not exists ai_usage_user_created_idx on public.ai_usage (user_id, created_at);
alter table public.ai_usage enable row level security;

drop policy if exists "own usage read" on public.ai_usage;
create policy "own usage read" on public.ai_usage
  for select using (auth.uid() = user_id);

-- 韓國時間今天 00:00
create or replace function public.kst_day_start()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
$$;

-- 扣一次 AI 次數。回傳：扣完後今天還剩幾次；-1＝這個人今天用完；-2＝全站今天用完。
-- 上限由伺服器傳入，但不能超過這裡寫死的天花板，避免有人直接呼叫函式時傳很大的數字。
create or replace function public.consume_ai_quota(per_user int, global_cap int)
returns table (remaining int, usage_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  day_start timestamptz := public.kst_day_start();
  used int;
  total int;
  new_id uuid;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  per_user := least(greatest(per_user, 0), 50);
  global_cap := least(greatest(global_cap, 0), 2000);

  -- 同一時間只讓一個請求檢查並扣次數，避免同時送出好幾次都通過檢查
  perform pg_advisory_xact_lock(hashtext('consume_ai_quota'));

  select count(*) into used from public.ai_usage where user_id = uid and created_at >= day_start;
  if used >= per_user then
    return query select -1, null::uuid;
    return;
  end if;
  select count(*) into total from public.ai_usage where created_at >= day_start;
  if total >= global_cap then
    return query select -2, null::uuid;
    return;
  end if;

  insert into public.ai_usage (user_id) values (uid) returning id into new_id;
  return query select per_user - used - 1, new_id;
end;
$$;

-- AI 出錯時把剛剛扣的那一次還回去。只能還自己 5 分鐘內、而且知道編號（隨機產生、不會傳到瀏覽器）的那一筆。
create or replace function public.refund_ai_quota(usage uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.ai_usage
  where id = usage and user_id = auth.uid() and created_at > now() - interval '5 minutes';
end;
$$;

revoke all on function public.consume_ai_quota(int, int) from public, anon;
revoke all on function public.refund_ai_quota(uuid) from public, anon;
grant execute on function public.consume_ai_quota(int, int) to authenticated;
grant execute on function public.refund_ai_quota(uuid) to authenticated;

-- 把今天已經用掉的次數補進來，上線這個改動後不會突然多出次數
insert into public.ai_usage (user_id, created_at)
select a.user_id, a.created_at
from public.attempts a
where a.created_at >= public.kst_day_start()
  and not exists (select 1 from public.ai_usage u where u.user_id = a.user_id and u.created_at = a.created_at);

-- 2. 每筆資料的大小上限：就算有人繞過網站直接寫資料庫，也不能塞超大的內容（not valid＝不檢查舊資料）
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'attempts_size') then
    alter table public.attempts add constraint attempts_size
      check (char_length(sentence) <= 300 and pg_column_size(feedback) <= 30000 and attempt between 1 and 10) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'progress_size') then
    alter table public.grammar_progress add constraint progress_size
      check (char_length(grammar_id) <= 20 and (evidence is null or char_length(evidence) <= 300)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'review_cards_size') then
    alter table public.review_cards add constraint review_cards_size
      check (
        char_length(grammar_id) <= 20
        and char_length(situation_zh) <= 500
        and char_length(my_sentence) <= 300
        and char_length(reference_ko) <= 500
        and (note_zh is null or char_length(note_zh) <= 1000)
      ) not valid;
  end if;
end;
$$;

-- 3. 意見回報不用登入也能送，所以限制全站每小時最多 100 則，避免被灌垃圾訊息
create or replace function public.feedback_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.feedback where created_at > now() - interval '1 hour') >= 100 then
    raise exception 'feedback rate limit';
  end if;
  return new;
end;
$$;

drop trigger if exists feedback_rate_limit on public.feedback;
create trigger feedback_rate_limit
  before insert on public.feedback
  for each row execute function public.feedback_rate_limit();
