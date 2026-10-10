-- 複習字卡。在 Supabase SQL Editor 執行一次即可。
-- 一題（文法＋情境）一張卡；錯兩次後自動加入，或使用者自己加入。

create table if not exists public.review_cards (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  grammar_id text not null,
  prompt_index int not null default 0,
  situation_zh text not null,
  my_sentence text not null,
  reference_ko text not null,
  note_zh text,
  source text not null check (source in ('auto', 'manual')),
  created_at timestamptz not null default now(),
  unique (user_id, grammar_id, prompt_index)
);

alter table public.review_cards enable row level security;

create policy "own cards read" on public.review_cards
  for select using (auth.uid() = user_id);
create policy "own cards insert" on public.review_cards
  for insert with check (auth.uid() = user_id);
create policy "own cards update" on public.review_cards
  for update using (auth.uid() = user_id);
create policy "own cards delete" on public.review_cards
  for delete using (auth.uid() = user_id);
