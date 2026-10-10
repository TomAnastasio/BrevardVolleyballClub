-- Two changes to merge_profiles() (migration 20261004140000):
--
-- 1. FIXES A DATA-LOSS BUG. Migration 20261004172000 (written after the
--    merge function) repointed games.user_id at public.profiles(id) with
--    ON DELETE CASCADE, so a manual profile can now be a game's user_id --
--    for 2v2 beach that's the implicit A1 player (migration 20261001191519),
--    for indoor/squad beach it's just the submitter. The old merge only
--    moved game_players rows, then deleted the removed profile -- which
--    cascade-DELETED every game whose games.user_id was that profile. This
--    version moves games.user_id over to the kept profile before deleting.
--
-- 2. Per the user's request (2026-10-09), the profile to KEEP may now be
--    either a Google profile or another manual profile, so two manual
--    duplicates of the same person can be merged. The profile to REMOVE
--    must still be manual (deleting a Google profile would orphan a real
--    auth.users account), so Google -> anything is still refused.
--
-- New guard: if both profiles are players in the same 2v2 beach game
-- (A1 via games.user_id, or A2/B1/B2 via game_players.slot), merging would
-- leave that game one player short or with someone in two slots. That's
-- refused with the game's date and names, so the admin can fix the game
-- with Edit Game first. Team-based games (indoor / squad beach) keep the
-- original behavior of dropping the removed profile's duplicate row.
--
-- Elo is still left for the admin to recompute afterward, same reasoning
-- as the original migration.
create or replace function public.merge_profiles(
  p_keep_id uuid,
  p_remove_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  keep_is_manual boolean;
  remove_is_manual boolean;
  conflict record;
begin
  perform public.require_admin();

  if p_keep_id is null or p_remove_id is null then
    raise exception 'both a profile to keep and a profile to remove are required';
  end if;
  if p_keep_id = p_remove_id then
    raise exception 'cannot merge a profile with itself';
  end if;

  select is_manual into keep_is_manual from public.profiles where id = p_keep_id;
  select is_manual into remove_is_manual from public.profiles where id = p_remove_id;

  if keep_is_manual is null or remove_is_manual is null then
    raise exception 'both profiles must exist';
  end if;
  if not remove_is_manual then
    raise exception 'the profile to remove must be a manual profile';
  end if;

  select g.id, g.played_date, g.name_a, g.name_b into conflict
    from public.games g
    where g.format = 'beach' and g.team_size is null
      and (g.user_id = p_keep_id or exists (
        select 1 from public.game_players gp where gp.game_id = g.id and gp.user_id = p_keep_id))
      and (g.user_id = p_remove_id or exists (
        select 1 from public.game_players gp where gp.game_id = g.id and gp.user_id = p_remove_id))
    limit 1;
  if conflict.id is not null then
    raise exception 'both profiles are players in the same game (% — % vs %). Fix that game with Edit Game first, then merge.',
      conflict.played_date, conflict.name_a, conflict.name_b;
  end if;

  delete from public.game_players gp_remove
    where gp_remove.user_id = p_remove_id
      and exists (
        select 1 from public.game_players gp_keep
        where gp_keep.game_id = gp_remove.game_id and gp_keep.user_id = p_keep_id
      );

  update public.game_players
    set user_id = p_keep_id
    where user_id = p_remove_id;

  update public.games
    set user_id = p_keep_id
    where user_id = p_remove_id;

  delete from public.profiles where id = p_remove_id;
end;
$$;

grant execute on function public.merge_profiles(uuid, uuid) to authenticated;
