-- Adds 3v3 and 4v4 beach volleyball alongside the existing 2v2. 2v2 beach
-- keeps its slot-based scheme (a1 implicit via games.user_id, a2/b1/b2 rows)
-- entirely untouched. 3v3/4v4 ("squad" beach) instead reuses indoor's
-- already-roster-size-agnostic mechanism wholesale: `game_players.team`
-- ('a'/'b') rows, every player explicit (no implicit submitter slot), and
-- the same generic average-Elo-per-team math indoor already has. The only
-- new thing squad beach needs on top of indoor's existing machinery is an
-- exact headcount per side (indoor only enforces "at least 1" / a 15-player
-- sanity cap) and a way to tell "2v2 beach" apart from "squad beach" at the
-- same format='beach' value, since `games.format` keeps meaning *sport*
-- (drives scoring rules and display icon), not roster shape.
--
-- Elo stays one single combined pool across every format/size (2v2, 3v3,
-- 4v4, indoor) per the user's explicit call -- a future multi-tier/weighted
-- Elo system (one rating per sport plus a combined one) is a separate,
-- later project, not something to half-build here.

alter table public.games
  add column if not exists team_size integer check (team_size is null or team_size in (3, 4));

comment on column public.games.team_size is
  'Null for 2v2 beach (slot-based) and indoor. 3 or 4 for "squad" beach games, which use game_players.team rows exactly like indoor instead of the fixed a1/a2/b1/b2 slots.';

-- Widens the indoor Elo trigger (migration 20261002204815) to also cover
-- squad beach. The averaging logic itself is already roster-size-agnostic
-- (avg() over however many rows share a team value) -- the only change is
-- the format gate at the top. Unchanged below that.
create or replace function public.handle_indoor_game_players_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_game_id uuid;
  g record;
  already_processed integer;
  team_a_count integer;
  team_b_count integer;
  team_a_avg numeric;
  team_b_avg numeric;
  rating_diff numeric;
  odds numeric;
  expected_a numeric;
  actual_a numeric;
  p record;
begin
  select game_id into v_game_id from new_rows limit 1;
  if v_game_id is null then
    return null;
  end if;

  select * into g from public.games where id = v_game_id;
  if g.mode <> 'ranked' then
    return null;
  end if;
  if not (g.format = 'indoor' or (g.format = 'beach' and g.team_size is not null)) then
    return null;
  end if;

  select count(*) into already_processed from public.elo_history where game_id = v_game_id;
  if already_processed > 0 then
    return null;
  end if;

  select count(*) into team_a_count from public.game_players where game_id = v_game_id and team = 'a';
  select count(*) into team_b_count from public.game_players where game_id = v_game_id and team = 'b';
  if team_a_count = 0 or team_b_count = 0 then
    return null;
  end if;

  select avg(pr.elo_rating) into team_a_avg
    from public.game_players gp join public.profiles pr on pr.id = gp.user_id
    where gp.game_id = v_game_id and gp.team = 'a';
  select avg(pr.elo_rating) into team_b_avg
    from public.game_players gp join public.profiles pr on pr.id = gp.user_id
    where gp.game_id = v_game_id and gp.team = 'b';

  rating_diff := team_b_avg - team_a_avg;
  odds := power(10.0, rating_diff / 400.0);
  expected_a := 1.0 / (1.0 + odds);
  actual_a := case when g.score_a > g.score_b then 1.0 else 0.0 end;

  for p in
    select gp.user_id, gp.team, pr.elo_rating, pr.elo_games_played
    from public.game_players gp join public.profiles pr on pr.id = gp.user_id
    where gp.game_id = v_game_id
  loop
    if p.team = 'a' then
      perform public.apply_elo_update(v_game_id, p.user_id, p.elo_rating, p.elo_games_played, actual_a, expected_a);
    else
      perform public.apply_elo_update(v_game_id, p.user_id, p.elo_rating, p.elo_games_played, 1.0 - actual_a, 1.0 - expected_a);
    end if;
  end loop;

  return null;
end;
$$;

-- Widens recompute_all_elo() (migration 20261003120000, safeupdate-fixed in
-- 20261004130000) the same way: the beach branch now only handles slot-based
-- (team_size is null) 2v2 games, and the indoor branch's generic
-- team-average body also runs for squad beach.
create or replace function public.recompute_all_elo()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  g record;
  a1 record;
  a2 record;
  b1 record;
  b2 record;
  a1_id uuid;
  a2_id uuid;
  b1_id uuid;
  b2_id uuid;
  team_a_avg numeric;
  team_b_avg numeric;
  rating_diff numeric;
  odds numeric;
  expected_a numeric;
  actual_a numeric;
  team_a_count integer;
  team_b_count integer;
  p record;
