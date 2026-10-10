-- 006：聽打練習的紀錄。在 Supabase → SQL Editor 整段貼上執行一次即可（重複執行也沒關係）。

create table if not exists public.dictation_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  clip_id text not null check (char_length(clip_id) <= 40),
  typed text not null check (char_length(typed) <= 300),
  accuracy int not null check (accuracy between 0 and 100),
  -- 每分鐘大約幾個按鍵（타）；沒打字就是 0
  kpm int not null default 0 check (kpm between 0 and 3000),
  created_at timestamptz not null default now()
);
create index if not exists dictation_attempts_user_idx on public.dictation_attempts (user_id, created_at desc);

alter table public.dictation_attempts enable row level security;

drop policy if exists "own dictation read" on public.dictation_attempts;
create policy "own dictation read" on public.dictation_attempts
  for select using (auth.uid() = user_id);

drop policy if exists "own dictation insert" on public.dictation_attempts;
create policy "own dictation insert" on public.dictation_attempts
  for insert with check (auth.uid() = user_id);
