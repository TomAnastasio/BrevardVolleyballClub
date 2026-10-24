# Tokens, items and pulls: database plan

Status: **live** since 2026-10-24 18:17 UTC (migration
`20261024200000_tokens_items_and_pulls.sql` on `main`, production and staging).
Product decisions behind it are in `PLAN.md`; scenario tests are in `db/`.

One new, additive migration. It adds new tables and functions only: no
existing table, column, trigger or function changes, and nothing touches Elo,
games or profiles data.

## How tokens get counted ("settling")

Tokens aren't handed out by a trigger the moment a game row appears, because
saving a 2v2 beach game is several steps from the phone: the game is saved
with the submitter as Player 1, the other players are linked, and then, if
someone else was Player 1, the app reassigns it a second later. A trigger at
the first step would pay the submitter even when they weren't playing.

Instead, a game is **settled** once it's at least 1 minute old: everyone who's
in it at that point gets their tokens. Settling happens whenever a player's
token count is asked for (their profile, the Cauldron, a pull), for that
player's games only. So tokens show up within about a minute of saving.

Who's "in a game" is exactly what the app already uses for history and Elo:
the linked `game_players` rows, plus `games.user_id` as Player 1 of a classic
2v2 beach game (`format = 'beach'` and `team_size is null`). Typed-in names
and placeholder (manual) profiles never earn; only accounts that sign in do.

Per player, per game, once, ever:
- 2 tokens if their side won, otherwise 1 (ties: 1). Ranked games only
  (owner's call): beach and indoor, tournament games included; casual earns
  nothing.
- At most 10 a day. The day is the Eastern-time date the game was saved
  (`games.created_at`), not the date typed on the game. Within a day, games
  are paid in the order they were saved.
- Only games saved after the migration goes live (`token_settings.started_at`).
  No back pay.
- Once paid, it's permanent: deleting the game, removing the player from it
  or changing its score never takes tokens back, and never pays again.
- A player an admin adds to a game later is paid at the next settle (the day
  still counts against that game's day).
- Games a placeholder brings into a real account through `merge_profiles`
  never pay (owner's call). Triggers note any game moving away from a
  placeholder; if that placeholder is deleted in the same transaction (which
  is what a merge does), those games are recorded as paid-0 ("merged") for
  the new owner. An admin edit that swaps a placeholder for a real player
  isn't a merge, so that player is paid.

## Tables

| Table | What it holds | Who can read it |
|---|---|---|
| `token_settings` | one row: `started_at` (when counting began) | everyone |
| `token_earnings` | one row per (player, game) settled: tokens paid (0–2, 0 when the day was full), the game's Eastern day, when | the player |
| `token_balances` | per player: tokens available, lifetime earned, lifetime spent | the player |
| `cosmetic_items` | the catalog: stable key (e.g. `head/devil-horns/common/devil-red`), slot (head, shirt, pants, shoes, transformation), tier, name, `available_until` | everyone |
| `pull_odds` | tier → share (76 / 20 / 3.8 / 0.2) | everyone |
| `player_items` | who owns what, when they got it, and whether they've seen it yet (NEW badge) | the player |
| `player_outfits` | per player: equipped head, shirt, pants, shoes, transformation | everyone (the rally and profiles show it) |
| `pulls` | log of every pull: who, when, tier, item | the player |

Nobody can write to any of these directly. Every change goes through the
functions below, which check who's calling.

## Functions the app calls

- `my_tokens()`: settles the caller's pending games, returns their balance.
- `brew()`: one pull. Locks the caller's balance, settles, needs at least 1
  token, rolls the tier on the server (shares of tiers the player has fully
  collected, or that have nothing left to drop, are shared out proportionally
  among the rest), picks a random item in that tier they don't own, records
  it, spends the token and returns the item. Errors clearly when they have no
  tokens or there's nothing left to win.
- `equip_item(key)`: wear something you own. Clothing takes off any
  transformation; a transformation covers the outfit.
- `unequip(slot)`: take a slot off ("Plain"), or `unequip('transformation')`
  for "Back to my outfit".
- `mark_items_seen()`: clears the NEW badges.

## The catalog

Every Common color is its own item (a Common card is 6 items), so the pool is
about 480 items. The migration inserts them all, generated from the design
data files, with keys that the app's art uses too. Halloween items get
`available_until = 2026-12-01 00:00 Eastern`: after that they stop dropping
for good, though anyone who owns one keeps it. If no other set exists by
then, `brew()` says there's nothing to brew and tokens keep saving up.

## How it was tested before it went live

1. Every migration in `supabase/migrations` plus this one ran in a throwaway
   Postgres (PGlite) with the Supabase sign-in tables stubbed in (`db/`).
2. 67 scenarios passed (`db/tokens.test.mjs`): each save path (2v2 beach incl.
   the Player 1 reassignment, squad beach, indoor, tournament scores), admin
   edits, merges, deletes, the daily cap across midnight Eastern, ties,
   casual games, placeholders, back-pay protection, brewing every item with
   no duplicates and then "nothing left", retired items, 20,000 simulated
   pulls (75.9 / 20.1 / 3.82 / 0.18%), odds sharing once a tier is complete,
   equip rules, and that nobody can read or change someone else's tokens or
   items. They caught one real bug first (the merge trigger), fixed before
   pushing.
3. Not tested: two pulls at literally the same moment (PGlite has one
   connection). `brew()` locks the player's balance row first, so a second
   pull waits for the first.
4. Both migration runs succeeded on 2026-10-24; on staging a test bot read
   its balance (0), got the "need a token" message from `brew()`, saw only its
   own balance and all 479 items, and signed-out calls were refused.

Run the tests again before any future token or item migration.
