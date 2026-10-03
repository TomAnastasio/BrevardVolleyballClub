-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New
-- query) and run it manually. There is no Supabase CLI project linked here,
-- so migrations in this folder are not applied automatically.
--
-- Mirrors the existing local game-history record shape (nameA, nameB, a, b,
-- date, time). Intentionally no update/delete policies: saved games are
-- immutable today (the app has no edit/delete of history), so only
-- select/insert policies are defined.

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name_a text not null,
  name_b text not null,
  score_a integer not null,
  score_b integer not null,
  mode text not null check (mode in ('ranked', 'casual')),
  played_date date not null,
  played_time text not null,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "Users can view their own games"
  on public.games for select
  using (auth.uid() = user_id);

create policy "Users can insert their own games"
  on public.games for insert
  with check (auth.uid() = user_id);
