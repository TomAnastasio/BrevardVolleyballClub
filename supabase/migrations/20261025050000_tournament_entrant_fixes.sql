-- Tournament fixes from the 2026-10-24 audit, ahead of Queen of Paradise
-- (2026-10-31). Additive only: three new admin functions, one new helper,
-- and admin_update_beach_game_players redefined (same behavior plus two
-- fixes). No table or column changes, and no existing data is touched.
--
-- * Removing a player (e.g. a no-show) is now one admin call,
--   admin_remove_tournament_entrant(). Deleting the entrant row directly
--   dropped them from their pool (the pool-players FK cascades) but left
--   them in the pool's scheduled games. Now, in one transaction:
--   - games they're in that haven't been scored are removed from the
--     schedule, in every pool and final of the tournament;
--   - a pool where nothing has been scored or started yet can instead get
--     a fresh schedule for its remaining players. The schedule is built by
--     the app (buildPoolSchedule in src/lib/queenOfCourt.js, the same code
--     that builds every pool) and passed in; this function checks it only
--     uses the pool's remaining players;
--   - scored games are never touched: they're real games with real Elo;
--   - someone in a final with a scored set can't be removed at all.
--
-- * Importing registrations is now one admin call,
--   admin_import_tournament_entrants(). The app used to create each new
--   manual profile and then the entry as separate requests, so a failure
--   part-way left stray profiles and a retry made more. Now the whole list
--   either goes in or nothing changes, and before creating a profile it
--   looks for an existing player with the same name (ignoring case,
--   accents and punctuation, like the app's matching in
--   src/lib/rosterImport.js), so a retry or a name listed twice reuses one
--   profile instead of making a duplicate. Someone already entered is
--   skipped and reported, not an error, so re-running an import that
--   actually went through changes nothing.
--
-- * Admin Edit Game on a tournament game now also moves the scheduled
--   game's players (tournament_matches.a1..b2), so pool standings follow
--   the corrected players like Elo already did. It also stops overwriting
--   "Submitted by" with Player 1's name (for every game, not just
--   tournament ones): who submitted a game doesn't change when its
--   players are corrected.

-- ---------------------------------------------------------------------------
-- Name matching
-- ---------------------------------------------------------------------------

