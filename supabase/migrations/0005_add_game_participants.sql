-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New
-- query) and run it manually. There is no Supabase CLI project linked here,
-- so migrations in this folder are not applied automatically.
--
-- Links non-submitter beach-game participants (player slots A2/B1/B2) to real
-- profiles when the submitter picked them from the player search, for both
-- ranked and casual games. The submitter (A1) is already identified via
-- games.user_id and does NOT get a row here. Going-forward only — existing
-- games rows are not backfilled.
--
-- A join table (not nullable id columns on games) because this is a
-- relationship with its own lifecycle (0-3 rows, optional, queried from the
-- other direction too — profile -> their games), independent of the
-- name_a/name_b display text already on games. Keeps RLS to one EXISTS
-- clause instead of a 3-column OR.

create table if not exists public.game_players (
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create index if not exists game_players_user_id_idx on public.game_players(user_id);

alter table public.game_players enable row level security;

-- Participants (and the submitter, via the games FK) can see link rows for
-- games they're entitled to see. This references public.games, and games'
-- own SELECT policy (below) references this table back — a standard mutual
-- EXISTS pattern for "shared access via join table", not infinite recursion:
-- each subquery is a bounded, planner-resolved lookup, not a recursive call.
create policy "Participants can view their game links"
  on public.game_players for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.games g
      where g.id = game_players.game_id and g.user_id = auth.uid()
    )
  );

-- Only the submitter may link participants, and only at creation time
-- (no update policy — links are immutable like games rows).
create policy "Submitters can add participant links to their own games"
  on public.game_players for insert
  with check (
    exists (
      select 1 from public.games g
      where g.id = game_players.game_id and g.user_id = auth.uid()
    )
  );

-- Extend games' SELECT policy: submitter OR linked participant (previously
-- submitter-only, which meant a game was invisible to anyone it was selected
-- for besides whoever happened to save it).
drop policy if exists "Users can view their own games" on public.games;

create policy "Users can view their own or linked games"
  on public.games for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.game_players gp
      where gp.game_id = games.id and gp.user_id = auth.uid()
    )
  );

-- Denormalized display name of whoever submitted the game, captured at
-- insert time (same precedent as name_a/name_b being flattened display text
-- rather than a live join) — immune to later profile renames, and avoids a
-- read-time join against profiles just to label the rows a viewer doesn't
-- own.
alter table public.games
  add column if not exists submitted_by_name text;
