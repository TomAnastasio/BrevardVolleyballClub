-- Fixes "insert or update on table games violates foreign key constraint
-- games_user_id_fkey", hit whenever an admin logs/edits a past 2v2 beach
-- game where slot A1 is filled by a manual profile (migration
-- 20261002171849 -- a profile with no backing auth.users row).
--
-- `games.user_id` doubles as beach's implicit A1 identity (see migration
-- 20261001191519's header). `admin_update_beach_game_players` (migration
-- 20261003120000) reassigns it to whichever profile is picked for A1:
--   update public.games set user_id = p_a1_user_id, ... where id = p_game_id;
-- That update still runs even when A1 isn't the admin/submitter at all --
-- any of the 4 players can go in any slot. If p_a1_user_id is a manual
-- profile, the still-`auth.users`-only FK on games.user_id rejects it.
--
-- Migration 20261002171849 deliberately left `games.user_id` pointing at
-- auth.users, reasoning "manual profiles only ever fill participant slots,
-- never the submitter slot" -- true at the time (one day before
-- admin_update_beach_game_players existed), no longer true now that an
-- admin can assign any picked player to A1 after the fact. This repoints
-- games.user_id at public.profiles(id) instead, exactly like that same
-- migration already did for game_players.user_id and elo_history.user_id --
-- a no-op for every existing real (Google-backed) row, since profiles.id
-- and auth.users.id are identical for those.
alter table public.games drop constraint if exists games_user_id_fkey;
alter table public.games
  add constraint games_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
