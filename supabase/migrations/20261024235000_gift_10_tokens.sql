-- A one-time gift (owner's call, 2026-10-24): 10 free tokens for every
-- account that signs in with Google, as of when this migration runs. People
-- who sign up later don't get it. Additive only: a new table recording each
-- gift, and +10 on each of those players' balances (lifetime "earned" too,
-- so balance = earned - spent still holds). Gifts don't count against the
-- 10-a-day cap on game tokens (that only looks at token_earnings).

create table public.token_gifts (
  player_id uuid not null references public.profiles(id) on delete cascade,
  gift text not null,
  tokens integer not null check (tokens > 0),
  given_at timestamptz not null default now(),
  primary key (player_id, gift)
);
alter table public.token_gifts enable row level security;
create policy "Players see their own token gifts" on public.token_gifts for select using (player_id = auth.uid());

-- Who gets it: real (not placeholder) profiles with a Google sign-in. The
-- primary key means nobody can get this gift twice, and only gifts recorded
-- by this very statement add to balances, so it can never pay twice.
with given as (
  insert into public.token_gifts (player_id, gift, tokens)
  select p.id, 'launch-2026-10-24', 10
  from public.profiles p
  where not p.is_manual
    and exists (select 1 from auth.identities i where i.user_id = p.id and i.provider = 'google')
  on conflict do nothing
  returning player_id, tokens
)
insert into public.token_balances (player_id, balance, earned)
select player_id, tokens, tokens from given
on conflict (player_id) do update
  set balance = public.token_balances.balance + excluded.balance,
      earned = public.token_balances.earned + excluded.earned,
      updated_at = now();
