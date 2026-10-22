-- Tournaments (first format: "Queen of the Court" — individual entrants,
-- rotating partners, round-robin pools, then a finals game). Built for the
-- Queen of Paradise event (2026-10-31), with room to add pre-formed teams,
-- brackets, and in-app registration later.
--
-- Key design decisions:
--
-- * A tournament game IS a normal ranked 2v2 beach game. Scoring a match
--   inserts a regular `games` row (user_id = the match's A1 player, like
--   every 2v2 beach game) plus its three `game_players` slot rows, so the
--   existing Elo trigger, game history, player profiles, Edit/Delete Game,
--   and Recompute Elo all work with zero special cases. `tournament_matches`
--   is the *schedule* (who plays whom, in what order); `games` is the
--   *result*. Standings are always computed from the linked games, never
--   stored, so fixing a game fixes the standings.
--
-- * Any signed-in user may submit a score (owner's call, 2026-10-22), via
--   submit_tournament_match_score() below. It's security definer because the
--   person entering the score usually isn't the match's A1 player, and games
--   INSERT RLS requires auth.uid() = user_id. It locks the match row and
--   refuses a second submission, so two phones scoring the same game can't
--   create a duplicate.
--
-- * Admin corrections: Delete Game (admin_delete_game) on a tournament game
--   sets the match's game_id back to null (ON DELETE SET NULL), reopening it
--   to be scored again. No new correction function needed.
--
-- * Contact info (email/phone from the registration form) lives in its own
--   admin-only table, because profiles/entrants are publicly readable.
--   Date of birth is deliberately NOT stored (owner's call).
--
-- * Everything except contacts is publicly readable once the tournament
--   leaves 'draft' (public live standings page, owner's call). Drafts are
--   visible to admins only.
--
-- * merge_profiles() is extended (same body, plus tournament repointing) so
--   the "imported as a manual profile, later claimed via the sign-up QR
--   code" flow keeps a player's tournament entry, schedule, and titles.
--   Tournament FKs to profiles are ON DELETE RESTRICT, so a future profile
--   deletion that forgets to repoint fails loudly instead of silently
--   dropping tournament history.

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  event_date date not null,
  location text check (location is null or char_length(location) <= 200),
  format text not null default 'queen_of_court' check (format in ('queen_of_court')),
  status text not null default 'draft' check (status in ('draft', 'published', 'live', 'complete')),
  -- Whether tournament games count toward Elo (mode 'ranked' vs 'casual').
  ranked boolean not null default true,
  -- Game rules, per tournament, since they're still being confirmed with
  -- the organizer and may differ between events.
  win_score integer not null default 21 check (win_score between 1 and 99),
  win_by_two boolean not null default true,
  point_cap integer check (point_cap is null or point_cap between 1 and 99),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.tournament_divisions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  sort_order integer not null default 0,
  min_players integer not null default 5 check (min_players >= 0),
  created_at timestamptz not null default now(),
  unique (tournament_id, name)
);

create index if not exists tournament_divisions_tournament_idx on public.tournament_divisions(tournament_id);

create table if not exists public.tournament_entrants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  division_id uuid not null references public.tournament_divisions(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  checked_in boolean not null default false,
  final_place integer check (final_place is null or final_place > 0),
  title text check (title is null or title in ('queen', 'princess')),
  created_at timestamptz not null default now(),
  unique (tournament_id, profile_id)
);

create index if not exists tournament_entrants_tournament_idx on public.tournament_entrants(tournament_id);
create index if not exists tournament_entrants_profile_idx on public.tournament_entrants(profile_id);

create table if not exists public.tournament_entrant_contacts (
  entrant_id uuid primary key references public.tournament_entrants(id) on delete cascade,
  email text check (email is null or char_length(email) <= 200),
  phone text check (phone is null or char_length(phone) <= 40),
  created_at timestamptz not null default now()
);

create table if not exists public.tournament_pools (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  division_id uuid not null references public.tournament_divisions(id) on delete cascade,
  round integer not null default 1 check (round >= 1),
  label text not null,
  court text,
  created_at timestamptz not null default now(),
  unique (division_id, round, label)
);

create index if not exists tournament_pools_tournament_idx on public.tournament_pools(tournament_id);

create table if not exists public.tournament_pool_players (
  pool_id uuid not null references public.tournament_pools(id) on delete cascade,
  entrant_id uuid not null references public.tournament_entrants(id) on delete cascade,
  seed integer,
  primary key (pool_id, entrant_id)
);

create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  division_id uuid not null references public.tournament_divisions(id) on delete cascade,
  pool_id uuid references public.tournament_pools(id) on delete cascade,
  stage text not null check (stage in ('pool', 'final')),
  round integer not null default 1 check (round >= 1),
  -- Play order within the pool (or within the division's finals).
  sequence integer not null check (sequence >= 1),
  a1 uuid not null references public.profiles(id) on delete restrict,
  a2 uuid not null references public.profiles(id) on delete restrict,
  b1 uuid not null references public.profiles(id) on delete restrict,
  b2 uuid not null references public.profiles(id) on delete restrict,
  -- Point-by-point score while the game is being played, for the public
  -- live page. The final result lives on the linked games row.
  live_score_a integer not null default 0 check (live_score_a between 0 and 99),
  live_score_b integer not null default 0 check (live_score_b between 0 and 99),
  live_updated_at timestamptz,
  game_id uuid unique references public.games(id) on delete set null,
  created_at timestamptz not null default now(),
  check (a1 <> a2 and a1 <> b1 and a1 <> b2 and a2 <> b1 and a2 <> b2 and b1 <> b2)
);

create index if not exists tournament_matches_tournament_idx on public.tournament_matches(tournament_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

-- security definer so child-table policies can check the parent's status
-- without depending on (or recursing through) tournaments' own policy.
create or replace function public.tournament_is_visible(p_tournament_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.tournaments where id = p_tournament_id and status <> 'draft'
  ) or public.is_current_user_admin();
$$;

alter table public.tournaments enable row level security;
alter table public.tournament_divisions enable row level security;
alter table public.tournament_entrants enable row level security;
alter table public.tournament_entrant_contacts enable row level security;
alter table public.tournament_pools enable row level security;
alter table public.tournament_pool_players enable row level security;
alter table public.tournament_matches enable row level security;

create policy "Tournaments are viewable once published"
  on public.tournaments for select
  using (public.tournament_is_visible(id));
create policy "Admins can create tournaments"
  on public.tournaments for insert
  with check (public.is_current_user_admin());
create policy "Admins can update tournaments"
  on public.tournaments for update
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());
-- Only unpublished drafts can be deleted (a mistake made while setting up).
-- Games are never deleted by this: games don't reference tournaments.
create policy "Admins can delete draft tournaments"
  on public.tournaments for delete
  using (public.is_current_user_admin() and status = 'draft');

create policy "Divisions are viewable with their tournament"
  on public.tournament_divisions for select
  using (public.tournament_is_visible(tournament_id));
create policy "Admins can create divisions"
  on public.tournament_divisions for insert
  with check (public.is_current_user_admin());
create policy "Admins can update divisions"
  on public.tournament_divisions for update
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());
create policy "Admins can delete divisions"
  on public.tournament_divisions for delete
  using (public.is_current_user_admin());

create policy "Entrants are viewable with their tournament"
  on public.tournament_entrants for select
  using (public.tournament_is_visible(tournament_id));
create policy "Admins can add entrants"
  on public.tournament_entrants for insert
  with check (public.is_current_user_admin());
create policy "Admins can update entrants"
  on public.tournament_entrants for update
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());
create policy "Admins can remove entrants"
  on public.tournament_entrants for delete
  using (public.is_current_user_admin());

