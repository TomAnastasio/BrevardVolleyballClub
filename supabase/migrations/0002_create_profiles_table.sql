-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New
-- query) and run it manually. There is no Supabase CLI project linked here,
-- so migrations in this folder are not applied automatically.
--
-- Creates a `profiles` table with one row per auth.users account, auto-
-- populated by a trigger whenever someone signs up. This is the standard
-- Supabase pattern for attaching app-specific data to an account without
-- touching Supabase's own auth.users table.
--
-- Fields seeded from Google today: display_name, avatar_url. Neither is
-- user-editable yet (no edit screen built) — both are pass-through copies of
-- whatever Google reported at signup. `approved` is the ranked-game trust
-- flag from item 6 in TODO.md; defaults to false, flipped only by an admin
-- (no admin screen yet — direct Supabase Studio edit until one exists).
--
-- Account-level banning intentionally has no column here: Supabase Auth's
-- built-in ban capability (Studio → Authentication → Users → Ban) already
-- covers that, so this schema doesn't duplicate it with its own `banned`
-- flag.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- No insert/update policies for regular users: rows are only ever created
-- by the trigger below (runs as the function owner, bypassing RLS), and
-- nothing in the app edits a profile yet. Add a scoped update policy when a
-- profile-edit screen or admin approve screen is built, rather than opening
-- general write access now.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: the trigger above only fires for accounts created from now on.
-- The app already has real signed-in users from before this migration ran
-- (see TODO.md item 1), so copy those in once, too.
insert into public.profiles (id, display_name, avatar_url)
select id, raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;
