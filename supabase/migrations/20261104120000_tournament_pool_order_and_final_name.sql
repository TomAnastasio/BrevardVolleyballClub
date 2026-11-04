-- Lets an admin record how a division's round 2 really ran, on top of
-- 20261022180000_tournaments.sql. Additive only: two new empty columns. No
-- existing row, policy or function changes, and no results are affected.
--
-- * sort_order: where a pool appears among its round's pools. Null (every
--   existing pool, and any newly built one) keeps today's order: Gold,
--   Silver, Bronze, Copper, then alphabetical. The app fills it in the first
--   time an admin renames or moves a pool, so a new name can't reshuffle the
--   pools; the first pool's final is the one that decides the title.
--
-- * final_name: what the final linked to this pool is called, for finals
--   between players from different pools ("Gold final" for one linked to
--   "Gold Pool A"). Null keeps today's name: the pool's label plus "final".
--
-- The existing "Admins can update pools" policy already covers both.

alter table public.tournament_pools
  add column if not exists sort_order integer,
  add column if not exists final_name text check (final_name is null or char_length(btrim(final_name)) between 1 and 60);
