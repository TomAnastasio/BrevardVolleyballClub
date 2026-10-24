-- Closes holes found in the 2026-10-24 audit. First, two internal Elo functions
-- were callable by anyone through the public API, signed in or not, because
-- Supabase lets every role run a new public function unless it's revoked
-- (the tokens migration revokes its own; these two predate that habit).
--
-- - apply_elo_update writes one player's rating and an elo_history row from
--   whatever numbers it's given, so a caller could set any player's Elo to
--   anything.
-- - replay_all_elo_internal rebuilds every rating from game history with no
--   admin check (recompute_all_elo is the admin-checked way in).
--
-- Only other database functions call them: the rating triggers,
-- recompute_all_elo, assign_beach_game_a1 and the admin game edits. Those
-- run as the database owner (security definer), who keeps the right to run
-- them, so nothing in the app changes.
--
-- Additive only: no data is touched. If anyone did tamper with a rating
-- before this, an admin pressing Recompute Elo rebuilds every rating from
-- the games themselves.

revoke execute on function public.apply_elo_update(uuid, uuid, integer, integer, numeric, numeric) from public, anon, authenticated;
revoke execute on function public.replay_all_elo_internal() from public, anon, authenticated;

-- A third hole, same audit: assign_beach_game_a1 only checked
-- `g.user_id <> auth.uid()`. For a visitor who isn't signed in, auth.uid()
-- is null, that comparison is null rather than true, and the check let them
-- through, so anyone could change Player 1 of any 2v2 game (and set off a
-- full Elo replay). Same function, now refusing a missing sign-in, and no
-- longer callable without one at all.
create or replace function public.assign_beach_game_a1(p_game_id uuid, p_a1_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  g record;
  a1_name text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to edit a game.';
  end if;

  select * into g from public.games where id = p_game_id for update;
  if g.id is null then
    raise exception 'game not found';
  end if;
  if g.user_id is distinct from auth.uid() then
    raise exception 'only the original submitter can set this game''s A1 player';
  end if;
  if g.format <> 'beach' or g.team_size is not null then
    raise exception 'not a 2v2 beach game';
  end if;

  select display_name into a1_name from public.profiles where id = p_a1_user_id;
  if a1_name is null then
    raise exception 'unknown profile';
  end if;

  if exists (
    select 1 from public.game_players where game_id = p_game_id and user_id = p_a1_user_id
  ) then
    raise exception 'that player is already in another slot of this game';
  end if;

  update public.games set user_id = p_a1_user_id where id = p_game_id;

  if g.mode = 'ranked' then
    perform public.replay_all_elo_internal();
  end if;
end;
$$;

revoke execute on function public.assign_beach_game_a1(uuid, uuid) from public, anon;
grant execute on function public.assign_beach_game_a1(uuid, uuid) to authenticated;
