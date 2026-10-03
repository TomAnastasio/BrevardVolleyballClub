-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New
-- query) and run it manually. There is no Supabase CLI project linked here,
-- so migrations in this folder are not applied automatically.
--
-- Migration 0002's "viewable by everyone" select policy used `using (true)`,
-- which applies to the anon key too — meaning anyone on the internet, signed
-- in or not, could read every account's real name (display_name) and photo
-- (avatar_url) straight from the REST API, with no club membership required.
-- No app code reads this table yet, so there's no functional reason for that
-- exposure today.
--
-- Narrows it to authenticated users only. Still broad on purpose (any
-- signed-in member can see any other member's name/photo), since that's what
-- a future leaderboard needs — it just closes the fully-anonymous/public
-- read.

drop policy if exists "Profiles are viewable by everyone" on public.profiles;

create policy "Profiles are viewable by signed-in users"
  on public.profiles for select
  using (auth.role() = 'authenticated');
