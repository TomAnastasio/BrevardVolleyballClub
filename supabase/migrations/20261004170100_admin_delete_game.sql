-- Admin-only: permanently delete a past game. There was previously no way
-- to remove a game once saved -- not even a duplicate created by a client
-- retrying after a (wrongly reported) failed save -- without running SQL
-- directly against production, which this repo's rules explicitly forbid.
-- Mirrors the existing admin_update_*_game_players functions (migration
-- 20261003120000): security definer, re-checks require_admin() server-side
-- (the real authorization gate), and replays Elo if the deleted game was
-- ranked, since removing a ranked game changes every later game's replay.
create or replace function public.admin_delete_game(p_game_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  g record;
begin
  perform public.require_admin();

  select * into g from public.games where id = p_game_id for update;
  if g.id is null then
    raise exception 'game not found';
  end if;

  delete from public.elo_history where game_id = p_game_id;
  delete from public.game_players where game_id = p_game_id;
  delete from public.games where id = p_game_id;

  if g.mode = 'ranked' then
    perform public.recompute_all_elo();
  end if;
end;
$$;

grant execute on function public.admin_delete_game(uuid) to authenticated;
