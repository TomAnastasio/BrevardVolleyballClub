-- Saving a game in one step (audit fixes, 2026-10-25). Additive only: one
-- new nullable column, one new table of deleted game ids, one new function,
-- admin_delete_game re-created to note what it deletes, and the two Elo
-- trigger functions re-created with row locks added (their math is
-- unchanged). No existing
-- policy is dropped or tightened, so a phone still running an older copy
-- of the app (which inserts into games/game_players directly and then calls
-- assign_beach_game_a1) keeps working exactly as before.
--
-- Why: the app used to save a game in up to three separate requests:
--   1. insert the games row, with user_id = whoever pressed Save
--   2. insert its game_players rows -- the Elo trigger fires here, and for a
--      2v2 beach game it rates games.user_id as Player 1 (A1)
--   3. for a 2v2 beach game whose Player 1 wasn't the submitter, call
--      assign_beach_game_a1 to move user_id to the real Player 1 and replay
--      every rating in the club
-- If request 2 failed (no signal courtside), a ranked game was stored with
-- no players and never rated. If request 3 failed, the submitter kept Player
-- 1's rating change (rated twice when they were also in another slot) and
-- the real Player 1 got none. And if the phone lost the response to request
-- 1, trying again would save the game twice.
--
-- record_game() below does all of it in ONE transaction, with the right
-- Player 1 from the start, so the existing triggers rate the game once,
-- correctly, and no replay is needed. Either everything is saved or nothing
-- is. The phone picks the game's id when the game is saved on it, so sending
-- the same game again (a retry) can never create a second copy.

-- ------------------------------------------------------------ who saved it
-- games.user_id means "Player 1" for a 2v2 beach game (Elo, tokens and every
-- screen read it that way), so once record_game puts the real Player 1 there
-- the person who pressed Save is no longer recorded anywhere except the
-- submitted_by_name text. This keeps their account id too. Null for games
-- saved before this (and for games saved by older copies of the app or by
-- tournaments, which have their own save path); nothing requires it.
alter table public.games
  add column if not exists submitted_by uuid references public.profiles(id) on delete set null;

comment on column public.games.submitted_by is
  'Account that saved the game through record_game(). Null for games saved any other way. For 2v2 beach, user_id is Player 1, which may be someone else.';

-- ------------------------------------------------------------ deleted games
-- A phone can upload a game, never hear back, and retry much later (the app
-- was closed, no signal for a day). If an admin deleted that game in the
-- meantime, the retry would quietly put it back and rate it again. So
-- admin_delete_game now notes each deleted id here, and record_game refuses
-- those ids. Just ids and when: no game details are kept. Nobody reads or
-- writes this from the app directly (row level security on, no policies);
-- only the two functions below touch it.
create table if not exists public.deleted_games (
  game_id uuid primary key,
  deleted_at timestamptz not null default now(),
  deleted_by uuid
);
alter table public.deleted_games enable row level security;
revoke all on table public.deleted_games from public, anon, authenticated;

-- Same as migration 20261004170100 (admin only, replays Elo after deleting a
-- ranked game), plus the note above. Grants unchanged.
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

  insert into public.deleted_games (game_id, deleted_by)
    values (p_game_id, auth.uid())
    on conflict (game_id) do nothing;

  delete from public.elo_history where game_id = p_game_id;
  delete from public.game_players where game_id = p_game_id;
  delete from public.games where id = p_game_id;

  if g.mode = 'ranked' then
    perform public.recompute_all_elo();
  end if;
end;
$$;

