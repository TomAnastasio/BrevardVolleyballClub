-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New
-- query) and run it manually. There is no Supabase CLI project linked here,
-- so migrations in this folder are not applied automatically. Copy from the
-- raw GitHub URL rather than out of chat -- two prior migrations (0006, 0011)
-- got silently corrupted mid-line when pasted from chat.
--
-- Admin-only: edit a past game's roster (any of the 4 beach slots, or
-- add/remove players from an indoor roster) without touching its date, time,
-- score, or mode. Elo is path-dependent -- every game's rating math reads
-- whatever the ratings happened to be at that point in time, which were
-- shaped by every earlier game -- so correctly fixing one historical game's
-- roster means replaying every ranked game's Elo from scratch in play order,
-- not just patching the one edited game. `recompute_all_elo()` below is that
-- replay engine; the two `admin_update_*_game_players` functions edit a
-- single game's roster and then call it. `recompute_all_elo()` is also
-- exposed standalone (wired to a manual "Recompute Elo Ratings" admin
-- button) since it happens to fix an already-logged, unrelated bug: some
-- profiles carry stale elo_rating/elo_games_played left over from a deleted
-- batch of synthetic test games (see TODO.md item 4, 2026-10-03 note), with
-- no existing way to reset them.

create or replace function public.require_admin()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and is_admin
  ) then
    raise exception 'admin access required';
  end if;
end;
$$;

-- Resets every profile to the 1500/0 default, wipes elo_history, then
-- replays every ranked game in played-date order, recomputing each one with
-- whatever ratings the replay has produced so far. Mirrors the two existing
-- insert triggers' math exactly (handle_game_players_insert for beach,
-- handle_indoor_game_players_insert for indoor, both migration 0006/0011)
-- and reuses apply_elo_update unchanged, so K-factor tiering and rounding
-- stay identical to the live trigger path -- this function only changes
-- *when* the math runs (replayed in bulk, in order) not *how* it's computed.
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

  update public.profiles set elo_rating = 1500, elo_games_played = 0;
  delete from public.elo_history;

  for g in
    select * from public.games
    where mode = 'ranked'
    order by played_date, played_time, created_at
  loop
    if g.format = 'beach' then
      a1_id := g.user_id;
      select user_id into a2_id from public.game_players where game_id = g.id and slot = 'a2';
      select user_id into b1_id from public.game_players where game_id = g.id and slot = 'b1';
      select user_id into b2_id from public.game_players where game_id = g.id and slot = 'b2';

      if a2_id is null or b1_id is null or b2_id is null then
        -- Same bail as the live trigger: not all 3 non-submitter slots are
        -- linked to real profiles yet, so there's nothing to compute.
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

    elsif g.format = 'indoor' then
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

-- Replaces a beach game's 4 player slots. A1 (today identified only via
-- games.user_id, with no game_players row of its own) is reassignable here
-- too, not locked to whoever originally submitted -- per the user's explicit
-- call, this is a roster-correction tool, not just a "fix the other 3"
-- tool. All 4 must be real profiles (no free-text fallback): Elo needs a
-- real profile to attach a rating to, and the display text below is derived
-- from profiles.display_name, not re-typed.
create or replace function public.admin_update_beach_game_players(
  p_game_id uuid,
  p_a1_user_id uuid,
  p_a2_user_id uuid,
  p_b1_user_id uuid,
  p_b2_user_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  g record;
  a1_name text;
  a2_name text;
  b1_name text;
  b2_name text;
begin
  perform public.require_admin();

  select * into g from public.games where id = p_game_id for update;
  if g.id is null then
    raise exception 'game not found';
  end if;
  if g.format <> 'beach' then
    raise exception 'not a beach game';
  end if;

  if p_a1_user_id is null or p_a2_user_id is null or p_b1_user_id is null or p_b2_user_id is null then
    raise exception 'all four players are required';
  end if;
  if p_a1_user_id = p_a2_user_id or p_a1_user_id = p_b1_user_id or p_a1_user_id = p_b2_user_id
     or p_a2_user_id = p_b1_user_id or p_a2_user_id = p_b2_user_id or p_b1_user_id = p_b2_user_id then
    raise exception 'players must be four different people';
  end if;

  select display_name into a1_name from public.profiles where id = p_a1_user_id;
  select display_name into a2_name from public.profiles where id = p_a2_user_id;
  select display_name into b1_name from public.profiles where id = p_b1_user_id;
  select display_name into b2_name from public.profiles where id = p_b2_user_id;
  if a1_name is null or a2_name is null or b1_name is null or b2_name is null then
    raise exception 'all four players must be known profiles';
  end if;

  update public.games
    set user_id = p_a1_user_id,
        submitted_by_name = a1_name,
        name_a = a1_name || ' & ' || a2_name,
        name_b = b1_name || ' & ' || b2_name
    where id = p_game_id;

  -- This delete+insert fires the existing per-row on_game_players_insert
  -- trigger (migration 0006), which may write a transient Elo update off
  -- stale (pre-reset) ratings -- harmless, since the unconditional
  -- recompute_all_elo() call below always wipes and replaces it with the
  -- correct replayed value. Simpler than suppressing the trigger for this.
  delete from public.game_players where game_id = p_game_id;

  insert into public.game_players (game_id, user_id, slot)
    values
      (p_game_id, p_a2_user_id, 'a2'),
      (p_game_id, p_b1_user_id, 'b1'),
      (p_game_id, p_b2_user_id, 'b2');

  if g.mode = 'ranked' then
    perform public.recompute_all_elo();
  end if;
end;
$$;

-- Indoor's equivalent: replaces both full rosters. Unlike beach there's no
-- implicit submitter slot to special-case (migration 0011's indoor rosters
-- already store every player, submitter included, as an explicit row), so
-- this is a straight full-roster replace on both sides.
create or replace function public.admin_update_indoor_game_players(
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
  if g.format <> 'indoor' then
    raise exception 'not an indoor game';
  end if;

  if array_length(p_team_a, 1) is null or array_length(p_team_b, 1) is null then
    raise exception 'both sides need at least one player';
  end if;
  if array_length(p_team_a, 1) > 15 or array_length(p_team_b, 1) > 15 then
    -- Mirrors TeamRosterPicker.jsx's MAX_ROSTER_SIZE sanity cap.
    raise exception 'max 15 players per side';
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

  -- Same harmless-transient-trigger-fire note as the beach function above.
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

-- require_admin() is only ever called internally via `perform`, which needs
-- no grant. The two edit functions and the standalone recompute are called
-- directly from the client via supabase.rpc(...), so PostgREST needs
-- execute reachability -- the real authorization gate is require_admin()'s
-- check inside each function, not this grant.
grant execute on function public.admin_update_beach_game_players(uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.admin_update_indoor_game_players(uuid, uuid[], uuid[]) to authenticated;
grant execute on function public.recompute_all_elo() to authenticated;