begin
  perform public.require_admin();

  update public.profiles set elo_rating = 1500, elo_games_played = 0 where true;
  delete from public.elo_history where true;

  for g in
    select * from public.games
    where mode = 'ranked'
    order by played_date, played_time, created_at
  loop
    if g.format = 'beach' and g.team_size is null then
      a1_id := g.user_id;
      select user_id into a2_id from public.game_players where game_id = g.id and slot = 'a2';
      select user_id into b1_id from public.game_players where game_id = g.id and slot = 'b1';
      select user_id into b2_id from public.game_players where game_id = g.id and slot = 'b2';

      if a2_id is null or b1_id is null or b2_id is null then
        continue;
      end if;

      select * into a1 from public.profiles where id = a1_id;
      select * into a2 from public.profiles where id = a2_id;
      select * into b1 from public.profiles where id = b1_id;
      select * into b2 from public.profiles where id = b2_id;

      team_a_avg := (a1.elo_rating + a2.elo_rating) / 2.0;
      team_b_avg := (b1.elo_rating + b2.elo_rating) / 2.0;
      rating_diff := team_b_avg - team_a_avg;
      odds := power(10.0, rating_diff / 400.0);
      expected_a := 1.0 / (1.0 + odds);
      actual_a := case when g.score_a > g.score_b then 1.0 else 0.0 end;

      perform public.apply_elo_update(g.id, a1_id, a1.elo_rating, a1.elo_games_played, actual_a, expected_a);
      perform public.apply_elo_update(g.id, a2_id, a2.elo_rating, a2.elo_games_played, actual_a, expected_a);
      perform public.apply_elo_update(g.id, b1_id, b1.elo_rating, b1.elo_games_played, 1.0 - actual_a, 1.0 - expected_a);
      perform public.apply_elo_update(g.id, b2_id, b2.elo_rating, b2.elo_games_played, 1.0 - actual_a, 1.0 - expected_a);

    elsif g.format = 'indoor' or (g.format = 'beach' and g.team_size is not null) then
      select count(*) into team_a_count from public.game_players where game_id = g.id and team = 'a';
      select count(*) into team_b_count from public.game_players where game_id = g.id and team = 'b';
      if team_a_count = 0 or team_b_count = 0 then
        continue;
      end if;

      select avg(pr.elo_rating) into team_a_avg
        from public.game_players gp join public.profiles pr on pr.id = gp.user_id
        where gp.game_id = g.id and gp.team = 'a';
      select avg(pr.elo_rating) into team_b_avg
        from public.game_players gp join public.profiles pr on pr.id = gp.user_id
        where gp.game_id = g.id and gp.team = 'b';

      rating_diff := team_b_avg - team_a_avg;
      odds := power(10.0, rating_diff / 400.0);
      expected_a := 1.0 / (1.0 + odds);
      actual_a := case when g.score_a > g.score_b then 1.0 else 0.0 end;

      for p in
        select gp.user_id, gp.team, pr.elo_rating, pr.elo_games_played
        from public.game_players gp join public.profiles pr on pr.id = gp.user_id
        where gp.game_id = g.id
      loop
        if p.team = 'a' then
          perform public.apply_elo_update(g.id, p.user_id, p.elo_rating, p.elo_games_played, actual_a, expected_a);
        else
          perform public.apply_elo_update(g.id, p.user_id, p.elo_rating, p.elo_games_played, 1.0 - actual_a, 1.0 - expected_a);
        end if;
      end loop;
    end if;
  end loop;
end;
$$;

-- Admin edit RPC for squad beach, modeled directly on
-- admin_update_indoor_game_players (migration 20261003120000) -- same full
-- roster replace via team arrays -- but scoped to squad beach and, unlike
-- indoor's "at least 1, max 15" check, enforces the game's exact team_size
-- on both sides (3v3 stays 3v3, 4v4 stays 4v4; this RPC doesn't let an edit
-- change which size a game was).
create or replace function public.admin_update_beach_squad_game_players(
  p_game_id uuid,
  p_team_a uuid[],
  p_team_b uuid[]
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  g record;
  names_a text[];
  names_b text[];
  overlap_count integer;
begin
  perform public.require_admin();

  select * into g from public.games where id = p_game_id for update;
  if g.id is null then
    raise exception 'game not found';
  end if;
  if g.format <> 'beach' or g.team_size is null then
    raise exception 'not a squad beach game';
  end if;

  if array_length(p_team_a, 1) is distinct from g.team_size or array_length(p_team_b, 1) is distinct from g.team_size then
    raise exception 'each side needs exactly % players', g.team_size;
  end if;

  select count(*) into overlap_count
    from unnest(p_team_a) a_id
    where a_id = any(p_team_b);
  if overlap_count > 0 then
    raise exception 'a player cannot be on both sides';
  end if;

  select array_agg(display_name order by display_name) into names_a
    from public.profiles where id = any(p_team_a);
  select array_agg(display_name order by display_name) into names_b
    from public.profiles where id = any(p_team_b);
  if names_a is null or names_b is null
     or array_length(names_a, 1) <> array_length(p_team_a, 1)
     or array_length(names_b, 1) <> array_length(p_team_b, 1) then
    raise exception 'all players must be known profiles';
  end if;

  update public.games
    set name_a = array_to_string(names_a, ', '),
        name_b = array_to_string(names_b, ', ')
    where id = p_game_id;

  -- Same harmless-transient-trigger-fire note as the beach/indoor edit
  -- functions above it: the delete fires the beach row-trigger per row,
  -- which no-ops for team-based rows (no slot to match), and the
  -- unconditional recompute_all_elo() below is what actually produces the
  -- correct replayed Elo.
  delete from public.game_players where game_id = p_game_id;

  insert into public.game_players (game_id, user_id, team)
    select p_game_id, id, 'a' from unnest(p_team_a) as id
    union all
    select p_game_id, id, 'b' from unnest(p_team_b) as id;

  if g.mode = 'ranked' then
    perform public.recompute_all_elo();
  end if;
end;
$$;

grant execute on function public.admin_update_beach_squad_game_players(uuid, uuid[], uuid[]) to authenticated;