create policy "Only admins can view entrant contact info"
  on public.tournament_entrant_contacts for select
  using (public.is_current_user_admin());
create policy "Only admins can add entrant contact info"
  on public.tournament_entrant_contacts for insert
  with check (public.is_current_user_admin());
create policy "Only admins can update entrant contact info"
  on public.tournament_entrant_contacts for update
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());
create policy "Only admins can delete entrant contact info"
  on public.tournament_entrant_contacts for delete
  using (public.is_current_user_admin());

create policy "Pools are viewable with their tournament"
  on public.tournament_pools for select
  using (public.tournament_is_visible(tournament_id));
create policy "Admins can create pools"
  on public.tournament_pools for insert
  with check (public.is_current_user_admin());
create policy "Admins can update pools"
  on public.tournament_pools for update
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());
create policy "Admins can delete pools"
  on public.tournament_pools for delete
  using (public.is_current_user_admin());

create policy "Pool players are viewable with their tournament"
  on public.tournament_pool_players for select
  using (exists (
    select 1 from public.tournament_pools p
    where p.id = tournament_pool_players.pool_id and public.tournament_is_visible(p.tournament_id)
  ));
create policy "Admins can add pool players"
  on public.tournament_pool_players for insert
  with check (public.is_current_user_admin());
create policy "Admins can remove pool players"
  on public.tournament_pool_players for delete
  using (public.is_current_user_admin());

