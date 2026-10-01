-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New
-- query) and run it manually. There is no Supabase CLI project linked here,
-- so migrations in this folder are not applied automatically.
--
-- Adds a designated-admin concept to profiles, separate from `approved`
-- (the ranked-game trust flag from migration 0002). Nothing in the app reads
-- or writes `is_admin` yet — no admin screen, no gated action checks it. It
-- exists now purely so there's a flagged account to build an admin screen
-- against later, and so "who is an admin" doesn't need a fresh decision when
-- that work starts.
--
-- Per the account-management decision captured in TODO.md on 2026-10-01: the
-- phased ranked-submission trust rollout (owner-only → admins → approved) is
-- no longer gating ranked-game submission — any signed-in account can submit
-- a ranked game, permanently. `is_admin` is unrelated to that gate; it's kept
-- for a future admin screen (ban/approve management, moderation, etc.), scope
-- still undecided.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- First (and currently only) designated admin.
update public.profiles
set is_admin = true
where id = (select id from auth.users where email = 'whyismynametom@gmail.com');
