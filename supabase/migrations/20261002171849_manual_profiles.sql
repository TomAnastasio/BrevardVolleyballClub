-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New
-- query) and run it manually. There is no Supabase CLI project linked here,
-- so migrations in this folder are not applied automatically.
--
-- Adds admin-created "manual" player profiles: rows in `profiles` with no
-- backing `auth.users` account, for players who don't want (or can't) sign
-- in with Google but should still be pickable in ranked/casual games and
-- show up on the leaderboard. Per the user's ask (2026-10-02): only the
-- designated admin (whyismynametom@gmail.com, flagged in migration 0003)
-- can create them; everyone can still see/select them same as any other
-- profile (profiles stayed public-read since migration 0008).
--
-- `profiles.id` was `references auth.users(id)`, which made a manual row
-- impossible (no matching auth.users row to satisfy the FK). That
-- constraint is dropped here rather than worked around, since the whole
-- point of this feature is profiles that are NOT auth.users accounts.
-- `game_players.user_id` / `elo_history.user_id` had the same FK shape and
-- are repointed at `profiles(id)` instead -- for every existing (real,
-- Google-backed) row the two ids are identical, so this is a no-op for
-- current data and simply also permits manual-profile ids going forward.
-- `games.user_id` (the game *submitter*) is untouched: submitting a game
-- still requires being signed in, manual profiles only ever fill
-- participant slots, never the submitter slot.

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();

alter table public.profiles
  add column if not exists is_manual boolean not null default false;

alter table public.game_players drop constraint if exists game_players_user_id_fkey;
alter table public.game_players
  add constraint game_players_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.elo_history drop constraint if exists elo_history_user_id_fkey;
alter table public.elo_history
  add constraint elo_history_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- security definer so this can be called from inside profiles' own INSERT
-- policy without recursively re-checking that policy: the query inside
-- runs as the function owner, bypassing RLS entirely, instead of
-- re-entering the policy it's being evaluated for.
create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Only the admin may create manual profiles, and only as manual profiles
-- (is_manual = true) -- there's still no general-purpose profile-insert
-- policy for anyone else, same as migration 0002 left it.
create policy "Admins can insert manual profiles"
  on public.profiles for insert
  with check (
    is_manual = true
    and public.is_current_user_admin()
  );

-- Storage bucket for manual-profile photos. Public read (profile photos are
-- already effectively public via the leaderboard/profiles table), admin-only
-- write -- same trust boundary as the profiles insert policy above.
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "Profile photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "Admins can upload profile photos"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-photos'
    and public.is_current_user_admin()
  );