create policy "Matches are viewable with their tournament"
  on public.tournament_matches for select
  using (public.tournament_is_visible(tournament_id));
create policy "Admins can schedule matches"
  on public.tournament_matches for insert
  with check (public.is_current_user_admin() and game_id is null);
-- A scored match can't be rewritten or removed from the schedule (that
-- would leave its game pointing at the wrong players). To fix a scored
-- match, delete its game first (Edit Game -> Delete), which reopens it.
create policy "Admins can update unscored matches"
  on public.tournament_matches for update
  using (public.is_current_user_admin() and game_id is null)
  with check (public.is_current_user_admin() and game_id is null);
create policy "Admins can remove unscored matches"
  on public.tournament_matches for delete
  using (public.is_current_user_admin() and game_id is null);

-- Deleting a pool cascades to its matches at the FK level, which bypasses
-- the "unscored only" delete policy above. Guard it here so regenerating
-- pools can never silently unlink a scored game from its tournament.
create or replace function public.prevent_scored_match_delete()
returns trigger
language plpgsql
as $$
begin
  if old.game_id is not null then
    raise exception 'this tournament game already has a score; delete its game first';
  end if;
  return old;
end;
$$;

drop trigger if exists before_tournament_match_delete on public.tournament_matches;
create trigger before_tournament_match_delete
  before delete on public.tournament_matches
  for each row execute function public.prevent_scored_match_delete();

-- ---------------------------------------------------------------------------
-- Score entry (any signed-in user)
-- ---------------------------------------------------------------------------

