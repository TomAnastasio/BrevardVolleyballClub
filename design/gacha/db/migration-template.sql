-- Tokens, cosmetic items and Cauldron pulls (owner approved 2026-10-24; the
-- plan is design/gacha/DATABASE.md on branch claude/gacha-avatars-design).
--
-- Purely additive: new tables, functions and triggers only. Nothing here
-- changes games, game_players, profiles or Elo, or any existing function.
--
-- Tokens are earned per player, per game, once:
--   - ranked games only, saved after this migration ran (no back pay)
--   - 2 for a win, otherwise 1, at most 10 per Eastern-time day (the day the
--     game was saved)
--   - only accounts that sign in (never placeholder/manual profiles)
--   - paid when the game is "settled", at least 1 minute after it was saved,
--     so a 2v2 beach game's Player 1 reassignment (assign_beach_game_a1,
--     called a second after the save) is in place before anyone is paid
--   - never taken back (deleted game, removed player, changed score) and never
--     paid twice
--   - games a placeholder brings into a real account through merge_profiles
--     never pay (owner's call)
-- A pull (brew) spends 1 token and rolls on the server: a tier by pull_odds
-- (tiers with nothing left for the player share out their odds), then a
-- random item in it that the player doesn't own yet.

-- ---------------------------------------------------------------- settings
create table public.token_settings (
  id boolean primary key default true check (id),
  started_at timestamptz not null default now(),
  settle_delay interval not null default interval '1 minute',
  daily_cap integer not null default 10
);
insert into public.token_settings default values;

-- ---------------------------------------------------------------- tokens
create table public.token_balances (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  earned integer not null default 0,
  spent integer not null default 0,
  updated_at timestamptz not null default now()
);

-- One row per (player, game) once settled, even when it paid 0, so a game is
-- never looked at again for that player. No foreign key to games: a deleted
-- game keeps its record (and its tokens stay spent or in the balance).
create table public.token_earnings (
  player_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null,
  tokens smallint not null check (tokens between 0 and 2),
  earned_day date not null,
  reason text not null check (reason in ('win', 'game', 'daily_cap', 'merged')),
  created_at timestamptz not null default now(),
  primary key (player_id, game_id)
);
create index token_earnings_player_day on public.token_earnings (player_id, earned_day);

-- Scratch list for spotting merges: a game moving from a placeholder to
-- someone else is noted here, and if the placeholder is deleted in the same
-- transaction (which is what merge_profiles does), that game is marked
-- "never pays" for its new owner. Rows from anything else (admin edits)
-- are harmless and cleared after a day.
create table public.token_merge_moves (
  game_id uuid not null,
  from_id uuid not null,
  to_id uuid not null,
  txid bigint not null default txid_current(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- items
create table public.cosmetic_items (
  key text primary key,
  slot text not null check (slot in ('head', 'shirt', 'pants', 'shoes', 'transformation')),
  tier text not null check (tier in ('common', 'rare', 'epic', 'legendary')),
  name text not null,
  item_set text not null,
  available_until timestamptz,
  created_at timestamptz not null default now()
);

create table public.pull_odds (
  tier text primary key check (tier in ('common', 'rare', 'epic', 'legendary')),
  share numeric not null check (share >= 0),
  sort smallint not null
);
insert into public.pull_odds (tier, share, sort) values
  ('common', 76, 1), ('rare', 20, 2), ('epic', 3.8, 3), ('legendary', 0.2, 4);

create table public.player_items (
  player_id uuid not null references public.profiles(id) on delete cascade,
  item_key text not null references public.cosmetic_items(key),
  obtained_at timestamptz not null default now(),
  seen_at timestamptz,
  primary key (player_id, item_key)
);

create table public.player_outfits (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  head text references public.cosmetic_items(key),
  shirt text references public.cosmetic_items(key),
  pants text references public.cosmetic_items(key),
  shoes text references public.cosmetic_items(key),
  transformation text references public.cosmetic_items(key),
  updated_at timestamptz not null default now()
);

create table public.pulls (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  item_key text not null references public.cosmetic_items(key),
  tier text not null,
  pulled_at timestamptz not null default now()
);
create index pulls_player on public.pulls (player_id, pulled_at);

-- ---------------------------------------------------------------- who can read
-- No insert/update/delete policies anywhere: every change goes through the
-- functions below.
alter table public.token_settings enable row level security;
alter table public.token_balances enable row level security;
alter table public.token_earnings enable row level security;
alter table public.token_merge_moves enable row level security;
alter table public.cosmetic_items enable row level security;
alter table public.pull_odds enable row level security;
alter table public.player_items enable row level security;
alter table public.player_outfits enable row level security;
alter table public.pulls enable row level security;

create policy "Token settings are public" on public.token_settings for select using (true);
create policy "Players see their own token balance" on public.token_balances for select using (player_id = auth.uid());
create policy "Players see their own token earnings" on public.token_earnings for select using (player_id = auth.uid());
create policy "The item catalog is public" on public.cosmetic_items for select using (true);
create policy "Pull odds are public" on public.pull_odds for select using (true);
create policy "Players see their own items" on public.player_items for select using (player_id = auth.uid());
create policy "Outfits are public" on public.player_outfits for select using (true);
create policy "Players see their own pulls" on public.pulls for select using (player_id = auth.uid());

-- ---------------------------------------------------------------- merges
-- (two copies because the game id lives in a different column on each table)
create or replace function public.note_token_merge_move_game_players()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.user_id is distinct from new.user_id
     and exists (select 1 from public.profiles where id = old.user_id and is_manual) then
    insert into public.token_merge_moves (game_id, from_id, to_id) values (new.game_id, old.user_id, new.user_id);
  end if;
  return new;
end;
$$;

create or replace function public.note_token_merge_move_games()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.user_id is distinct from new.user_id
     and exists (select 1 from public.profiles where id = old.user_id and is_manual) then
    insert into public.token_merge_moves (game_id, from_id, to_id) values (new.id, old.user_id, new.user_id);
  end if;
  return new;
end;
$$;

create trigger token_merge_move_game_players
  before update of user_id on public.game_players
  for each row execute function public.note_token_merge_move_game_players();
create trigger token_merge_move_games
  before update of user_id on public.games
  for each row execute function public.note_token_merge_move_games();

create or replace function public.mark_merged_games_unpaid()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.token_earnings (player_id, game_id, tokens, earned_day, reason)
  select distinct on (m.to_id, m.game_id)
         m.to_id, m.game_id, 0, (g.created_at at time zone 'America/New_York')::date, 'merged'
    from public.token_merge_moves m
    join public.games g on g.id = m.game_id
    join public.profiles p on p.id = m.to_id
    where m.from_id = old.id and m.txid = txid_current()
  on conflict (player_id, game_id) do nothing;
  delete from public.token_merge_moves
    where (from_id = old.id and txid = txid_current()) or created_at < now() - interval '1 day';
  return old;
end;
$$;

create trigger token_mark_merged_games_unpaid
  after delete on public.profiles
  for each row when (old.is_manual)
  execute function public.mark_merged_games_unpaid();

-- ---------------------------------------------------------------- settling
-- Pays a player for every settled-but-unpaid ranked game they're in. Which
-- side they were on follows the app's sideForPlayer (usePlayerGames.js): a
-- game_players row's team, else its slot (a2 = team a, b1/b2 = team b), else
-- games.user_id as a classic 2v2 beach game's Player 1 (team a).
create or replace function public.settle_tokens(p_player uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s public.token_settings;
  g record;
  used integer;
  give integer;
  base integer;
begin
  if not exists (select 1 from public.profiles where id = p_player and not is_manual) then
    return;
  end if;
  select * into s from public.token_settings;

  insert into public.token_balances (player_id) values (p_player) on conflict do nothing;
  -- one settle (or pull) at a time per player
  perform 1 from public.token_balances where player_id = p_player for update;

  for g in
    select x.id, x.won, (x.created_at at time zone 'America/New_York')::date as day
    from (
      select gm.id, gm.created_at,
             case side when 'a' then gm.score_a > gm.score_b else gm.score_b > gm.score_a end as won
      from (
        select gm.*,
               coalesce(
                 (select coalesce(gp.team, case when gp.slot like 'a%' then 'a' when gp.slot is not null then 'b' end)
                    from public.game_players gp where gp.game_id = gm.id and gp.user_id = p_player limit 1),
                 case when gm.format = 'beach' and gm.team_size is null and gm.user_id = p_player then 'a' end
               ) as side
        from public.games gm
        where gm.mode = 'ranked'
          and gm.created_at >= s.started_at
          and gm.created_at <= now() - s.settle_delay
          and not exists (select 1 from public.token_earnings e where e.player_id = p_player and e.game_id = gm.id)
      ) gm
      where gm.side is not null
    ) x
    order by x.created_at, x.id
  loop
    select coalesce(sum(tokens), 0) into used
      from public.token_earnings where player_id = p_player and earned_day = g.day;
    base := case when g.won then 2 else 1 end;
    give := greatest(0, least(base, s.daily_cap - used));
    insert into public.token_earnings (player_id, game_id, tokens, earned_day, reason)
    values (p_player, g.id, give, g.day,
            case when give < base then 'daily_cap' when g.won then 'win' else 'game' end);
    if give > 0 then
      update public.token_balances
        set balance = balance + give, earned = earned + give, updated_at = now()
        where player_id = p_player;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------- app calls
create or replace function public.my_tokens()
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b public.token_balances;
begin
  if uid is null then
    raise exception 'Sign in to see your tokens.';
  end if;
  perform public.settle_tokens(uid);
  select * into b from public.token_balances where player_id = uid;
  return json_build_object('balance', coalesce(b.balance, 0), 'earned', coalesce(b.earned, 0), 'spent', coalesce(b.spent, 0));
end;
$$;

create or replace function public.brew()
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bal integer;
  roll numeric;
  picked_tier text;
  item public.cosmetic_items;
begin
  if uid is null then
    raise exception 'Sign in to brew.';
  end if;
  if not exists (select 1 from public.profiles where id = uid and not is_manual) then
    raise exception 'Only signed-in players can brew.';
  end if;
  perform public.settle_tokens(uid);
  select balance into bal from public.token_balances where player_id = uid for update;
  if coalesce(bal, 0) < 1 then
    raise exception 'You need a token to brew. Play a ranked game to earn more.';
  end if;

  -- Roll a tier among those that still have something this player can win
  -- (a tier with nothing left shares its odds out with the rest).
  roll := random();
  with open_tiers as (
    select o.tier, o.share, o.sort
    from public.pull_odds o
    where o.share > 0 and exists (
      select 1 from public.cosmetic_items i
      where i.tier = o.tier
        and (i.available_until is null or i.available_until > now())
        and not exists (select 1 from public.player_items pi where pi.player_id = uid and pi.item_key = i.key))
  ), ranges as (
    select tier, sort,
           sum(share) over (order by sort) / sum(share) over () as hi
    from open_tiers
  )
  -- first tier whose range reaches past the roll; the last one catches rounding
  select tier into picked_tier from ranges order by (roll < hi) desc, case when roll < hi then sort else -sort end limit 1;
  if picked_tier is null then
    raise exception 'There''s nothing left to brew right now. Your tokens will keep.';
  end if;

  select i.* into item
    from public.cosmetic_items i
    where i.tier = picked_tier
      and (i.available_until is null or i.available_until > now())
      and not exists (select 1 from public.player_items pi where pi.player_id = uid and pi.item_key = i.key)
    order by random()
    limit 1;

  insert into public.player_items (player_id, item_key) values (uid, item.key);
  update public.token_balances
    set balance = balance - 1, spent = spent + 1, updated_at = now()
    where player_id = uid;
  insert into public.pulls (player_id, item_key, tier) values (uid, item.key, item.tier);

  return json_build_object('key', item.key, 'slot', item.slot, 'tier', item.tier, 'name', item.name, 'balance', bal - 1);
end;
$$;

-- Wear something you own. Clothing takes off a transformation; a
-- transformation covers the outfit underneath (which is kept for later).
create or replace function public.equip_item(p_key text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  item_slot text;
begin
  if uid is null then
    raise exception 'Sign in to change your outfit.';
  end if;
  if not exists (select 1 from public.player_items where player_id = uid and item_key = p_key) then
    raise exception 'You don''t own that item.';
  end if;
  select slot into item_slot from public.cosmetic_items where key = p_key;
  insert into public.player_outfits (player_id) values (uid) on conflict do nothing;
  update public.player_outfits set
    head = case when item_slot = 'head' then p_key else head end,
    shirt = case when item_slot = 'shirt' then p_key else shirt end,
    pants = case when item_slot = 'pants' then p_key else pants end,
    shoes = case when item_slot = 'shoes' then p_key else shoes end,
    transformation = case when item_slot = 'transformation' then p_key else null end,
    updated_at = now()
  where player_id = uid;
end;
$$;

-- Take a slot off ("Plain"), or 'transformation' for "Back to my outfit".
create or replace function public.unequip(p_slot text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sign in to change your outfit.';
  end if;
  if p_slot not in ('head', 'shirt', 'pants', 'shoes', 'transformation') then
    raise exception 'Unknown slot %', p_slot;
  end if;
  update public.player_outfits set
    head = case when p_slot = 'head' then null else head end,
    shirt = case when p_slot = 'shirt' then null else shirt end,
    pants = case when p_slot = 'pants' then null else pants end,
    shoes = case when p_slot = 'shoes' then null else shoes end,
    transformation = case when p_slot = 'transformation' then null else transformation end,
    updated_at = now()
  where player_id = uid;
end;
$$;

-- Clears the NEW badges on everything the player owns.
create or replace function public.mark_items_seen()
returns void
language sql
security definer set search_path = public
as $$
  update public.player_items set seen_at = now() where player_id = auth.uid() and seen_at is null;
$$;

-- Only the five app calls are callable, and only when signed in.
revoke execute on function public.note_token_merge_move_game_players() from public, anon, authenticated;
revoke execute on function public.note_token_merge_move_games() from public, anon, authenticated;
revoke execute on function public.mark_merged_games_unpaid() from public, anon, authenticated;
revoke execute on function public.settle_tokens(uuid) from public, anon, authenticated;
revoke execute on function public.my_tokens() from public, anon;
revoke execute on function public.brew() from public, anon;
revoke execute on function public.equip_item(text) from public, anon;
revoke execute on function public.unequip(text) from public, anon;
revoke execute on function public.mark_items_seen() from public, anon;
grant execute on function public.my_tokens() to authenticated;
grant execute on function public.brew() to authenticated;
grant execute on function public.equip_item(text) to authenticated;
grant execute on function public.unequip(text) to authenticated;
grant execute on function public.mark_items_seen() to authenticated;

-- ---------------------------------------------------------------- catalog
-- Generated from the design data by design/gacha/source/catalog.mjs (branch
-- claude/gacha-avatars-design). Keys are permanent: the app's item art uses
-- the same ones. Halloween 2026 items stop dropping at midnight Eastern going
-- into December 1st; owners keep them.
insert into public.cosmetic_items (key, slot, tier, name, item_set, available_until) values
-- CATALOG --
;
