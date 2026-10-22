-- Queen of the Court rules confirmed by the organizer (2026-10-22), on top
-- of 20261022180000_tournaments.sql. Additive only: new nullable/defaulted
-- columns, one new table, two new functions. Nothing existing is changed.
--
-- * Per-game rules. Pools of 4 play to 28 (cap 30), pools of 5 to 21
--   (cap 23), finals are best 2-of-3 sets with no cap. So the rules now
--   live on each scheduled game, written when pools/finals are created.
--   Null means "use the tournament's own rules" (games made before this).
--
-- * Seeding: AVP ranking first, then TruVolley score, then Elo. The first
--   two aren't in the app, so the admin types (or imports) them per entrant.
--
-- * Juniors may enter adult divisions but can't win cash prizes: a flag
--   per entrant, shown to the admin when crowning winners.
--
-- * Best costume, voted by players: one vote per signed-in user per
--   tournament (changeable), cast only while the admin has voting open.
--   Votes are private (each voter sees only their own); the tally is
--   admin-only until the tournament is complete. The admin then marks the
--   winner (costume_winner), which shows on their profile.

alter table public.tournament_matches
  add column if not exists win_score integer check (win_score is null or win_score between 1 and 99),
  add column if not exists win_by_two boolean,
  add column if not exists point_cap integer check (point_cap is null or point_cap between 1 and 99);

alter table public.tournament_entrants
  add column if not exists avp_rank integer check (avp_rank is null or avp_rank between 1 and 100000),
  add column if not exists truvolley_score numeric(7, 2) check (truvolley_score is null or truvolley_score between 0 and 99999),
  add column if not exists is_junior boolean not null default false,
  add column if not exists costume_winner boolean not null default false;

alter table public.tournaments
  add column if not exists costume_voting_open boolean not null default false;

create table if not exists public.tournament_costume_votes (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  entrant_id uuid not null references public.tournament_entrants(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tournament_id, voter_id)
);

create index if not exists tournament_costume_votes_entrant_idx on public.tournament_costume_votes(entrant_id);

alter table public.tournament_costume_votes enable row level security;

-- Read-only from the client; votes are written only by cast_costume_vote().
create policy "Voters see their own costume vote; admins see all"
  on public.tournament_costume_votes for select
  using (voter_id = auth.uid() or public.is_current_user_admin());

create or replace function public.cast_costume_vote(
  p_tournament_id uuid,
  p_entrant_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  t record;
  e record;
begin
  if auth.uid() is null then
    raise exception 'sign in to vote';
  end if;

  select * into t from public.tournaments where id = p_tournament_id;
  if t.id is null or t.status = 'draft' then
    raise exception 'tournament not found';
  end if;
  if not t.costume_voting_open then
    raise exception 'costume voting isn''t open';
  end if;

  select * into e from public.tournament_entrants
    where id = p_entrant_id and tournament_id = p_tournament_id;
  if e.id is null then
    raise exception 'that player isn''t in this tournament';
  end if;
  if e.profile_id = auth.uid() then
    raise exception 'you can''t vote for yourself';
  end if;

  insert into public.tournament_costume_votes (tournament_id, voter_id, entrant_id)
    values (p_tournament_id, auth.uid(), p_entrant_id)
    on conflict (tournament_id, voter_id)
    do update set entrant_id = excluded.entrant_id, updated_at = now();
end;
$$;

grant execute on function public.cast_costume_vote(uuid, uuid) to authenticated;

create or replace function public.costume_vote_tally(p_tournament_id uuid)
returns table (entrant_id uuid, votes bigint)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if not public.is_current_user_admin() and not exists (
    select 1 from public.tournaments where id = p_tournament_id and status = 'complete'
  ) then
    raise exception 'costume votes are shown once the tournament is finished';
  end if;

  return query
    select v.entrant_id, count(*)::bigint
    from public.tournament_costume_votes v
    where v.tournament_id = p_tournament_id
    group by v.entrant_id
    order by count(*) desc;
end;
$$;

grant execute on function public.costume_vote_tally(uuid) to anon, authenticated;
