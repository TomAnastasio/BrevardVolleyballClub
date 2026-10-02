-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New
-- query) and run it manually. There is no Supabase CLI project linked here,
-- so migrations in this folder are not applied automatically.
--
-- Makes Past Games visible to anyone, signed in or not — same ask and same
-- precedent as migration 0008's public leaderboard. Previously `games` was
-- scoped to "submitter or linked participant" (migrations 0005/0007); this
-- replaces that with a flat `using (true)`, so the history view becomes a
-- club-wide public game log instead of a personal one.
--
-- Trade-off, called out same as 0008: every game's opponents, score, and
-- played date/time become readable by anyone on the internet, not just the
-- players involved or signed-in club members. Accepted by the user alongside
-- the leaderboard decision. `games.user_id` (submitter) and the
-- `game_players` link rows are NOT made public by this migration — only
-- `games` select changes. Insert still requires `auth.uid() = user_id`
-- (submitting a game still requires signing in); only *viewing* opens up.
--
-- The `is_game_participant` security-definer helper from migration 0007
-- (written to break an RLS recursion bug) is no longer referenced by this
-- policy but is left in place rather than dropped — harmless if unused, and
-- removing it isn't needed to ship this.

drop policy if exists "Users can view their own or linked games" on public.games;

create policy "Games are viewable by everyone"
  on public.games for select
  using (true);