-- Same as normalize() in src/lib/rosterImport.js: lowercase, accents
-- dropped, anything but letters and spaces removed, spaces collapsed.
-- "Zoë Ramírez" and "zoe  ramirez" compare equal.
create or replace function public.normalized_player_name(p_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select btrim(regexp_replace(regexp_replace(
    lower(regexp_replace(normalize(coalesce(p_name, ''), NFD), '[̀-ͯ]', '', 'g')),
    '[^a-z ]', '', 'g'), '\s+', ' ', 'g'));
$$;

-- Only used inside the functions below.
revoke execute on function public.normalized_player_name(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Import registrations (and add a walk-up player)
-- ---------------------------------------------------------------------------

-- p_rows is a JSON array, one object per player:
--   name, division_id               required
--   profile_id                      an existing player the admin picked;
--                                   omitted/null for "new player"
--   new_profile                     true when the admin chose "New profile"
--                                   even though a player with that exact
--                                   name exists (two people, same name);
--                                   still skipped if a player with that
--                                   name is already entered here
--   avp_rank, truvolley, junior,
--   email, phone                    optional
-- Returns { added, created_profiles, skipped: [{ name, reason }] }.
create or replace function public.admin_import_tournament_entrants(
  p_tournament_id uuid,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  r jsonb;
  row_name text;
  name_key text;
  stored_name text;
  name_keys text[];
  pid uuid;
  div_id uuid;
  candidates uuid[];
  real_accounts uuid[];
  avp integer;
  tru numeric;
  new_entrant_id uuid;
  contact_email text;
  contact_phone text;
  added integer := 0;
  created integer := 0;
  skipped jsonb := '[]'::jsonb;
begin
  perform public.require_admin();

  -- Locking the tournament makes two imports into it (two admins, or a
  -- double tap) take turns, so the second sees the first's new profiles
  -- and entries instead of duplicating them.
  perform 1 from public.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'tournament not found';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'no players to import';
  end if;

  for r in select value from jsonb_array_elements(p_rows) loop
    row_name := btrim(regexp_replace(coalesce(r->>'name', ''), '\s+', ' ', 'g'));
    pid := nullif(r->>'profile_id', '')::uuid;
    div_id := nullif(r->>'division_id', '')::uuid;

    if not exists (
      select 1 from public.tournament_divisions where id = div_id and tournament_id = p_tournament_id
    ) then
      raise exception 'pick a division for %', coalesce(nullif(row_name, ''), 'every player');
    end if;

    if pid is not null then
      if not exists (select 1 from public.profiles where id = pid) then
        raise exception 'player not found: %', row_name;
      end if;
    else
      name_key := public.normalized_player_name(row_name);
      if name_key = '' then
        raise exception 'every new player needs a name (got "%")', row_name;
      end if;
      -- New profiles get the first 24 characters of the name, so a retry
      -- must also recognize a profile saved under the shortened name.
      stored_name := btrim(left(row_name, 24));
      name_keys := array[name_key, public.normalized_player_name(stored_name)];

      select array_agg(p.id order by p.created_at) into candidates
        from public.profiles p
        where public.normalized_player_name(p.display_name) = any(name_keys);

      -- Someone with this name already entered here: a retried import (its
      -- reply was lost), or the same name listed twice. Skipped below, even
      -- for a deliberate "New profile" row, so a retry never adds a second
      -- copy. (A genuinely different person with the same name: Add Manual
      -- Profile, then add them on Players.)
      select e.profile_id into pid
        from public.tournament_entrants e
        where e.tournament_id = p_tournament_id and e.profile_id = any(coalesce(candidates, '{}'))
        limit 1;

      if pid is null and not coalesce((r->>'new_profile')::boolean, false) then
        if candidates is not null then
          if array_length(candidates, 1) = 1 then
            pid := candidates[1];
          end if;
          -- Several with this name: the one real (Google) account is almost
          -- certainly them, same rule as the app's matching.
          if pid is null then
            select array_agg(p.id) into real_accounts
              from public.profiles p where p.id = any(candidates) and not p.is_manual;
            if array_length(real_accounts, 1) = 1 then
              pid := real_accounts[1];
            end if;
          end if;
          if pid is null then
            raise exception 'several players are named %; pick which one in the list', row_name;
          end if;
        end if;
      end if;

      if pid is null then
        insert into public.profiles (display_name, is_manual)
          values (stored_name, true)
          returning id into pid;
        created := created + 1;
      end if;
    end if;

    if exists (
      select 1 from public.tournament_entrants where tournament_id = p_tournament_id and profile_id = pid
    ) then
      skipped := skipped || jsonb_build_object('name', row_name, 'reason', 'already entered');
      continue;
    end if;

    avp := case when (r->>'avp_rank') ~ '^\d{1,6}$' and (r->>'avp_rank')::integer between 1 and 100000
                then (r->>'avp_rank')::integer end;
    tru := case when (r->>'truvolley') ~ '^\d{1,5}(\.\d+)?$' and (r->>'truvolley')::numeric <= 99999
                then round((r->>'truvolley')::numeric, 2) end;

    insert into public.tournament_entrants (tournament_id, division_id, profile_id, avp_rank, truvolley_score, is_junior)
      values (p_tournament_id, div_id, pid, avp, tru, coalesce((r->>'junior')::boolean, false))
      returning id into new_entrant_id;

    contact_email := left(nullif(btrim(r->>'email'), ''), 200);
    contact_phone := left(nullif(btrim(r->>'phone'), ''), 40);
    if contact_email is not null or contact_phone is not null then
      insert into public.tournament_entrant_contacts (entrant_id, email, phone)
        values (new_entrant_id, contact_email, contact_phone);
    end if;
    added := added + 1;
  end loop;

  return jsonb_build_object('added', added, 'created_profiles', created, 'skipped', skipped);
end;
$$;

revoke execute on function public.admin_import_tournament_entrants(uuid, jsonb) from public, anon;
grant execute on function public.admin_import_tournament_entrants(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Remove a player from a tournament
-- ---------------------------------------------------------------------------

-- p_rebuilt_pools: { "<pool id>": [ { a1, a2, b1, b2, win_score,
-- win_by_two, point_cap }, ... ] } for each of the player's pools that
-- should get a fresh schedule (in play order). Only allowed while nothing
-- in that pool has been scored or started; otherwise this refuses and
-- changes nothing, so the admin can look again. Pools not listed keep
-- their schedule minus the player's unscored games.
-- Returns { removed_games, rebuilt_pools }.
create or replace function public.admin_remove_tournament_entrant(
  p_entrant_id uuid,
  p_rebuilt_pools jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  e record;
  pool record;
  schedule jsonb;
  remaining uuid[];
  n integer;
  removed integer := 0;
  rebuilt integer := 0;
begin
  perform public.require_admin();

  select * into e from public.tournament_entrants where id = p_entrant_id;
  if e.id is null then
    raise exception 'that player isn''t in this tournament';
  end if;

  -- Hold the schedule still: a score submitted meanwhile waits for this to
  -- finish (and finds its game gone, if it was one of the removed ones).
  perform 1 from public.tournament_matches where tournament_id = e.tournament_id for update;

  -- A final that's under way can't lose its players: removing its other
  -- sets would leave the scored ones deciding the final on their own, and
  -- a final can't be set up again once a set is scored.
  if exists (
    select 1 from public.tournament_matches
      where tournament_id = e.tournament_id and stage = 'final'
        and game_id is not null and e.profile_id in (a1, a2, b1, b2)
  ) then
    raise exception 'they''re in a final that already has a scored set, so they can''t be removed. Undo that set''s score on the live page first, or leave them in';
  end if;

  for pool in
    select p.* from public.tournament_pools p
      join public.tournament_pool_players pp on pp.pool_id = p.id
      where pp.entrant_id = e.id
  loop
    schedule := coalesce(p_rebuilt_pools, '{}'::jsonb) -> (pool.id::text);
    continue when schedule is null;

    if exists (
      select 1 from public.tournament_matches
        where pool_id = pool.id and stage = 'pool'
          and (game_id is not null or live_score_a + live_score_b > 0)
    ) then
      raise exception 'a game in this pool has started since you opened this screen; check the pool and try again';
    end if;

    select array_agg(en.profile_id) into remaining
      from public.tournament_pool_players pp
      join public.tournament_entrants en on en.id = pp.entrant_id
      where pp.pool_id = pool.id and pp.entrant_id <> e.id;

    if jsonb_typeof(schedule) <> 'array' or jsonb_array_length(schedule) = 0 or exists (
      select 1
        from jsonb_array_elements(schedule) g
        cross join lateral (values (g->>'a1'), (g->>'a2'), (g->>'b1'), (g->>'b2')) slot(id)
        where slot.id is null or not (slot.id::uuid = any(coalesce(remaining, '{}')))
    ) then
      raise exception 'the new schedule doesn''t match the pool''s players; reload and try again';
    end if;

    delete from public.tournament_matches where pool_id = pool.id and stage = 'pool';
    insert into public.tournament_matches (
      tournament_id, division_id, pool_id, stage, round, sequence,
      a1, a2, b1, b2, win_score, win_by_two, point_cap
    )
      select pool.tournament_id, pool.division_id, pool.id, 'pool', pool.round, x.ord::integer,
             (x.g->>'a1')::uuid, (x.g->>'a2')::uuid, (x.g->>'b1')::uuid, (x.g->>'b2')::uuid,
             (x.g->>'win_score')::integer, (x.g->>'win_by_two')::boolean, (x.g->>'point_cap')::integer
        from jsonb_array_elements(schedule) with ordinality as x(g, ord);
    rebuilt := rebuilt + 1;
  end loop;

  -- Every other game they're scheduled in and that hasn't been scored:
  -- the rest of their pool games, and any final they were in. The other
  -- games keep their numbers (Game 1, 2, 4...), so nobody's "we're game
  -- 4" changes underneath them.
  delete from public.tournament_matches
    where tournament_id = e.tournament_id
      and game_id is null
      and e.profile_id in (a1, a2, b1, b2);
  get diagnostics n = row_count;
  removed := removed + n;

  -- Cascades to their pool places, contact info and costume votes for
  -- them. Their scored games stay, with their name on them.
  delete from public.tournament_entrants where id = e.id;

  return jsonb_build_object('removed_games', removed, 'rebuilt_pools', rebuilt);
end;
$$;

revoke execute on function public.admin_remove_tournament_entrant(uuid, jsonb) from public, anon;
grant execute on function public.admin_remove_tournament_entrant(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_update_beach_game_players(): unchanged from migration
-- 20261003120000, except it keeps submitted_by_name and also updates a
-- tournament game's scheduled players.
-- ---------------------------------------------------------------------------

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

  -- Changed: submitted_by_name is left alone (it used to become Player 1's
  -- name here). Whoever submitted the game still did.
  update public.games
    set user_id = p_a1_user_id,
        name_a = a1_name || ' & ' || a2_name,
        name_b = b1_name || ' & ' || b2_name
    where id = p_game_id;

  -- Same harmless transient trigger fire as before; see 20261003120000.
  delete from public.game_players where game_id = p_game_id;

  insert into public.game_players (game_id, user_id, slot)
    values
      (p_game_id, p_a2_user_id, 'a2'),
      (p_game_id, p_b1_user_id, 'b1'),
      (p_game_id, p_b2_user_id, 'b2');

  -- New: a tournament game's schedule row follows, so pool standings
  -- (computed from the scheduled players) match the game. The four were
  -- checked as different people above, which the schedule also requires.
  -- A substitute who isn't in the pool counts for nobody's standings; see
  -- computeStandings in src/lib/queenOfCourt.js.
  update public.tournament_matches
    set a1 = p_a1_user_id,
        a2 = p_a2_user_id,
        b1 = p_b1_user_id,
        b2 = p_b2_user_id
    where game_id = p_game_id;

  if g.mode = 'ranked' then
    perform public.recompute_all_elo();
  end if;
end;
$$;
