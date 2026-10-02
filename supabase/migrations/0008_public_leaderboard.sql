-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New
-- query) and run it manually. There is no Supabase CLI project linked here,
-- so migrations in this folder are not applied automatically.
--
-- Makes the county rankings visible to anyone, signed in or not — per the
-- user's explicit ask (2026-10-02): rankings should be a public draw, not
-- gated behind an account. This reverses migration 0004's restriction of
-- `profiles` to authenticated-only reads.
--
-- Trade-off, called out on purpose: this means player display_name and
-- avatar_url (real name/photo from Google sign-in) become readable by
-- anyone on the internet with no club membership, the exact exposure
-- migration 0004 closed. Accepted here because the app has no other
-- functional reason to gate it anymore (public leaderboard is now real,
-- matches the "Discovery" pillar in TODO.md), and `approved`/`is_admin` on
-- the same row aren't secrets.

drop policy if exists "Profiles are viewable by signed-in users" on public.profiles;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);
