-- recompute_all_elo() replays every ranked game from scratch in one
-- transaction; if any single game's replay throws, the whole batch aborts
-- and ROLLS BACK -- including the reset-to-1500 step and every other game's
-- (correctly computed) update. Since every admin edit/past-game-log for a
-- 2v2 beach game calls this (via admin_update_beach_game_players), a single
-- problematic historical game -- any format, any reason -- currently blocks
-- saving/editing *every* ranked game, not just the one causing trouble.
-- That blast radius is too large for a full-replay-or-nothing design.
--
-- This wraps each game's replay in its own sub-block: a game that fails to
-- replay is skipped (its elo_history entry and rating contribution are
-- simply absent from this pass) and logged as a Postgres WARNING with the
-- game id and the actual error, instead of aborting every other game's
-- replay. `continue` still works the same as before -- it targets the
-- enclosing `for g in ... loop`, not this new inner begin/exception block.
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
      raise warning 'recompute_all_elo: skipped game % (format=%, team_size=%) due to: %',
        g.id, g.format, g.team_size, sqlerrm;
    end;
  end loop;
end;
$$;
