-- 007：聽打紀錄加上模式。在 Supabase → SQL Editor 整段貼上執行一次即可（重複執行也沒關係）。
-- listen：聽力模式（聽完打出來）；type：打字模式（看著句子打，kpm 存的是只算打對的字的淨타수）。

alter table public.dictation_attempts
  add column if not exists mode text not null default 'listen';

alter table public.dictation_attempts
  drop constraint if exists dictation_attempts_mode_check;
alter table public.dictation_attempts
  add constraint dictation_attempts_mode_check check (mode in ('listen', 'type'));
