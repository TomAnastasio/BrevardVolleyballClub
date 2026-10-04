-- Fixes a bug in migration 20261003120000: recompute_all_elo()'s full-reset
-- step used bare `update ... set ...` / `delete from ...` with no WHERE
-- clause, which Supabase's safeupdate guard rejects (error 21000, "UPDATE
-- requires a WHERE clause") even though resetting every row is the actual
-- intent here. `where true` keeps that intent while satisfying the guard.
-- Everything else in the function is unchanged from 20261003120000.
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
