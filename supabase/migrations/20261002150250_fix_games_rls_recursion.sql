-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New
-- query) and run it manually. There is no Supabase CLI project linked here,
-- so migrations in this folder are not applied automatically.
--
-- Fixes a live outage: migration 0005's games/game_players SELECT policies
-- reference each other via direct EXISTS subqueries. Evaluating one policy
-- re-triggers the other table's RLS, which re-triggers the first again —
-- genuine infinite recursion, not the "bounded planner lookup" migration
-- 0005 assumed. Confirmed in production via
-- `select id from games limit 1` returning:
--   {"code":"42P17","message":"infinite recursion detected in policy
--   for relation \"games\""}
-- Every read and write against games/game_players has been failing with
-- this error since 0005 was applied — saves only ever landed in each
-- device's local browser storage, never in Supabase.
--
-- Fix: break the cycle with a security definer function. Supabase SQL
-- Editor statements run as the `postgres` superuser, so a function it
-- creates bypasses RLS entirely when querying game_players from inside —
-- same precedent as the already-existing Elo trigger functions (migration
-- 0006), which rely on security definer to write profiles/elo_history
-- without any insert/update policy granting it. That means the chain
-- becomes: game_players policy -> (normal, RLS-checked) games policy ->
-- security definer function -> game_players (RLS bypassed, no further
-- recursion).

create or replace function public.is_game_participant(p_game_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.game_players gp
    where gp.game_id = p_game_id and gp.user_id = auth.uid()
  );
$$;

drop policy if exists "Users can view their own or linked games" on public.games;

create policy "Users can view their own or linked games"
  on public.games for select
  using (
    auth.uid() = user_id
    or public.is_game_participant(games.id)
  );