create or replace function public.submit_tournament_match_score(
  p_match_id uuid,
  p_score_a integer,
  p_score_b integer
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  m record;
  t record;
  a1_name text;
  a2_name text;
  b1_name text;
  b2_name text;
  submitter_name text;
  new_game_id uuid;
  local_now timestamp;
begin
  if auth.uid() is null then
    raise exception 'sign in to enter scores';
  end if;
  if p_score_a is null or p_score_b is null or p_score_a < 0 or p_score_b < 0
     or p_score_a > 99 or p_score_b > 99 then
    raise exception 'scores must be between 0 and 99';
  end if;
  if p_score_a = p_score_b then
    raise exception 'a game can''t end in a tie';
  end if;

  select * into m from public.tournament_matches where id = p_match_id for update;
  if m.id is null then
    raise exception 'tournament game not found';
  end if;
  if m.game_id is not null then
    raise exception 'this game already has a score';
  end if;

  select * into t from public.tournaments where id = m.tournament_id;
  if t.status <> 'live' then
    raise exception 'scores can only be entered while the tournament is running';
  end if;

  select display_name into a1_name from public.profiles where id = m.a1;
  select display_name into a2_name from public.profiles where id = m.a2;
  select display_name into b1_name from public.profiles where id = m.b1;
  select display_name into b2_name from public.profiles where id = m.b2;
  select display_name into submitter_name from public.profiles where id = auth.uid();

  -- Same local date/time format the app writes for live games ("YYYY-MM-DD",
  -- "HH:MM"); the club plays in Brevard County, FL.
  local_now := now() at time zone 'America/New_York';

  insert into public.games (
    user_id, name_a, name_b, score_a, score_b, mode, played_date, played_time,
    submitted_by_name, format, team_size
  ) values (
    m.a1,
    a1_name || ' & ' || a2_name,
    b1_name || ' & ' || b2_name,
    p_score_a,
    p_score_b,
    case when t.ranked then 'ranked' else 'casual' end,
    local_now::date,
    to_char(local_now, 'HH24:MI'),
    coalesce(submitter_name, 'A player'),
    'beach',
    null
  )
  returning id into new_game_id;

  -- One multi-row insert, exactly like a live 2v2 game save, so the
  -- existing per-row Elo trigger (handle_game_players_insert) rates the
  -- game once all three slot rows exist.
  insert into public.game_players (game_id, user_id, slot)
    values
      (new_game_id, m.a2, 'a2'),
      (new_game_id, m.b1, 'b1'),
      (new_game_id, m.b2, 'b2');

  update public.tournament_matches
    set game_id = new_game_id,
        live_score_a = p_score_a,
        live_score_b = p_score_b,
        live_updated_at = now()
    where id = p_match_id;

  return new_game_id;
end;
$$;

grant execute on function public.submit_tournament_match_score(uuid, integer, integer) to authenticated;

-- Point-by-point progress for the public live page. Same audience as score
-- entry (any signed-in user), only while the game is unscored and the
-- tournament is running.
create or replace function public.update_tournament_match_live_score(
  p_match_id uuid,
  p_score_a integer,
  p_score_b integer
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'sign in to enter scores';
  end if;
  if p_score_a is null or p_score_b is null or p_score_a < 0 or p_score_b < 0
     or p_score_a > 99 or p_score_b > 99 then
    raise exception 'scores must be between 0 and 99';
  end if;

  update public.tournament_matches m
    set live_score_a = p_score_a,
        live_score_b = p_score_b,
        live_updated_at = now()
    from public.tournaments t
    where m.id = p_match_id
      and t.id = m.tournament_id
      and t.status = 'live'
      and m.game_id is null;
end;
$$;

grant execute on function public.update_tournament_match_live_score(uuid, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- merge_profiles(): unchanged from migration 20261009120000, plus moving
-- tournament records (entries, schedule slots) to the kept profile.
-- ---------------------------------------------------------------------------

create or replace function public.merge_profiles(
  p_keep_id uuid,
  p_remove_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  keep_is_manual boolean;
  remove_is_manual boolean;
  conflict record;
  tournament_conflict record;
begin
  perform public.require_admin();

  if p_keep_id is null or p_remove_id is null then
    raise exception 'both a profile to keep and a profile to remove are required';
  end if;
  if p_keep_id = p_remove_id then
    raise exception 'cannot merge a profile with itself';
  end if;

  select is_manual into keep_is_manual from public.profiles where id = p_keep_id;
  select is_manual into remove_is_manual from public.profiles where id = p_remove_id;

  if keep_is_manual is null or remove_is_manual is null then
    raise exception 'both profiles must exist';
  end if;
  if not remove_is_manual then
    raise exception 'the profile to remove must be a manual profile';
  end if;

  select g.id, g.played_date, g.name_a, g.name_b into conflict
    from public.games g
    where g.format = 'beach' and g.team_size is null
      and (g.user_id = p_keep_id or exists (
        select 1 from public.game_players gp where gp.game_id = g.id and gp.user_id = p_keep_id))
      and (g.user_id = p_remove_id or exists (
        select 1 from public.game_players gp where gp.game_id = g.id and gp.user_id = p_remove_id))
    limit 1;
  if conflict.id is not null then
    raise exception 'both profiles are players in the same game (% — % vs %). Fix that game with Edit Game first, then merge.',
      conflict.played_date, conflict.name_a, conflict.name_b;
  end if;

  -- New: both entered in the same tournament means two entries for one
  -- person; the admin should remove one entry first.
  select t.name into tournament_conflict
    from public.tournament_entrants e_keep
    join public.tournament_entrants e_remove
      on e_remove.tournament_id = e_keep.tournament_id and e_remove.profile_id = p_remove_id
    join public.tournaments t on t.id = e_keep.tournament_id
    where e_keep.profile_id = p_keep_id
    limit 1;
  if tournament_conflict.name is not null then
    raise exception 'both profiles are entered in the same tournament (%). Remove one of the entries first, then merge.',
      tournament_conflict.name;
  end if;

  delete from public.game_players gp_remove
    where gp_remove.user_id = p_remove_id
      and exists (
        select 1 from public.game_players gp_keep
        where gp_keep.game_id = gp_remove.game_id and gp_keep.user_id = p_keep_id
      );

  update public.game_players
    set user_id = p_keep_id
    where user_id = p_remove_id;

  update public.games
    set user_id = p_keep_id
    where user_id = p_remove_id;

  -- New: tournament records.
  update public.tournament_entrants set profile_id = p_keep_id where profile_id = p_remove_id;
  update public.tournament_matches set a1 = p_keep_id where a1 = p_remove_id;
  update public.tournament_matches set a2 = p_keep_id where a2 = p_remove_id;
  update public.tournament_matches set b1 = p_keep_id where b1 = p_remove_id;
  update public.tournament_matches set b2 = p_keep_id where b2 = p_remove_id;

  delete from public.profiles where id = p_remove_id;
end;
$$;

grant execute on function public.merge_profiles(uuid, uuid) to authenticated;
