-- Fixes a real bug hit in production (2026-10-23): a member logged a 2v2
-- beach game with themselves in slot 3 (B1) and someone else as Player 1,
-- and the saved game showed them as BOTH Player 1 and Player 3.
--
-- Beach's A1 has no game_players row -- it's games.user_id, which the live
-- save inserts as the submitter (the games INSERT policy requires
-- auth.uid() = user_id) and then moves to the real A1 with
-- assign_beach_game_a1 (migration 20261004180000). That function only
-- accepted a new A1 who was "already linked to this game" -- but A1 is
-- exactly the one player who never is, so whenever the submitter wasn't
-- Player 1 the call always failed and the submitter stayed in the A1 slot
-- on top of their real one. For a ranked game the Elo trigger had also
-- already rated the submitter twice (once as A1, once in their own slot)
-- and the real A1 not at all.
--
-- Anyone may be in any of the 4 slots, or not play at all, so the new A1
-- can now be any profile that isn't already in A2/B1/B2 of this game. The
-- "already linked" rule never protected anything: the same submitter can
-- already link any profile into A2/B1/B2 at insert time. Still only the
-- original submitter, still 2v2 beach only, and a ranked game still
-- replays Elo so the trigger's first (wrong) rating is replaced.
create or replace function public.assign_beach_game_a1(p_game_id uuid, p_a1_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  g record;
  a1_name text;
begin
  select * into g from public.games where id = p_game_id for update;
  if g.id is null then
    raise exception 'game not found';
  end if;
  if g.user_id <> auth.uid() then
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

grant execute on function public.assign_beach_game_a1(uuid, uuid) to authenticated;
