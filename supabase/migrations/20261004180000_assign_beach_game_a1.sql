-- Fixes a real Elo-correctness bug: a LIVE 2v2 beach game (play -> Save
-- Game, not the admin "Log Past Game"/"Edit Game" flows) always inserts
-- `games.user_id` as the signed-in submitter and never corrects it,
-- regardless of which profile was actually picked into the A1 search
-- field in NewGameForm.jsx. Beach's A1 slot has no game_players row of its
-- own -- its identity is implicit via games.user_id (migration
-- 20261001191519) -- so whenever the submitter isn't the one occupying
-- A1, the real A1 player never gets linked or rated, and the submitter
-- gets wrongly credited in their place. Confirmed in production: a game
-- saved as "Rachel & Luke vs Steven & Tom Anastasio" ended up with
-- games.user_id = Tom (who was actually B2), and no link at all for
-- Rachel (the real A1).
--
-- The admin "Log Past Game"/"Edit Game" paths already avoid this: they
-- insert as the admin (required by the games INSERT RLS policy,
-- `auth.uid() = user_id`), then call admin_update_beach_game_players to
-- reassign user_id to whoever was actually picked for A1, replaying Elo.
-- This adds the same correction step for the live path, but self-service
-- (no admin check) since any signed-in user can already submit games
-- (see TODO.md item 6) -- scoped tightly so it can't be used to hijack an
-- unrelated profile's rating:
--   - only the ORIGINAL SUBMITTER of a game may reassign its A1 (checked
--     via games.user_id = auth.uid() -- this only ever runs immediately
--     after that same submitter's own insert, before anyone else could
--     have touched the row)
--   - the new A1 target must be either the caller themselves or a profile
--     already linked via game_players to this exact game (one of the 3
--     people just added as A2/B1/B2) -- never an arbitrary profile
--   - scoped to format = 'beach' and team_size is null only (indoor and
--     squad beach/3v3/4v4 store every player explicitly, no implicit
--     identity, so they're unaffected by this bug)

-- Extracts recompute_all_elo()'s actual replay logic (unchanged) into an
-- internal function with no admin check, so the new self-service function
-- below can trigger the same replay without needing admin.
-- recompute_all_elo() becomes a thin admin-gated wrapper -- every existing
-- caller (the standalone "Recompute Elo Ratings" button, and the three
-- admin_update_*_game_players functions) keeps working unchanged.
create or replace function public.replay_all_elo_internal()
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
  update public.profiles set elo_rating = 1500, elo_games_played = 0 where true;
  delete from public.elo_history where true;

  for g in
    select * from public.games
    where mode = 'ranked'
    order by played_date, played_time, created_at
  loop
    begin
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
    exception when others then
      raise warning 'replay_all_elo_internal: skipped game % (format=%, team_size=%) due to: %',
        g.id, g.format, g.team_size, sqlerrm;
    end;
  end loop;
end;
$$;

create or replace function public.recompute_all_elo()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.require_admin();
  perform public.replay_all_elo_internal();
end;
$$;

-- Self-service: lets a live 2v2 beach game's original submitter correct
-- who A1 actually was, right after saving. Not admin-gated -- any
-- signed-in user can already submit games -- but tightly scoped (see
-- header comment above) so it can't reassign someone else's existing game
-- or credit an unconnected profile.
create or replace function public.assign_beach_game_a1(p_game_id uuid, p_a1_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  g record;
  a1_name text;
  is_valid_target boolean;
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

  select (p_a1_user_id = auth.uid()) or exists (
    select 1 from public.game_players where game_id = p_game_id and user_id = p_a1_user_id
  ) into is_valid_target;
  if not is_valid_target then
    raise exception 'the new A1 player must already be linked to this game';
  end if;

  update public.games set user_id = p_a1_user_id where id = p_game_id;

  if g.mode = 'ranked' then
    perform public.replay_all_elo_internal();
  end if;
end;
$$;

grant execute on function public.assign_beach_game_a1(uuid, uuid) to authenticated;
