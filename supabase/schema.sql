-- 在 Supabase SQL Editor 執行一次即可。

-- 每次送出句子的紀錄（也用來計算每日 AI 使用次數）
create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  grammar_id text not null,
  prompt_index int not null default 0,
  sentence text not null,
  attempt int not null,
  overall text not null,
  feedback jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists attempts_user_created_idx on public.attempts (user_id, created_at desc);

-- 文法地圖：每人每個文法一列，狀態只升不降
create table if not exists public.grammar_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  grammar_id text not null,
  state text not null check (state in ('seen', 'know', 'use')),
  evidence text,
  updated_at timestamptz not null default now(),
  primary key (user_id, grammar_id)
);

alter table public.attempts enable row level security;
alter table public.grammar_progress enable row level security;

create policy "own attempts read" on public.attempts
  for select using (auth.uid() = user_id);
create policy "own attempts insert" on public.attempts
  for insert with check (auth.uid() = user_id);

create policy "own progress read" on public.grammar_progress
  for select using (auth.uid() = user_id);
create policy "own progress insert" on public.grammar_progress
  for insert with check (auth.uid() = user_id);
create policy "own progress update" on public.grammar_progress
  for update using (auth.uid() = user_id);
