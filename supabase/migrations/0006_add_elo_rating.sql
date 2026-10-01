-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New
-- query) and run it manually. There is no Supabase CLI project linked here,
-- so migrations in this folder are not applied automatically.
--
-- Individual Elo rating for ranked beach games (TODO.md item 4). Beach only:
-- indoor games have no individual-player data at all (team names only), so
-- there's nothing for a per-player rating to attach to there yet.
--
-- The rating math runs entirely in a trigger function, not client JS. The
-- app has no server — client JS would mean a user's own browser computes
-- everyone's new rating and writes it via the Supabase client, which a
-- tampered client could abuse unless writes are locked down anyway. Doing
-- the math in a `security definer` trigger means regular users have no way
-- to write `profiles.elo_rating`/`elo_games_played` or `elo_history` at all
-- (no insert/update policy grants it) — only this function can.

alter table public.profiles
  add column if not exists elo_rating integer not null default 1500,
  add column if not exists elo_games_played integer not null default 0;

-- Which of the 3 non-submitter slots a game_players row fills. The
-- submitter is always slot a1 (identified via games.user_id, no row here).
-- Nullable because pre-migration link rows (inserted before this column
-- existed) have no slot recorded — fine, since Elo is going-forward only,
-- same precedent as game_players/submitted_by_name themselves.
alter table public.game_players
  add column if not exists slot text check (slot in ('a2', 'b1', 'b2'));

create table if not exists public.elo_history (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating_before integer not null,
  rating_after integer not null,
  delta integer not null,
  created_at timestamptz not null default now()
);

create index if not exists elo_history_user_id_idx on public.elo_history(user_id);

alter table public.elo_history enable row level security;

-- Same visibility rule as profiles (migration 0004): any signed-in member,
-- not the public internet. No insert/update policy for regular users —
-- only the trigger function below (security definer) writes rows.
create policy "Elo history is viewable by authenticated users"
  on public.elo_history for select
  using (auth.role() = 'authenticated');

-- Fires once per game_players row inserted. A ranked game's 3 non-submitter
-- links are inserted as a single multi-row statement, so this runs 3 times
-- per game; the "< 3 rows yet" check below means only the last of those 3
-- firings actually has all the data needed to compute and apply the rating
-- change, and the elo_history existence check is a belt-and-suspenders
-- idempotency guard against ever double-processing the same game.
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
  a1_rating integer; a1_games integer;
  a2_rating integer; a2_games integer;
  b1_rating integer; b1_games integer;
  b2_rating integer; b2_games integer;
  team_a_avg numeric;
  team_b_avg numeric;
  expected_a numeric;
  actual_a numeric;
begin
  select * into g from public.games where id = new.game_id;
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

  select elo_rating, elo_games_played into a1_rating, a1_games from public.profiles where id = a1_id;
  select elo_rating, elo_games_played into a2_rating, a2_games from public.profiles where id = a2_id;
  select elo_rating, elo_games_played into b1_rating, b1_games from public.profiles where id = b1_id;
  select elo_rating, elo_games_played into b2_rating, b2_games from public.profiles where id = b2_id;

  team_a_avg := (a1_rating + a2_rating) / 2.0;
  team_b_avg := (b1_rating + b2_rating) / 2.0;
  expected_a := 1.0 / (1.0 + power(10.0, (team_b_avg - team_a_avg) / 400.0));
  actual_a := case when g.score_a > g.score_b then 1.0 else 0.0 end;

  perform public.apply_elo_update(new.game_id, a1_id, a1_rating, a1_games, actual_a, expected_a);
  perform public.apply_elo_update(new.game_id, a2_id, a2_rating, a2_games, actual_a, expected_a);
  perform public.apply_elo_update(new.game_id, b1_id, b1_rating, b1_games, 1.0 - actual_a, 1.0 - expected_a);
  perform public.apply_elo_update(new.game_id, b2_id, b2_rating, b2_games, 1.0 - actual_a, 1.0 - expected_a);

  return new;
end;
$$;

-- Per-player K-factor is tiered on *their own* games-played count (not the
-- team's), so a newcomer paired with a veteran still moves fast while the
-- veteran moves slowly. 40 while new (< 15 ranked games), 20 once
-- established -- standard Elo practice (chess federations use similar
-- tiering for the same reason: a new player's true skill is unknown, so
-- early games should correct it quickly).
create or replace function public.apply_elo_update(
  p_game_id uuid,
  p_user_id uuid,
  p_rating_before integer,
  p_games_played integer,
  p_actual numeric,
  p_expected numeric
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  k integer;
  rating_after integer;
begin
  k := case when p_games_played < 15 then 40 else 20 end;
  rating_after := round(p_rating_before + k * (p_actual - p_expected));

  update public.profiles
    set elo_rating = rating_after, elo_games_played = p_games_played + 1
    where id = p_user_id;

  insert into public.elo_history (game_id, user_id, rating_before, rating_after, delta)
    values (p_game_id, p_user_id, p_rating_before, rating_after, rating_after - p_rating_before);
end;
$$;

drop trigger if exists on_game_players_insert on public.game_players;

create trigger on_game_players_insert
  after insert on public.game_players
  for each row execute function public.handle_game_players_insert();
