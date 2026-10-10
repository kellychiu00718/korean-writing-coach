-- 意見回報。在 Supabase SQL Editor 執行一次即可。
-- 沒登入的人也能送出；任何人都不能從網站讀取別人的回報，只有你在 Supabase 後台看得到。

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(message) between 1 and 2000),
  reply_email text check (reply_email is null or char_length(reply_email) <= 200),
  page text check (page is null or char_length(page) <= 300),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- 只開放新增；沒有 select 政策，所以網站上讀不到任何回報
create policy "anyone can send feedback" on public.feedback
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
