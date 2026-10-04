-- Admin-only: merge a manual profile into a Google-signed-in profile, for
-- when the same real person ended up with two rows (one from Google
-- sign-in, one an admin added manually before they signed in themselves).
-- Per the user's explicit call: the Google profile always survives, the
-- manual profile always disappears -- never the other direction, and never
-- two Google profiles into each other (that would mean picking which real
-- auth.users account to orphan, a much bigger decision than this screen is
-- for).
--
-- What this moves: game_players rows (so the merged person's full game
-- history now hangs off one profile) -- that's what Elo recompute and the
-- leaderboard actually key off. What this does NOT touch: games.name_a /
-- name_b / submitted_by_name, the free-text display snapshots captured at
-- save time. Those have been treated as immutable historical text since
-- migration 20261001191519 ("immune to later profile renames") -- a merge
-- is conceptually the same kind of identity change as a rename, so old
-- game-history rows keep showing whatever name was in use when they were
-- played, same as they would if a Google user just renamed themselves.
--
-- Elo is deliberately left for the admin to fix afterward with the existing
-- "Recompute Elo Ratings" button (migration 20261003120000) rather than
-- this function calling recompute_all_elo() itself -- merging is cheap and
-- might be done several times in a row (multiple duplicate profiles to
-- clean up), so recomputing once at the end instead of after every single
-- merge avoids replaying the whole game history N times over.
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
  if keep_is_manual then
    raise exception 'the profile to keep must be a Google-signed-in profile, not a manual one';
  end if;
  if not remove_is_manual then
    raise exception 'the profile to remove must be a manual profile';
  end if;

  -- A real person can't legitimately appear twice in the same game, but
  -- guard anyway: if the kept profile already has a game_players row for a
  -- game the manual profile is also linked to (e.g. both were accidentally
  -- added to the same game before anyone noticed they're the same person),
  -- drop the manual-profile row there instead of letting the reassignment
  -- below hit the (game_id, user_id) primary key.
  delete from public.game_players gp_remove
    where gp_remove.user_id = p_remove_id
      and exists (
        select 1 from public.game_players gp_keep
        where gp_keep.game_id = gp_remove.game_id and gp_keep.user_id = p_keep_id
      );

  update public.game_players
    set user_id = p_keep_id
    where user_id = p_remove_id;

  -- Cascades away any remaining game_players/elo_history rows still
  -- pointing at the removed profile (there shouldn't be any left after the
  -- reassignment above, but the FKs are on delete cascade either way).
  delete from public.profiles where id = p_remove_id;
end;
$$;

grant execute on function public.merge_profiles(uuid, uuid) to authenticated;