-- ------------------------------------------------------------ record_game
-- Saves one finished game and all of its players. Called by the app (signed
-- in players only) with:
--   p_game_id      the id the phone generated when the game was saved on it;
--                  calling again with the same id returns that game unchanged
--                  (no second copy, no second rating, no second tokens)
--   p_name_a/_b    the team names shown in Past Games. Used for 2v2 beach,
--                  where the scoreboard lets players edit them (up to 100
--                  characters each; the app caps each player name at 24).
--                  For 3v3/4v4 and indoor the names are built here from the
--                  players' profiles, "Name, Name, ..." in the order given,
--                  exactly like the app did, so they can't be too long or
--                  wrong.
--   p_score_a/_b   final score: whole numbers, not a tie, and the winner
--                  reached 21 (beach) or 25 (indoor) with a 2-point lead --
--                  the same rule the app uses before it offers Save
--   p_mode         'ranked' or 'casual'
--   p_format       'beach' or 'indoor'
--   p_team_size    null for 2v2 beach and indoor, 3 or 4 for squad beach
--   p_played_date  the phone's local date ("YYYY-MM-DD") and time ("HH:MM")
--   p_played_time  when the game ended, which is what Past Games shows. It
--                  can be well before the upload if the phone had no signal.
--   p_a1 .. p_b2   2v2 beach only: the profile in each slot. Player 1 (p_a1)
--                  can be anyone, including someone other than the caller;
--                  the caller doesn't have to be playing at all. A ranked
--                  game needs all four. A casual game may leave a slot empty
--                  for a player typed in by name rather than picked (older
--                  copies of the app allowed that); an empty Player 1 falls
--                  back to the caller, as it always has.
--   p_team_a/_b    3v3/4v4 and indoor only: every player on each side
--                  (exactly 3 or 4 a side for squad beach, 1-15 for indoor)
-- Returns the game's id.
--
-- The server, not the phone, sets created_at (now) and submitted_by_name
-- (the caller's current profile name), and games.user_id: Player 1 for 2v2
-- beach, the caller for 3v3/4v4 and indoor (same as before).
create or replace function public.record_game(
  p_game_id uuid,
  p_name_a text,
  p_name_b text,
  p_score_a integer,
  p_score_b integer,
  p_mode text,
  p_format text,
  p_team_size integer,
  p_played_date date,
  p_played_time text,
  p_a1 uuid default null,
  p_a2 uuid default null,
  p_b1 uuid default null,
  p_b2 uuid default null,
  p_team_a uuid[] default null,
  p_team_b uuid[] default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  caller uuid := auth.uid();
  caller_name text;
  existing record;
  uses_roster boolean;
  win_score integer;
  slot_ids uuid[];
  all_ids uuid[];
  name_a text;
  name_b text;
  player1 uuid;
  inserted integer;
begin
  if caller is null then
    raise exception 'sign in to save games';
  end if;
  if p_game_id is null then
    raise exception 'game id is missing';
  end if;

  -- Already saved (a retry whose first try got through but whose answer
  -- never reached the phone): hand back the same game, touching nothing.
  -- Another account's game with the same id would mean a broken phone, not
  -- a retry -- refuse rather than pretend it saved.
  select id, submitted_by into existing from public.games where id = p_game_id;
  if found then
    if existing.submitted_by is distinct from caller then
      raise exception 'that game id is already used by another game';
    end if;
    return existing.id;
  end if;

  -- Deleted by an admin since the phone first sent it (see deleted_games).
  -- The app shows this message on the game and stops retrying it.
  if exists (select 1 from public.deleted_games where game_id = p_game_id) then
    raise exception 'an admin deleted this game, so it won''t be uploaded again';
  end if;

  select display_name into caller_name from public.profiles where id = caller;
  if not found then
    raise exception 'your player profile is missing';
  end if;

  -- ---------------------------------------------------------------- shape
  if p_mode is null or p_mode not in ('ranked', 'casual') then
    raise exception 'mode must be ranked or casual';
  end if;
  if p_format is null or p_format not in ('beach', 'indoor') then
    raise exception 'format must be beach or indoor';
  end if;
  if p_team_size is not null and (p_format <> 'beach' or p_team_size not in (3, 4)) then
    raise exception 'team size must be 3 or 4, and only for beach';
  end if;
  uses_roster := p_format = 'indoor' or p_team_size is not null;

  if p_played_date is null or p_played_time is null or p_played_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'played date and time are missing or malformed';
  end if;

  -- ---------------------------------------------------------------- score
  win_score := case when p_format = 'indoor' then 25 else 21 end;
  if p_score_a is null or p_score_b is null or p_score_a < 0 or p_score_b < 0 then
    raise exception 'scores must be whole numbers, 0 or more';
  end if;
  if p_score_a = p_score_b then
    raise exception 'a game can''t end in a tie';
  end if;
  if greatest(p_score_a, p_score_b) < win_score or abs(p_score_a - p_score_b) < 2 then
    raise exception 'the winner needs at least % points and a 2-point lead', win_score;
  end if;

  -- ---------------------------------------------------------------- players
  if uses_roster then
    if p_a1 is not null or p_a2 is not null or p_b1 is not null or p_b2 is not null then
      raise exception 'player slots are only for 2v2 beach';
    end if;
    if p_team_size is not null then
      if coalesce(cardinality(p_team_a), 0) <> p_team_size or coalesce(cardinality(p_team_b), 0) <> p_team_size then
        raise exception 'each side needs exactly % players', p_team_size;
      end if;
    elsif coalesce(cardinality(p_team_a), 0) not between 1 and 15 or coalesce(cardinality(p_team_b), 0) not between 1 and 15 then
      raise exception 'each side needs 1 to 15 players';
    end if;
    all_ids := p_team_a || p_team_b;
  else
    if p_team_a is not null or p_team_b is not null then
      raise exception 'team lists are only for 3v3, 4v4 and indoor';
    end if;
    if p_mode = 'ranked' and (p_a1 is null or p_a2 is null or p_b1 is null or p_b2 is null) then
      raise exception 'a ranked game needs all four players picked from the player list';
    end if;
    slot_ids := array_remove(array[p_a1, p_a2, p_b1, p_b2], null);
    all_ids := slot_ids;
  end if;

  if array_position(all_ids, null) is not null then
    raise exception 'a player is missing';
  end if;
  if (select count(distinct x) from unnest(all_ids) x) <> cardinality(all_ids) then
    raise exception 'the same player can''t be in a game twice';
  end if;
  if (select count(*) from public.profiles where id = any(all_ids)) <> cardinality(all_ids) then
    raise exception 'every player must be a known profile';
  end if;

  -- ---------------------------------------------------------------- names
  if uses_roster then
    select string_agg(pr.display_name, ', ' order by t.n) into name_a
      from unnest(p_team_a) with ordinality t(id, n) join public.profiles pr on pr.id = t.id;
    select string_agg(pr.display_name, ', ' order by t.n) into name_b
      from unnest(p_team_b) with ordinality t(id, n) join public.profiles pr on pr.id = t.id;
  else
    name_a := btrim(coalesce(p_name_a, ''));
    name_b := btrim(coalesce(p_name_b, ''));
    if name_a = '' or name_b = '' then
      raise exception 'team names are missing';
    end if;
    if char_length(name_a) > 100 or char_length(name_b) > 100 then
      raise exception 'team names can be at most 100 characters';
    end if;
  end if;

  -- ---------------------------------------------------------------- save
  -- 2v2 beach: Player 1 is games.user_id (see migration 20261001191519).
  -- Everything else: the caller, as before.
  player1 := case when uses_roster then caller else coalesce(p_a1, caller) end;

  -- "on conflict do nothing" covers two copies of the same retry arriving at
  -- once: the second waits for the first to finish, then inserts nothing
  -- and returns the first one's game below.
  insert into public.games (
    id, user_id, submitted_by, submitted_by_name, name_a, name_b, score_a, score_b,
    mode, format, team_size, played_date, played_time, created_at
  ) values (
    p_game_id, player1, caller, coalesce(caller_name, 'A player'), name_a, name_b, p_score_a, p_score_b,
    p_mode, p_format, p_team_size, p_played_date, p_played_time, now()
  )
  on conflict (id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    select id, submitted_by into existing from public.games where id = p_game_id;
    if existing.submitted_by is distinct from caller then
      raise exception 'that game id is already used by another game';
    end if;
    return existing.id;
  end if;

  -- One multi-row insert per game, like the app always did: the 2v2 row
  -- trigger (handle_game_players_insert) rates the game when the third slot
  -- row lands, and the 3v3/4v4/indoor statement trigger
  -- (handle_indoor_game_players_insert) sees the whole roster at once. Both
  -- skip casual games.
  if uses_roster then
    insert into public.game_players (game_id, user_id, team)
      select p_game_id, id, 'a' from unnest(p_team_a) as id
      union all
      select p_game_id, id, 'b' from unnest(p_team_b) as id;
  else
    insert into public.game_players (game_id, user_id, slot)
      select p_game_id, s.id, s.slot
      from (values (p_a2, 'a2'), (p_b1, 'b1'), (p_b2, 'b2')) as s(id, slot)
      where s.id is not null;
  end if;

  return p_game_id;
end;
$$;

-- Signed-in players only. Supabase lets every role (including anonymous
-- visitors) run a new public function unless it's revoked, so revoke first.
revoke execute on function public.record_game(uuid, text, text, integer, integer, text, text, integer, date, text, uuid, uuid, uuid, uuid, uuid[], uuid[]) from public, anon;
grant execute on function public.record_game(uuid, text, text, integer, integer, text, text, integer, date, text, uuid, uuid, uuid, uuid, uuid[], uuid[]) to authenticated;

-- ------------------------------------------------------------ Elo row locks
-- Two games saved at the same moment could each read a player's rating,
-- work out the change, and write it back -- the second write silently
-- replacing the first. Both rating triggers now lock the game's players'
-- profile rows first (in id order, so two saves sharing players queue up),
-- which makes the second game wait for the first to finish and then read
-- the rating it left. The lock is FOR NO KEY UPDATE, not FOR UPDATE: saving
-- a game already holds a light "key share" lock on every player's profile
-- (the foreign keys from games/game_players take it), and FOR UPDATE would
-- clash with another save's key share lock and could deadlock two saves.
-- NO KEY UPDATE doesn't clash with key share but still makes rating
-- updates take turns, and it's what the rating UPDATE itself takes anyway.
-- Everything below the lock is
-- copied unchanged from the latest versions (migrations 20261002204815 and
-- 20261004150000): same formula, same K-factor tiers (in apply_elo_update,
-- untouched).

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

  -- New: wait for any other game touching these players to finish first.
  perform 1 from public.profiles
    where id in (a1_id, a2_id, b1_id, b2_id)
    order by id
    for no key update;

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

  -- New: wait for any other game touching these players to finish first.
  perform 1 from public.profiles
    where id in (select user_id from public.game_players where game_id = v_game_id)
    order by id
    for no key update;

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
