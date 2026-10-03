-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New
-- query) and run it manually. There is no Supabase CLI project linked here,
-- so migrations in this folder are not applied automatically.
--
-- Indoor team rosters, per the user's ask (2026-10-02): indoor games drop
-- the free-text team name entirely and instead pick 4+ (usually ~8) players
-- per side from real profiles, same player pool as beach. Team color stays.
-- These rosters now feed individual Elo too (previously beach-only, per
-- migration 0006's header comment "indoor is explicitly out of scope").
--
-- `games` had no column distinguishing beach vs indoor at all before this —
-- the client tracked it locally but never persisted it. Added here as
-- `format`, defaulted to 'beach' for every pre-existing row: there is no way
-- to recover the true original format for old rows, and defaulting to
-- 'beach' is harmless either way since old "indoor" games never had any
-- individual-player data regardless (team-name text only) and so render
-- identically either way in history (no roster photos, because there is no
-- roster to show).
--
-- `game_players` gains a `team` column ('a'/'b'). Beach keeps its existing
-- `slot` ('a2'/'b1'/'b2') scheme entirely untouched -- `team` is simply left
-- null on beach rows, derivable from slot if ever needed but not backfilled
-- (same "going forward only" precedent as slot itself). Indoor rows are the
-- mirror image: `team` set, `slot` left null, because indoor has no fixed
-- per-player position -- just "which side". Unlike beach (where the
-- submitter is an implicit 4th player identified via games.user_id and
-- never gets its own game_players row), indoor stores *every* roster player
-- as an explicit row, submitter included if they're also playing -- team
-- size is variable (4-10+), so there's no fixed slot to special-case one
-- player out of.

alter table public.games
  add column if not exists format text not null default 'beach' check (format in ('beach', 'indoor'));

alter table public.game_players
  add column if not exists team text check (team in ('a', 'b'));

-- `game_players` linking rows were previously only visible to the game's
-- submitter or a linked participant (migration 0005), even after `games`
-- itself went fully public (migration 0009) -- that migration deliberately
-- left `game_players` alone. Indoor history now needs to show every roster
-- player's photo to any viewer (same public-history ask as 0009), so this
-- opens `game_players` the same way. Not a new category of exposure: beach's
-- `games.name_a`/`name_b` already free-texts real player names publicly
-- today, and `profiles.display_name`/`avatar_url` have been public since
-- migration 0008 -- this just lets the public join the two for indoor
-- rosters instead of leaving game_players as the one remaining gate.
drop policy if exists "Participants can view their game links" on public.game_players;

create policy "Game links are viewable by everyone"
  on public.game_players for select
  using (true);

-- Beach's existing trigger is untouched in its own logic, just scoped
-- explicitly to format = 'beach' (previously implicit -- an indoor game's
-- game_players rows have no slot, which happened to already bail out safely
-- via the "slots don't map" null check further down, but this makes that
-- scoping an intentional guarantee instead of an accident).
create or replace function public.handle_game_players_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  g record;
  link_count integer;
  already_processed integer;
  a1_id uuid;
  a2_id uuid;
  b1_id uuid;
  b2_id uuid;
  a1 record;
  a2 record;
  b1 record;
  b2 record;
  team_a_avg numeric;
  team_b_avg numeric;
  rating_diff numeric;
  odds numeric;
  expected_a numeric;
  actual_a numeric;
begin
  select * into g from public.games where id = new.game_id;
  if g.format <> 'beach' then
    return new;
  end if;
  if g.mode <> 'ranked' then
    return new;
  end if;

  select count(*) into link_count from public.game_players where game_id = new.game_id;
  if link_count < 3 then
    return new;
  end if;

  select count(*) into already_processed from public.elo_history where game_id = new.game_id;
  if already_processed > 0 then
    return new;
  end if;

  a1_id := g.user_id;
  select user_id into a2_id from public.game_players where game_id = new.game_id and slot = 'a2';
  select user_id into b1_id from public.game_players where game_id = new.game_id and slot = 'b1';
  select user_id into b2_id from public.game_players where game_id = new.game_id and slot = 'b2';

  if a2_id is null or b1_id is null or b2_id is null then
    -- All 3 rows exist (link_count >= 3) but slots don't cleanly map to
    -- a2/b1/b2 (e.g. pre-migration rows with a null slot sharing this game
    -- id, which shouldn't happen going forward). Bail out rather than guess.
    return new;
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

  perform public.apply_elo_update(new.game_id, a1_id, a1.elo_rating, a1.elo_games_played, actual_a, expected_a);
  perform public.apply_elo_update(new.game_id, a2_id, a2.elo_rating, a2.elo_games_played, actual_a, expected_a);
  perform public.apply_elo_update(new.game_id, b1_id, b1.elo_rating, b1.elo_games_played, 1.0 - actual_a, 1.0 - expected_a);
  perform public.apply_elo_update(new.game_id, b2_id, b2.elo_rating, b2.elo_games_played, 1.0 - actual_a, 1.0 - expected_a);

  return new;
end;
$$;

-- Indoor's equivalent of the beach trigger above, but a STATEMENT-level
-- trigger (fires once per INSERT statement, via a transition table of every
-- row that statement added) instead of beach's per-ROW one. Beach gets away
-- with per-row + "wait for exactly 3 rows" because its roster size is a
-- known constant; indoor's is not (4-10+ per side, picked at game-start
-- time), so there's no fixed row count to wait for. The app always inserts
-- one indoor game's entire roster as a single multi-row `game_players`
-- insert (see useGameHistory.js), which PostgREST sends as one SQL INSERT
-- statement -- so a statement-level trigger sees the complete roster in one
-- firing, with no row-counting needed.
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
  if g.format <> 'indoor' or g.mode <> 'ranked' then
    return null;
  end if;

  select count(*) into already_processed from public.elo_history where game_id = v_game_id;
  if already_processed > 0 then
    return null;
  end if;

  select count(*) into team_a_count from public.game_players where game_id = v_game_id and team = 'a';
  select count(*) into team_b_count from public.game_players where game_id = v_game_id and team = 'b';
  if team_a_count = 0 or team_b_count = 0 then
    -- Defensive only -- the client always requires >= 4 a side before
    -- Start Game is enabled. Guards against div-by-zero on the avg() below
    -- if that's ever violated (bad data, manual SQL, future bug).
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

drop trigger if exists on_indoor_game_players_insert on public.game_players;

create trigger on_indoor_game_players_insert
  after insert on public.game_players
  referencing new table as new_rows
  for each statement execute function public.handle_indoor_game_players_insert();
