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
  ('head/witch-hat/common/ringed-midnight', 'head', 'common', 'Witch Hat: Ringed (midnight)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/witch-hat/common/ringed-witch-purple', 'head', 'common', 'Witch Hat: Ringed (witch purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/witch-hat/common/ringed-swamp-green', 'head', 'common', 'Witch Hat: Ringed (swamp green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/witch-hat/common/ringed-pumpkin', 'head', 'common', 'Witch Hat: Ringed (pumpkin)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/witch-hat/common/ringed-moonlit-blue', 'head', 'common', 'Witch Hat: Ringed (moonlit blue)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/witch-hat/common/ringed-blood-red', 'head', 'common', 'Witch Hat: Ringed (blood red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/witch-hat/rare/candy-corn', 'head', 'rare', 'Candy Corn', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/witch-hat/epic/jack-o-lantern-band', 'head', 'epic', 'Jack-o''-Lantern Band', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/witch-hat/epic/bat-perch', 'head', 'epic', 'Bat Perch', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/witch-hat/legendary/ghostfire', 'head', 'legendary', 'Ghostfire', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/witch-hat/legendary/living-hat', 'head', 'legendary', 'Living Hat', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/common/classic-carve-orange', 'head', 'common', 'Pumpkin Helmet: Classic Carve (orange)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/common/classic-carve-ghost-white', 'head', 'common', 'Pumpkin Helmet: Classic Carve (ghost white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/common/classic-carve-gourd-green', 'head', 'common', 'Pumpkin Helmet: Classic Carve (gourd green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/common/classic-carve-blue-heirloom', 'head', 'common', 'Pumpkin Helmet: Classic Carve (blue heirloom)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/common/classic-carve-cinderella-red', 'head', 'common', 'Pumpkin Helmet: Classic Carve (cinderella red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/common/classic-carve-rotten', 'head', 'common', 'Pumpkin Helmet: Classic Carve (rotten)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/common/grumpy-carve-orange', 'head', 'common', 'Pumpkin Helmet: Grumpy Carve (orange)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/common/grumpy-carve-ghost-white', 'head', 'common', 'Pumpkin Helmet: Grumpy Carve (ghost white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/common/grumpy-carve-gourd-green', 'head', 'common', 'Pumpkin Helmet: Grumpy Carve (gourd green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/common/grumpy-carve-blue-heirloom', 'head', 'common', 'Pumpkin Helmet: Grumpy Carve (blue heirloom)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/common/grumpy-carve-cinderella-red', 'head', 'common', 'Pumpkin Helmet: Grumpy Carve (cinderella red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/common/grumpy-carve-rotten', 'head', 'common', 'Pumpkin Helmet: Grumpy Carve (rotten)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/rare/pumpkin-king', 'head', 'rare', 'Pumpkin King', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/epic/chomper', 'head', 'epic', 'Chomper', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/legendary/headless-horseman', 'head', 'legendary', 'Headless Horseman', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/pumpkin-helmet/legendary/possessed', 'head', 'legendary', 'Possessed', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/skeleton-tee/common/classic-ribcage-black', 'shirt', 'common', 'Skeleton Tee: Classic Ribcage (black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/skeleton-tee/common/classic-ribcage-charcoal', 'shirt', 'common', 'Skeleton Tee: Classic Ribcage (charcoal)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/skeleton-tee/common/classic-ribcage-witch-purple', 'shirt', 'common', 'Skeleton Tee: Classic Ribcage (witch purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/skeleton-tee/common/classic-ribcage-blood-red', 'shirt', 'common', 'Skeleton Tee: Classic Ribcage (blood red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/skeleton-tee/common/classic-ribcage-swamp-green', 'shirt', 'common', 'Skeleton Tee: Classic Ribcage (swamp green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/skeleton-tee/common/classic-ribcage-midnight-blue', 'shirt', 'common', 'Skeleton Tee: Classic Ribcage (midnight blue)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/skeleton-tee/rare/glow-bones', 'shirt', 'rare', 'Glow Bones', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/skeleton-tee/epic/beating-heart', 'shirt', 'epic', 'Beating Heart', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/skeleton-tee/legendary/lich-armor', 'shirt', 'legendary', 'Lich Armor', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/skeleton-tee/legendary/ectoplasm', 'shirt', 'legendary', 'Ectoplasm', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/skeleton-tee/legendary/rave-bones', 'shirt', 'legendary', 'Rave Bones', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/witch-stockings/common/classic-stripes-witch-purple', 'pants', 'common', 'Witch Stockings: Classic Stripes (witch purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/witch-stockings/common/classic-stripes-pumpkin', 'pants', 'common', 'Witch Stockings: Classic Stripes (pumpkin)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/witch-stockings/common/classic-stripes-slime', 'pants', 'common', 'Witch Stockings: Classic Stripes (slime)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/witch-stockings/common/classic-stripes-blood', 'pants', 'common', 'Witch Stockings: Classic Stripes (blood)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/witch-stockings/common/classic-stripes-bone', 'pants', 'common', 'Witch Stockings: Classic Stripes (bone)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/witch-stockings/common/classic-stripes-candy', 'pants', 'common', 'Witch Stockings: Classic Stripes (candy)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/witch-stockings/rare/mismatched', 'pants', 'rare', 'Mismatched', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/witch-stockings/epic/marquee-stripes', 'pants', 'epic', 'Marquee Stripes', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/witch-stockings/epic/potion-belt', 'pants', 'epic', 'Potion Belt', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/witch-stockings/legendary/bubbling-brew', 'pants', 'legendary', 'Bubbling Brew', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/witch-stockings/legendary/flame-stockings', 'pants', 'legendary', 'Flame Stockings', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/devil-horns/common/devil-red', 'head', 'common', 'Devil Horns (devil red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/devil-horns/common/coal-black', 'head', 'common', 'Devil Horns (coal black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/devil-horns/common/bone', 'head', 'common', 'Devil Horns (bone)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/devil-horns/common/witch-purple', 'head', 'common', 'Devil Horns (witch purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/devil-horns/common/pumpkin', 'head', 'common', 'Devil Horns (pumpkin)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/devil-horns/common/slime-green', 'head', 'common', 'Devil Horns (slime green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/devil-horns/rare/bighorn-curls', 'head', 'rare', 'Bighorn Curls', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/devil-horns/epic/smoking-horns', 'head', 'epic', 'Smoking Horns', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/devil-horns/legendary/lava-horns', 'head', 'legendary', 'Lava Horns', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/cat-ears/common/black-cat', 'head', 'common', 'Cat Ears (black cat)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/cat-ears/common/orange-tabby', 'head', 'common', 'Cat Ears (orange tabby)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/cat-ears/common/snow-white', 'head', 'common', 'Cat Ears (snow white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/cat-ears/common/smoke-grey', 'head', 'common', 'Cat Ears (smoke grey)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/cat-ears/common/chocolate', 'head', 'common', 'Cat Ears (chocolate)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/cat-ears/common/witch-purple', 'head', 'common', 'Cat Ears (witch purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/cat-ears/rare/calico-bell', 'head', 'rare', 'Calico Bell', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/cat-ears/epic/flicking-ears', 'head', 'epic', 'Flicking Ears', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/cat-ears/legendary/witchs-familiar', 'head', 'legendary', 'Witch''s Familiar', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/mummy-wraps/common/linen', 'head', 'common', 'Mummy Wraps (linen)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/mummy-wraps/common/ash-grey', 'head', 'common', 'Mummy Wraps (ash grey)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/mummy-wraps/common/tea-stained', 'head', 'common', 'Mummy Wraps (tea-stained)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/mummy-wraps/common/soot-black', 'head', 'common', 'Mummy Wraps (soot black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/mummy-wraps/common/moss', 'head', 'common', 'Mummy Wraps (moss)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/mummy-wraps/common/dusty-rose', 'head', 'common', 'Mummy Wraps (dusty rose)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/mummy-wraps/rare/pharaohs-headdress', 'head', 'rare', 'Pharaoh''s Headdress', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/mummy-wraps/epic/peekaboo', 'head', 'epic', 'Peekaboo', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/mummy-wraps/legendary/tomb-king', 'head', 'legendary', 'Tomb King', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/reaper-hood/common/grave-black', 'head', 'common', 'Reaper Hood (grave black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/reaper-hood/common/ash-grey', 'head', 'common', 'Reaper Hood (ash grey)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/reaper-hood/common/blood-red', 'head', 'common', 'Reaper Hood (blood red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/reaper-hood/common/bone', 'head', 'common', 'Reaper Hood (bone)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/reaper-hood/common/midnight', 'head', 'common', 'Reaper Hood (midnight)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/reaper-hood/common/moss', 'head', 'common', 'Reaper Hood (moss)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/reaper-hood/rare/tattered-hood', 'head', 'rare', 'Tattered Hood', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/reaper-hood/epic/smoldering-eyes', 'head', 'epic', 'Smoldering Eyes', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/reaper-hood/legendary/void-hood', 'head', 'legendary', 'Void Hood', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/frankenstein-flat-top/common/jet-black', 'head', 'common', 'Frankenstein Flat-Top (jet black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/frankenstein-flat-top/common/swamp-green', 'head', 'common', 'Frankenstein Flat-Top (swamp green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/frankenstein-flat-top/common/ash-grey', 'head', 'common', 'Frankenstein Flat-Top (ash grey)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/frankenstein-flat-top/common/dark-brown', 'head', 'common', 'Frankenstein Flat-Top (dark brown)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/frankenstein-flat-top/common/navy', 'head', 'common', 'Frankenstein Flat-Top (navy)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/frankenstein-flat-top/common/bruise-purple', 'head', 'common', 'Frankenstein Flat-Top (bruise purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/frankenstein-flat-top/rare/monster-makeup', 'head', 'rare', 'Monster Makeup', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/frankenstein-flat-top/epic/sparking-bolts', 'head', 'epic', 'Sparking Bolts', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/frankenstein-flat-top/legendary/its-alive', 'head', 'legendary', 'It''s Alive!', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/skull-mask/common/bone', 'head', 'common', 'Skull Mask (bone)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/skull-mask/common/ash', 'head', 'common', 'Skull Mask (ash)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/skull-mask/common/obsidian', 'head', 'common', 'Skull Mask (obsidian)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/skull-mask/common/blood', 'head', 'common', 'Skull Mask (blood)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/skull-mask/common/jade', 'head', 'common', 'Skull Mask (jade)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/skull-mask/common/pumpkin', 'head', 'common', 'Skull Mask (pumpkin)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/skull-mask/rare/sugar-skull', 'head', 'rare', 'Sugar Skull', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/skull-mask/epic/chattering-skull', 'head', 'epic', 'Chattering Skull', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/skull-mask/legendary/flaming-skull', 'head', 'legendary', 'Flaming Skull', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/spider-friend/common/black', 'head', 'common', 'Spider Friend (black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/spider-friend/common/tarantula-brown', 'head', 'common', 'Spider Friend (tarantula brown)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/spider-friend/common/ash-grey', 'head', 'common', 'Spider Friend (ash grey)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/spider-friend/common/venom-purple', 'head', 'common', 'Spider Friend (venom purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/spider-friend/common/poison-green', 'head', 'common', 'Spider Friend (poison green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/spider-friend/common/ghost-white', 'head', 'common', 'Spider Friend (ghost white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/spider-friend/rare/black-widow', 'head', 'rare', 'Black Widow', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/spider-friend/epic/restless-spider', 'head', 'epic', 'Restless Spider', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/spider-friend/legendary/spider-queen', 'head', 'legendary', 'Spider Queen', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/candle-crown/common/ivory', 'head', 'common', 'Candle Crown (ivory)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/candle-crown/common/black', 'head', 'common', 'Candle Crown (black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/candle-crown/common/witch-purple', 'head', 'common', 'Candle Crown (witch purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/candle-crown/common/blood-red', 'head', 'common', 'Candle Crown (blood red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/candle-crown/common/pumpkin', 'head', 'common', 'Candle Crown (pumpkin)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/candle-crown/common/moss-green', 'head', 'common', 'Candle Crown (moss green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/candle-crown/rare/skull-candelabra', 'head', 'rare', 'Skull Candelabra', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/candle-crown/epic/flickering-flames', 'head', 'epic', 'Flickering Flames', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/candle-crown/legendary/witch-fire', 'head', 'legendary', 'Witch Fire', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/brain-dome/common/clear', 'head', 'common', 'Brain Dome (clear)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/brain-dome/common/formula-green', 'head', 'common', 'Brain Dome (formula green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/brain-dome/common/ice-blue', 'head', 'common', 'Brain Dome (ice blue)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/brain-dome/common/potion-purple', 'head', 'common', 'Brain Dome (potion purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/brain-dome/common/amber', 'head', 'common', 'Brain Dome (amber)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/brain-dome/common/blood', 'head', 'common', 'Brain Dome (blood)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/brain-dome/rare/cyborg-brain', 'head', 'rare', 'Cyborg Brain', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/brain-dome/epic/big-thinker', 'head', 'epic', 'Big Thinker', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/brain-dome/legendary/galaxy-brain', 'head', 'legendary', 'Galaxy Brain', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/plague-doctor/common/black-leather', 'head', 'common', 'Plague Doctor (black leather)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/plague-doctor/common/saddle-brown', 'head', 'common', 'Plague Doctor (saddle brown)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/plague-doctor/common/bone-white', 'head', 'common', 'Plague Doctor (bone white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/plague-doctor/common/crimson', 'head', 'common', 'Plague Doctor (crimson)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/plague-doctor/common/bronze', 'head', 'common', 'Plague Doctor (bronze)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/plague-doctor/common/slate', 'head', 'common', 'Plague Doctor (slate)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/plague-doctor/rare/brass-goggles', 'head', 'rare', 'Brass Goggles', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/plague-doctor/epic/herb-smoke', 'head', 'epic', 'Herb Smoke', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('head/plague-doctor/legendary/raven-lord', 'head', 'legendary', 'Raven Lord', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/candy-corn-stripes/common/classic', 'shirt', 'common', 'Candy Corn Stripes (classic)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/candy-corn-stripes/common/witchs-brew', 'shirt', 'common', 'Candy Corn Stripes (witch''s brew)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/candy-corn-stripes/common/blood-moon', 'shirt', 'common', 'Candy Corn Stripes (blood moon)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/candy-corn-stripes/common/ghostly', 'shirt', 'common', 'Candy Corn Stripes (ghostly)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/candy-corn-stripes/common/swamp', 'shirt', 'common', 'Candy Corn Stripes (swamp)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/candy-corn-stripes/common/midnight', 'shirt', 'common', 'Candy Corn Stripes (midnight)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/candy-corn-stripes/rare/caramel-apple', 'shirt', 'rare', 'Caramel Apple', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/candy-corn-stripes/epic/sugar-rush', 'shirt', 'epic', 'Sugar Rush', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/candy-corn-stripes/legendary/candy-corn-king', 'shirt', 'legendary', 'Candy Corn King', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/pumpkin-flannel/common/pumpkin', 'shirt', 'common', 'Pumpkin Flannel (pumpkin)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/pumpkin-flannel/common/moss', 'shirt', 'common', 'Pumpkin Flannel (moss)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/pumpkin-flannel/common/blood', 'shirt', 'common', 'Pumpkin Flannel (blood)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/pumpkin-flannel/common/violet', 'shirt', 'common', 'Pumpkin Flannel (violet)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/pumpkin-flannel/common/ash', 'shirt', 'common', 'Pumpkin Flannel (ash)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/pumpkin-flannel/common/midnight', 'shirt', 'common', 'Pumpkin Flannel (midnight)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/pumpkin-flannel/rare/puffer-vest', 'shirt', 'rare', 'Puffer Vest', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/pumpkin-flannel/epic/leaf-fall', 'shirt', 'epic', 'Leaf Fall', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/pumpkin-flannel/legendary/bonfire-flannel', 'shirt', 'legendary', 'Bonfire Flannel', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/vampire-count/common/blood-red', 'shirt', 'common', 'Vampire Count (blood red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/vampire-count/common/royal-purple', 'shirt', 'common', 'Vampire Count (royal purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/vampire-count/common/emerald', 'shirt', 'common', 'Vampire Count (emerald)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/vampire-count/common/midnight-blue', 'shirt', 'common', 'Vampire Count (midnight blue)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/vampire-count/common/old-gold', 'shirt', 'common', 'Vampire Count (old gold)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/vampire-count/common/silver', 'shirt', 'common', 'Vampire Count (silver)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/vampire-count/rare/royal-count', 'shirt', 'rare', 'Royal Count', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/vampire-count/epic/billowing-cape', 'shirt', 'epic', 'Billowing Cape', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/vampire-count/legendary/night-lord', 'shirt', 'legendary', 'Night Lord', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/mummy-wraps/common/linen', 'shirt', 'common', 'Mummy Wraps (linen)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/mummy-wraps/common/bone-white', 'shirt', 'common', 'Mummy Wraps (bone white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/mummy-wraps/common/tea-stained', 'shirt', 'common', 'Mummy Wraps (tea-stained)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/mummy-wraps/common/ash', 'shirt', 'common', 'Mummy Wraps (ash)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/mummy-wraps/common/soot', 'shirt', 'common', 'Mummy Wraps (soot)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/mummy-wraps/common/moss', 'shirt', 'common', 'Mummy Wraps (moss)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/mummy-wraps/rare/pharaoh', 'shirt', 'rare', 'Pharaoh', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/mummy-wraps/epic/unraveling', 'shirt', 'epic', 'Unraveling', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/mummy-wraps/legendary/cursed-scarab', 'shirt', 'legendary', 'Cursed Scarab', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/bedsheet-ghost/common/white', 'shirt', 'common', 'Bedsheet Ghost (white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/bedsheet-ghost/common/lavender', 'shirt', 'common', 'Bedsheet Ghost (lavender)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/bedsheet-ghost/common/mint', 'shirt', 'common', 'Bedsheet Ghost (mint)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/bedsheet-ghost/common/peach', 'shirt', 'common', 'Bedsheet Ghost (peach)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/bedsheet-ghost/common/sky', 'shirt', 'common', 'Bedsheet Ghost (sky)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/bedsheet-ghost/common/dusty-grey', 'shirt', 'common', 'Bedsheet Ghost (dusty grey)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/bedsheet-ghost/rare/too-cool-ghost', 'shirt', 'rare', 'Too Cool Ghost', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/bedsheet-ghost/epic/boo', 'shirt', 'epic', 'Boo!', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/bedsheet-ghost/legendary/true-phantom', 'shirt', 'legendary', 'True Phantom', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/frankenstein-jacket/common/monster-green', 'shirt', 'common', 'Frankenstein Jacket (monster green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/frankenstein-jacket/common/charcoal', 'shirt', 'common', 'Frankenstein Jacket (charcoal)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/frankenstein-jacket/common/rust', 'shirt', 'common', 'Frankenstein Jacket (rust)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/frankenstein-jacket/common/navy', 'shirt', 'common', 'Frankenstein Jacket (navy)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/frankenstein-jacket/common/lab-grey', 'shirt', 'common', 'Frankenstein Jacket (lab grey)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/frankenstein-jacket/common/olive', 'shirt', 'common', 'Frankenstein Jacket (olive)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/frankenstein-jacket/rare/bolted', 'shirt', 'rare', 'Bolted', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/frankenstein-jacket/epic/live-wires', 'shirt', 'epic', 'Live Wires', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/frankenstein-jacket/legendary/lightning-rods', 'shirt', 'legendary', 'Lightning Rods', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/spooky-club-jersey/common/black-and-orange', 'shirt', 'common', 'Spooky Club Jersey (black & orange)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/spooky-club-jersey/common/purple-and-slime', 'shirt', 'common', 'Spooky Club Jersey (purple & slime)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/spooky-club-jersey/common/white-and-black', 'shirt', 'common', 'Spooky Club Jersey (white & black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/spooky-club-jersey/common/orange-and-black', 'shirt', 'common', 'Spooky Club Jersey (orange & black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/spooky-club-jersey/common/green-and-purple', 'shirt', 'common', 'Spooky Club Jersey (green & purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/spooky-club-jersey/common/red-and-white', 'shirt', 'common', 'Spooky Club Jersey (red & white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/spooky-club-jersey/rare/captains-jersey', 'shirt', 'rare', 'Captain''s Jersey', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/spooky-club-jersey/epic/glow-numbers', 'shirt', 'epic', 'Glow Numbers', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/spooky-club-jersey/legendary/haunted-mvp', 'shirt', 'legendary', 'Haunted MVP', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/scarecrow/common/natural-burlap', 'shirt', 'common', 'Scarecrow (natural burlap)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/scarecrow/common/faded-red', 'shirt', 'common', 'Scarecrow (faded red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/scarecrow/common/denim', 'shirt', 'common', 'Scarecrow (denim)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/scarecrow/common/moss', 'shirt', 'common', 'Scarecrow (moss)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/scarecrow/common/plum', 'shirt', 'common', 'Scarecrow (plum)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/scarecrow/common/charcoal', 'shirt', 'common', 'Scarecrow (charcoal)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/scarecrow/rare/windswept', 'shirt', 'rare', 'Windswept', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/scarecrow/epic/crows-perch', 'shirt', 'epic', 'Crow''s Perch', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shirt/scarecrow/legendary/harvest-wraith', 'shirt', 'legendary', 'Harvest Wraith', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/skeleton-leggings/common/black', 'pants', 'common', 'Skeleton Leggings (black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/skeleton-leggings/common/charcoal', 'pants', 'common', 'Skeleton Leggings (charcoal)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/skeleton-leggings/common/witch-purple', 'pants', 'common', 'Skeleton Leggings (witch purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/skeleton-leggings/common/blood-red', 'pants', 'common', 'Skeleton Leggings (blood red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/skeleton-leggings/common/swamp-green', 'pants', 'common', 'Skeleton Leggings (swamp green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/skeleton-leggings/common/midnight-blue', 'pants', 'common', 'Skeleton Leggings (midnight blue)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/skeleton-leggings/rare/x-ray-film', 'pants', 'rare', 'X-Ray Film', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/skeleton-leggings/epic/rattle-pulse', 'pants', 'epic', 'Rattle Pulse', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/skeleton-leggings/legendary/bone-lord', 'pants', 'legendary', 'Bone Lord', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/jack-o-lantern-shorts/common/orange', 'pants', 'common', 'Jack-o''-Lantern Shorts (orange)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/jack-o-lantern-shorts/common/ghost-white', 'pants', 'common', 'Jack-o''-Lantern Shorts (ghost white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/jack-o-lantern-shorts/common/gourd-green', 'pants', 'common', 'Jack-o''-Lantern Shorts (gourd green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/jack-o-lantern-shorts/common/blue-heirloom', 'pants', 'common', 'Jack-o''-Lantern Shorts (blue heirloom)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/jack-o-lantern-shorts/common/cinderella-red', 'pants', 'common', 'Jack-o''-Lantern Shorts (cinderella red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/jack-o-lantern-shorts/common/rotten', 'pants', 'common', 'Jack-o''-Lantern Shorts (rotten)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/jack-o-lantern-shorts/rare/vine-belt', 'pants', 'rare', 'Vine Belt', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/jack-o-lantern-shorts/epic/candlelit', 'pants', 'epic', 'Candlelit', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/jack-o-lantern-shorts/legendary/inferno-jack', 'pants', 'legendary', 'Inferno Jack', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/mummy-wraps/common/cream', 'pants', 'common', 'Mummy Wraps (cream)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/mummy-wraps/common/ash-grey', 'pants', 'common', 'Mummy Wraps (ash grey)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/mummy-wraps/common/tea-stained', 'pants', 'common', 'Mummy Wraps (tea-stained)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/mummy-wraps/common/midnight', 'pants', 'common', 'Mummy Wraps (midnight)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/mummy-wraps/common/moss', 'pants', 'common', 'Mummy Wraps (moss)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/mummy-wraps/common/rust', 'pants', 'common', 'Mummy Wraps (rust)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/mummy-wraps/rare/ancient-gold', 'pants', 'rare', 'Ancient Gold', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/mummy-wraps/epic/unraveling', 'pants', 'epic', 'Unraveling', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/mummy-wraps/legendary/cursed-pharaoh', 'pants', 'legendary', 'Cursed Pharaoh', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/scarecrow-jeans/common/blue-denim', 'pants', 'common', 'Scarecrow Jeans (blue denim)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/scarecrow-jeans/common/black-denim', 'pants', 'common', 'Scarecrow Jeans (black denim)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/scarecrow-jeans/common/faded', 'pants', 'common', 'Scarecrow Jeans (faded)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/scarecrow-jeans/common/corduroy-brown', 'pants', 'common', 'Scarecrow Jeans (corduroy brown)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/scarecrow-jeans/common/field-green', 'pants', 'common', 'Scarecrow Jeans (field green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/scarecrow-jeans/common/barn-red', 'pants', 'common', 'Scarecrow Jeans (barn red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/scarecrow-jeans/rare/crow-perch', 'pants', 'rare', 'Crow Perch', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/scarecrow-jeans/epic/windblown', 'pants', 'epic', 'Windblown', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/scarecrow-jeans/legendary/haunted-field', 'pants', 'legendary', 'Haunted Field', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/werewolf-rips/common/blue', 'pants', 'common', 'Werewolf Rips (blue)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/werewolf-rips/common/black', 'pants', 'common', 'Werewolf Rips (black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/werewolf-rips/common/grey', 'pants', 'common', 'Werewolf Rips (grey)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/werewolf-rips/common/brown', 'pants', 'common', 'Werewolf Rips (brown)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/werewolf-rips/common/navy', 'pants', 'common', 'Werewolf Rips (navy)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/werewolf-rips/common/olive', 'pants', 'common', 'Werewolf Rips (olive)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/werewolf-rips/rare/silver-wolf', 'pants', 'rare', 'Silver Wolf', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/werewolf-rips/epic/full-moon-shift', 'pants', 'epic', 'Full Moon Shift', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/werewolf-rips/legendary/moonlit-beast', 'pants', 'legendary', 'Moonlit Beast', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/ghost-tail/common/classic-white', 'pants', 'common', 'Ghost Tail (classic white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/ghost-tail/common/lavender', 'pants', 'common', 'Ghost Tail (lavender)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/ghost-tail/common/mint', 'pants', 'common', 'Ghost Tail (mint)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/ghost-tail/common/sky', 'pants', 'common', 'Ghost Tail (sky)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/ghost-tail/common/peach', 'pants', 'common', 'Ghost Tail (peach)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/ghost-tail/common/smoke', 'pants', 'common', 'Ghost Tail (smoke)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/ghost-tail/rare/chained-spirit', 'pants', 'rare', 'Chained Spirit', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/ghost-tail/epic/curling-wisp', 'pants', 'epic', 'Curling Wisp', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/ghost-tail/legendary/poltergeist', 'pants', 'legendary', 'Poltergeist', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/slime-pants/common/toxic-green', 'pants', 'common', 'Slime Pants (toxic green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/slime-pants/common/purple-ooze', 'pants', 'common', 'Slime Pants (purple ooze)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/slime-pants/common/orange-goo', 'pants', 'common', 'Slime Pants (orange goo)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/slime-pants/common/blood-red', 'pants', 'common', 'Slime Pants (blood red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/slime-pants/common/ghost-blue', 'pants', 'common', 'Slime Pants (ghost blue)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/slime-pants/common/tar-black', 'pants', 'common', 'Slime Pants (tar black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/slime-pants/rare/eyeball-goo', 'pants', 'rare', 'Eyeball Goo', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/slime-pants/epic/dripping', 'pants', 'epic', 'Dripping', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/slime-pants/legendary/toxic-meltdown', 'pants', 'legendary', 'Toxic Meltdown', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/candy-corn-track-pants/common/black', 'pants', 'common', 'Candy Corn Track Pants (black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/candy-corn-track-pants/common/navy', 'pants', 'common', 'Candy Corn Track Pants (navy)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/candy-corn-track-pants/common/purple', 'pants', 'common', 'Candy Corn Track Pants (purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/candy-corn-track-pants/common/charcoal', 'pants', 'common', 'Candy Corn Track Pants (charcoal)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/candy-corn-track-pants/common/forest', 'pants', 'common', 'Candy Corn Track Pants (forest)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/candy-corn-track-pants/common/maroon', 'pants', 'common', 'Candy Corn Track Pants (maroon)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/candy-corn-track-pants/rare/sprinkles', 'pants', 'rare', 'Sprinkles', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/candy-corn-track-pants/epic/sugar-rush', 'pants', 'epic', 'Sugar Rush', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/candy-corn-track-pants/legendary/candy-comet', 'pants', 'legendary', 'Candy Comet', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/vampire-tux-pants/common/black', 'pants', 'common', 'Vampire Tux Pants (black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/vampire-tux-pants/common/midnight-blue', 'pants', 'common', 'Vampire Tux Pants (midnight blue)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/vampire-tux-pants/common/burgundy', 'pants', 'common', 'Vampire Tux Pants (burgundy)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/vampire-tux-pants/common/charcoal', 'pants', 'common', 'Vampire Tux Pants (charcoal)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/vampire-tux-pants/common/plum', 'pants', 'common', 'Vampire Tux Pants (plum)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/vampire-tux-pants/common/white', 'pants', 'common', 'Vampire Tux Pants (white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/vampire-tux-pants/rare/bat-cummerbund', 'pants', 'rare', 'Bat Cummerbund', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/vampire-tux-pants/epic/blood-drip-stripe', 'pants', 'epic', 'Blood Drip Stripe', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('pants/vampire-tux-pants/legendary/counts-swarm', 'pants', 'legendary', 'Count''s Swarm', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/pumpkin-sneakers/common/orange', 'shoes', 'common', 'Pumpkin Sneakers (orange)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/pumpkin-sneakers/common/ghost-white', 'shoes', 'common', 'Pumpkin Sneakers (ghost white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/pumpkin-sneakers/common/gourd-green', 'shoes', 'common', 'Pumpkin Sneakers (gourd green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/pumpkin-sneakers/common/blue-heirloom', 'shoes', 'common', 'Pumpkin Sneakers (blue heirloom)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/pumpkin-sneakers/common/cinderella-red', 'shoes', 'common', 'Pumpkin Sneakers (cinderella red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/pumpkin-sneakers/common/rotten', 'shoes', 'common', 'Pumpkin Sneakers (rotten)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/pumpkin-sneakers/rare/jack-o-kicks', 'shoes', 'rare', 'Jack-o''-Kicks', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/pumpkin-sneakers/epic/candlelit-kicks', 'shoes', 'epic', 'Candlelit Kicks', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/pumpkin-sneakers/legendary/hellfire-pumpkins', 'shoes', 'legendary', 'Hellfire Pumpkins', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/witch-boots/common/black', 'shoes', 'common', 'Witch Boots (black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/witch-boots/common/witch-purple', 'shoes', 'common', 'Witch Boots (witch purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/witch-boots/common/swamp-green', 'shoes', 'common', 'Witch Boots (swamp green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/witch-boots/common/blood-red', 'shoes', 'common', 'Witch Boots (blood red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/witch-boots/common/midnight-blue', 'shoes', 'common', 'Witch Boots (midnight blue)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/witch-boots/common/pumpkin', 'shoes', 'common', 'Witch Boots (pumpkin)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/witch-boots/rare/spiderweb-boots', 'shoes', 'rare', 'Spiderweb Boots', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/witch-boots/epic/starlit-boots', 'shoes', 'epic', 'Starlit Boots', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/witch-boots/legendary/broomflight-boots', 'shoes', 'legendary', 'Broomflight Boots', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/skeleton-feet/common/bone-white', 'shoes', 'common', 'Skeleton Feet (bone white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/skeleton-feet/common/ash-grey', 'shoes', 'common', 'Skeleton Feet (ash grey)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/skeleton-feet/common/old-ivory', 'shoes', 'common', 'Skeleton Feet (old ivory)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/skeleton-feet/common/charred', 'shoes', 'common', 'Skeleton Feet (charred)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/skeleton-feet/common/moss', 'shoes', 'common', 'Skeleton Feet (moss)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/skeleton-feet/common/blood-stained', 'shoes', 'common', 'Skeleton Feet (blood-stained)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/skeleton-feet/rare/painted-toenails', 'shoes', 'rare', 'Painted Toenails', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/skeleton-feet/epic/tapping-toes', 'shoes', 'epic', 'Tapping Toes', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/skeleton-feet/legendary/soul-fire-feet', 'shoes', 'legendary', 'Soul Fire Feet', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/monster-slippers/common/grape', 'shoes', 'common', 'Monster Slippers (grape)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/monster-slippers/common/lime', 'shoes', 'common', 'Monster Slippers (lime)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/monster-slippers/common/tangerine', 'shoes', 'common', 'Monster Slippers (tangerine)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/monster-slippers/common/sky', 'shoes', 'common', 'Monster Slippers (sky)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/monster-slippers/common/bubblegum', 'shoes', 'common', 'Monster Slippers (bubblegum)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/monster-slippers/common/dust-bunny', 'shoes', 'common', 'Monster Slippers (dust bunny)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/monster-slippers/rare/cyclops-slippers', 'shoes', 'rare', 'Cyclops Slippers', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/monster-slippers/epic/chomp-slippers', 'shoes', 'epic', 'Chomp Slippers', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/monster-slippers/legendary/shadow-beasts', 'shoes', 'legendary', 'Shadow Beasts', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/coffin-clogs/common/oak', 'shoes', 'common', 'Coffin Clogs (oak)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/coffin-clogs/common/ebony', 'shoes', 'common', 'Coffin Clogs (ebony)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/coffin-clogs/common/red-lacquer', 'shoes', 'common', 'Coffin Clogs (red lacquer)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/coffin-clogs/common/bone-white', 'shoes', 'common', 'Coffin Clogs (bone white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/coffin-clogs/common/mossy', 'shoes', 'common', 'Coffin Clogs (mossy)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/coffin-clogs/common/royal-purple', 'shoes', 'common', 'Coffin Clogs (royal purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/coffin-clogs/rare/gilded-coffins', 'shoes', 'rare', 'Gilded Coffins', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/coffin-clogs/epic/creaking-lids', 'shoes', 'epic', 'Creaking Lids', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/coffin-clogs/legendary/vampires-rest', 'shoes', 'legendary', 'Vampire''s Rest', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/ghost-sneakers/common/sheet-white', 'shoes', 'common', 'Ghost Sneakers (sheet white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/ghost-sneakers/common/mint', 'shoes', 'common', 'Ghost Sneakers (mint)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/ghost-sneakers/common/lavender', 'shoes', 'common', 'Ghost Sneakers (lavender)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/ghost-sneakers/common/pale-blue', 'shoes', 'common', 'Ghost Sneakers (pale blue)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/ghost-sneakers/common/peach', 'shoes', 'common', 'Ghost Sneakers (peach)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/ghost-sneakers/common/fog-grey', 'shoes', 'common', 'Ghost Sneakers (fog grey)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/ghost-sneakers/rare/fading-kicks', 'shoes', 'rare', 'Fading Kicks', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/ghost-sneakers/epic/sheet-kicks', 'shoes', 'epic', 'Sheet Kicks', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/ghost-sneakers/legendary/poltergeist', 'shoes', 'legendary', 'Poltergeist', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/frankenstein-stompers/common/black', 'shoes', 'common', 'Frankenstein Stompers (black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/frankenstein-stompers/common/gunmetal', 'shoes', 'common', 'Frankenstein Stompers (gunmetal)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/frankenstein-stompers/common/monster-green', 'shoes', 'common', 'Frankenstein Stompers (monster green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/frankenstein-stompers/common/mud-brown', 'shoes', 'common', 'Frankenstein Stompers (mud brown)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/frankenstein-stompers/common/navy', 'shoes', 'common', 'Frankenstein Stompers (navy)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/frankenstein-stompers/common/lab-white', 'shoes', 'common', 'Frankenstein Stompers (lab white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/frankenstein-stompers/rare/stitched-stompers', 'shoes', 'rare', 'Stitched Stompers', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/frankenstein-stompers/epic/stomp-quake', 'shoes', 'epic', 'Stomp Quake', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/frankenstein-stompers/legendary/lightning-stompers', 'shoes', 'legendary', 'Lightning Stompers', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/candy-corn-high-tops/common/classic-corn', 'shoes', 'common', 'Candy Corn High-Tops (classic corn)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/candy-corn-high-tops/common/harvest-corn', 'shoes', 'common', 'Candy Corn High-Tops (harvest corn)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/candy-corn-high-tops/common/witchs-brew', 'shoes', 'common', 'Candy Corn High-Tops (witch''s brew)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/candy-corn-high-tops/common/mint-corn', 'shoes', 'common', 'Candy Corn High-Tops (mint corn)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/candy-corn-high-tops/common/bloody-corn', 'shoes', 'common', 'Candy Corn High-Tops (bloody corn)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/candy-corn-high-tops/common/midnight-corn', 'shoes', 'common', 'Candy Corn High-Tops (midnight corn)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/candy-corn-high-tops/rare/wrapped-candy', 'shoes', 'rare', 'Wrapped Candy', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/candy-corn-high-tops/epic/sugar-rush', 'shoes', 'epic', 'Sugar Rush', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/candy-corn-high-tops/legendary/candy-burst', 'shoes', 'legendary', 'Candy Burst', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/bat-wing-sneakers/common/black', 'shoes', 'common', 'Bat-Wing Sneakers (black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/bat-wing-sneakers/common/purple', 'shoes', 'common', 'Bat-Wing Sneakers (purple)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/bat-wing-sneakers/common/red', 'shoes', 'common', 'Bat-Wing Sneakers (red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/bat-wing-sneakers/common/grey', 'shoes', 'common', 'Bat-Wing Sneakers (grey)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/bat-wing-sneakers/common/orange', 'shoes', 'common', 'Bat-Wing Sneakers (orange)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/bat-wing-sneakers/common/white', 'shoes', 'common', 'Bat-Wing Sneakers (white)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/bat-wing-sneakers/rare/vampire-bat-kicks', 'shoes', 'rare', 'Vampire Bat Kicks', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/bat-wing-sneakers/epic/flapping-wings', 'shoes', 'epic', 'Flapping Wings', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/bat-wing-sneakers/legendary/night-flight', 'shoes', 'legendary', 'Night Flight', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks/common/toxic-green', 'shoes', 'common', 'Slime Kicks (toxic green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks/common/purple-ooze', 'shoes', 'common', 'Slime Kicks (purple ooze)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks/common/orange-goo', 'shoes', 'common', 'Slime Kicks (orange goo)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks/common/blood-red', 'shoes', 'common', 'Slime Kicks (blood red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks/common/ghost-blue', 'shoes', 'common', 'Slime Kicks (ghost blue)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks/common/tar-black', 'shoes', 'common', 'Slime Kicks (tar black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks/rare/eyeball-goo', 'shoes', 'rare', 'Eyeball Goo', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks/epic/bubbling', 'shoes', 'epic', 'Bubbling', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks/legendary/radioactive', 'shoes', 'legendary', 'Radioactive', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-ii/common/toxic-green', 'shoes', 'common', 'Slime Kicks II (toxic green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-ii/common/purple-ooze', 'shoes', 'common', 'Slime Kicks II (purple ooze)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-ii/common/orange-goo', 'shoes', 'common', 'Slime Kicks II (orange goo)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-ii/common/blood-red', 'shoes', 'common', 'Slime Kicks II (blood red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-ii/common/ghost-blue', 'shoes', 'common', 'Slime Kicks II (ghost blue)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-ii/common/tar-black', 'shoes', 'common', 'Slime Kicks II (tar black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-ii/rare/bug-in-jelly', 'shoes', 'rare', 'Bug in Jelly', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-ii/epic/squishy-jelly', 'shoes', 'epic', 'Squishy Jelly', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-ii/legendary/slime-critters', 'shoes', 'legendary', 'Slime Critters', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-iii/common/toxic-green', 'shoes', 'common', 'Slime Kicks III (toxic green)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-iii/common/purple-ooze', 'shoes', 'common', 'Slime Kicks III (purple ooze)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-iii/common/orange-goo', 'shoes', 'common', 'Slime Kicks III (orange goo)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-iii/common/blood-red', 'shoes', 'common', 'Slime Kicks III (blood red)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-iii/common/ghost-blue', 'shoes', 'common', 'Slime Kicks III (ghost blue)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-iii/common/tar-black', 'shoes', 'common', 'Slime Kicks III (tar black)', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-iii/rare/biohazard', 'shoes', 'rare', 'Biohazard', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-iii/epic/slime-trail', 'shoes', 'epic', 'Slime Trail', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('shoes/slime-kicks-iii/legendary/slime-jets', 'shoes', 'legendary', 'Slime Jets', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/spectral-horseman', 'transformation', 'legendary', 'Spectral Horseman', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/lich-king', 'transformation', 'legendary', 'Lich King', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/draculas-bat-form', 'transformation', 'legendary', 'Dracula''s Bat Form', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/great-pumpkin-king', 'transformation', 'legendary', 'Great Pumpkin King', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/swamp-kraken', 'transformation', 'legendary', 'Swamp Kraken', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/ash-phoenix', 'transformation', 'legendary', 'Ash Phoenix', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/shadow-wraith', 'transformation', 'legendary', 'Shadow Wraith', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/ghost-ship', 'transformation', 'legendary', 'Ghost Ship', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/haunted-mansion', 'transformation', 'legendary', 'Haunted Mansion', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/witch-queen-on-a-broom', 'transformation', 'legendary', 'Witch Queen on a Broom', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/cerberus', 'transformation', 'legendary', 'Cerberus', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/bone-dragon', 'transformation', 'legendary', 'Bone Dragon', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/demon-lord', 'transformation', 'legendary', 'Demon Lord', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/mothman-supreme', 'transformation', 'legendary', 'Mothman Supreme', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/wisp-swarm', 'transformation', 'legendary', 'Wisp Swarm', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/storm-golem', 'transformation', 'legendary', 'Storm Golem', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/crystal-ball-seer', 'transformation', 'legendary', 'Crystal Ball Seer', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/jack-o-lantern-totem', 'transformation', 'legendary', 'Jack-o''-Lantern Totem', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/ectoplasm-giant', 'transformation', 'legendary', 'Ectoplasm Giant', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/banshee-queen', 'transformation', 'legendary', 'Banshee Queen', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/grim-reaper-supreme', 'transformation', 'legendary', 'Grim Reaper Supreme', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/alpha-werewolf', 'transformation', 'legendary', 'Alpha Werewolf', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/its-alive', 'transformation', 'legendary', 'It''s Alive!', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/pharaoh-rising', 'transformation', 'legendary', 'Pharaoh Rising', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/haunted-music-box', 'transformation', 'legendary', 'Haunted Music Box', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/spider-queen', 'transformation', 'legendary', 'Spider Queen', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/swamp-hydra', 'transformation', 'legendary', 'Swamp Hydra', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/candy-golem', 'transformation', 'legendary', 'Candy Golem', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/disco-skeleton', 'transformation', 'legendary', 'Disco Skeleton', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/black-cat-familiar', 'transformation', 'legendary', 'Black Cat Familiar', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/cosmic-ghost', 'transformation', 'legendary', 'Cosmic Ghost', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/gargoyle-awakened', 'transformation', 'legendary', 'Gargoyle Awakened', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/hellhound', 'transformation', 'legendary', 'Hellhound', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/plague-alchemist', 'transformation', 'legendary', 'Plague Alchemist', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/phantom-knight', 'transformation', 'legendary', 'Phantom Knight', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/eldritch-eye', 'transformation', 'legendary', 'Eldritch Eye', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/graveyard-rising', 'transformation', 'legendary', 'Graveyard Rising', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/haunted-volleyball-comet', 'transformation', 'legendary', 'Haunted Volleyball Comet', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/poltergeist-storm', 'transformation', 'legendary', 'Poltergeist Storm', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/legendary/scarecrow-king', 'transformation', 'legendary', 'Scarecrow King', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/headless-horseman', 'transformation', 'epic', 'Headless Horseman', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/grim-reaper', 'transformation', 'epic', 'Grim Reaper', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/werewolf', 'transformation', 'epic', 'Werewolf', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/frankensteins-monster', 'transformation', 'epic', 'Frankenstein''s Monster', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/vampire-count', 'transformation', 'epic', 'Vampire Count', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/swamp-creature', 'transformation', 'epic', 'Swamp Creature', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/living-scarecrow', 'transformation', 'epic', 'Living Scarecrow', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/big-boo', 'transformation', 'epic', 'Big Boo', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/zombie-athlete', 'transformation', 'epic', 'Zombie Athlete', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/pumpkin-golem', 'transformation', 'epic', 'Pumpkin Golem', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/black-cat', 'transformation', 'epic', 'Black Cat', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/giant-bat', 'transformation', 'epic', 'Giant Bat', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/haunted-coffin', 'transformation', 'epic', 'Haunted Coffin', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/cauldron-creature', 'transformation', 'epic', 'Cauldron Creature', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/candy-bucket-mimic', 'transformation', 'epic', 'Candy Bucket Mimic', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/mummy', 'transformation', 'epic', 'Mummy', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/skeleton', 'transformation', 'epic', 'Skeleton', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/witch-on-a-broom', 'transformation', 'epic', 'Witch on a Broom', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/giant-spider', 'transformation', 'epic', 'Giant Spider', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/walking-tombstone', 'transformation', 'epic', 'Walking Tombstone', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/haunted-armor', 'transformation', 'epic', 'Haunted Armor', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/gargoyle', 'transformation', 'epic', 'Gargoyle', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/cyclops-blob', 'transformation', 'epic', 'Cyclops Blob', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/great-horned-owl', 'transformation', 'epic', 'Great Horned Owl', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/haunted-doll', 'transformation', 'epic', 'Haunted Doll', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/imp', 'transformation', 'epic', 'Imp', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/banshee', 'transformation', 'epic', 'Banshee', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/living-candle', 'transformation', 'epic', 'Living Candle', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/jack-in-the-box', 'transformation', 'epic', 'Jack-in-the-Box', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/goblin', 'transformation', 'epic', 'Goblin', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/flytrap-monster', 'transformation', 'epic', 'Flytrap Monster', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/haunted-grandfather-clock', 'transformation', 'epic', 'Haunted Grandfather Clock', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/creature-in-a-jar', 'transformation', 'epic', 'Creature in a Jar', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/wendigo', 'transformation', 'epic', 'Wendigo', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/mothman', 'transformation', 'epic', 'Mothman', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/candy-corn-monster', 'transformation', 'epic', 'Candy Corn Monster', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/ghost-pirate', 'transformation', 'epic', 'Ghost Pirate', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/alien-in-a-saucer', 'transformation', 'epic', 'Alien in a Saucer', 'halloween-2026', '2026-12-01 00:00:00-05'),
  ('transformation/epic/haunted-volleyball', 'transformation', 'epic', 'Haunted Volleyball', 'halloween-2026', '2026-12-01 00:00:00-05');
