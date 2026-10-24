# Loot, tokens and pixel avatars: where we are

Status as of 2026-10-24: **the database and the home-screen rally are live
on `main`**. Ranked games have earned tokens since 2026-10-24 18:17 UTC, but
there's no screen to see or spend them yet, and the rally draws everyone
plain grey. Everything else here is design work: preview pages, drawing code
and screenshots, on the branch `claude/gacha-avatars-design` (not merged).

## The idea in one paragraph

Every player gets a little pixel character (the "16-Bit Pro"). Playing games
earns tokens; a token buys one pull from the Cauldron, which brews a random
cosmetic you don't own yet: hats, shirts, pants, shoes, and rare full-body
monster transformations. Rarer items look better (Common, Rare, Epic,
Legendary). Your character shows on your profile and plays your rival in the
home-screen rally. Purely cosmetic: nothing touches Elo, nothing is sold.

## Decided (owner's calls, 2026-10-24)

**Tokens**
- Ranked games only: 1 token per game, 2 for a win, at most 10 a day. The
  day resets at midnight Eastern.
- 1 token = 1 pull.
- Only players signed in with Google earn tokens. No back pay for games
  before launch.
- Deleting a game never takes tokens back. Games a placeholder brings into a
  Google account through a merge never pay.
- Tokens are counted about a minute after a game is saved.
- No real money ever, no trading.

**Pulls**
- Four tiers: Common, Rare, Epic, Legendary.
- A pull rolls the tier first, then a random item in that tier the player
  doesn't own yet. When a tier is fully owned, its share moves to the tiers
  they're still missing. So there are never duplicates, and someone who owns
  everything can't pull.
- Pulls are rolled by the database, not the phone, so nobody can cheat.
- The rarity ratio is a goal, not a rule. Cool designs can break it. If
  it gets very lopsided, add extra Commons.
- Halloween items only until the end of November, then they're retired for
  good. A non-Halloween set gets designed before then.

**Look and placement**
- **Opening animation:** the Cauldron (page 01, box C).
- **Avatar:** the 16-Bit Pro (page 01, athlete D). Everyone starts plain and
  grey. Gear fills zones on the body (hair, shirt, sleeves, shorts, shins,
  socks, shoes), so one shirt fits every player.
- **Profile:** option A, a card under the name and stats with the avatar on a
  little stage on the left and what they're wearing on the right. Your own
  profile adds your token count and a "Change outfit" button. Screenshots
  are in `profile-mock/`.
- **Home-screen rally:** you vs your rival (the app's existing "toughest
  opponent"). Everyone always has a rival: if the normal rule finds none
  (too few games, no losses), it's the current #1 ranked player. If that's
  you, it's #2 (assumed; the owner hasn't said otherwise).
- **Locker:** option A on page 15 ("mirror and drawers"), as drafted: a big
  avatar on top, tabs for Head, Shirt, Pants, Shoes and Monsters, a grid of
  item tiles. Tapping wears an item and saves straight away; "Plain" takes a
  slot off; tapping a monster transforms you and "Back to my outfit" (or any
  clothing) switches it off; NEW badges on fresh items; rarest first; only
  items the player owns appear (nothing unowned, not even a blank tile),
  with an "x owned" count per tab; a "Brew"
  button at the bottom. Screenshots are in `locker-mock/` (A-*.png).
- **Past games:** victory and defeat poses (winners celebrate on one side,
  losers slump on the other). Not designed yet.

**Transformations (special rewards)**
- One-offs that replace the whole avatar, whatever is equipped.
- Creative shapes using the whole space are encouraged; they don't need to be
  human-shaped.
- Only Epic and Legendary, rolled together with the other items in those
  tiers: no separate share of the odds.
- Switchable off. The plan is that equipping one covers the outfit and
  "Back to my outfit" restores it.

## Item sets so far

Picked and final (49 items: 30 Common, 4 Rare, 6 Epic, 9 Legendary):

| Set | Common | Rare | Epic | Legendary |
|---|---|---|---|---|
| Witch hat, Classic Cone (page 03) | C3 Ringed ×6 colors | R3 Candy Corn | E2 Jack-o'-Lantern Band, E3 Bat Perch | L2 Ghostfire, L3 Living Hat |
| Pumpkin Helmet (page 05) | C1 Classic Carve ×6, C3 Grumpy Carve ×6 | R2 Pumpkin King | E2 Chomper | L1 Headless Horseman, L2 Possessed |
| Skeleton Tee (page 07) | C1 Classic Ribcage ×6 | R1 Glow Bones | E1 Beating Heart | L1 Lich Armor, L2 Ectoplasm, L3 Rave Bones |
| Witch Stockings (page 09) | C1 Classic Stripes ×6 | R2 Mismatched | E1 Marquee Stripes, E3 Potion Belt | L2 Bubbling Brew, L3 Flame Stockings |

Also in, after the owner's review (cuts final, 2026-10-24): everything on
page 13 (cards 101–272, a Common card being its six colors) and page 14
(301–340 Legendary, 341–380 Epic) except the cuts: 161–164, 177–180,
209–212, 249–252 and 370 (hidden on the pages, numbers kept). The remakes
and tweaks from that review are in the pages (see `git log`).

The full list is 479 items (264 Common, 43 Rare, 84 Epic, 88 Legendary, 79 of
them monsters), generated by `source/catalog.mjs` into `source/catalog.json`.
Each item's key there is permanent: the database uses it and the app's art
must too.

## Still to decide

Odds are final at 76% / 20% / 3.8% / 0.2% (owner, 2026-10-24).

- **Later:** held items, victory and defeat poses, home-screen moves, name
   colors, fonts and effects, photo borders, profile banners, and the
   non-Halloween set.

## Still to build, in order

1. **Database: done** (2026-10-24, migration
   `20261024200000_tokens_items_and_pulls.sql` on `main`). How it works is in
   `DATABASE.md`; its scenario tests are in `db/`.
2. **Avatar drawing** in the app: turn `source/engine.js` (the 16-Bit Pro and
   the gear zones) into a real component, plus the chosen item art.
3. **Profile card (option A):** `profile-mock/_AvatarMock.jsx` has a rough
   version.
4. **Home-screen rally: done** (2026-10-24, on `main`). The avatar body is
   in `src/avatar/engine.js` there; once gear exists, set each player's
   `gear` in `src/avatar/useRallyPlayers.js`. Names show under the feet.
5. **Cauldron pull screen:** token balance, the animation and the reveal.
6. **Locker (option A, page 15):** equip items and switch transformations
   on and off.
7. README and TODO updates in the same push as each user-visible piece.

## What's in this folder

- `pages/`: the preview pages the owner reviewed, numbered in the order they
  were made. Open any of them in a browser. The same pages are on claude.ai:
  - 01 [pitch, avatars, odds](https://claude.ai/artifact/9N5sL8mVMVkqRwVyityZR4)
  - 02 [witch hats](https://claude.ai/artifact/GofeAe3iR7p5Kt3AUYYgv4), 03 [witch hat tiers](https://claude.ai/artifact/AkKpHUqKs7TH5YS8cB5cSW)
  - 04 [head items](https://claude.ai/artifact/HZyuWqEuLjPBnezpDpQoTJ), 05 [pumpkin tiers](https://claude.ai/artifact/VFfKh6HKcTqbRodFbdBTv4)
  - 06 [shirts](https://claude.ai/artifact/HtpMaguSi5VvYwJTcqxXL2), 07 [skeleton tee tiers](https://claude.ai/artifact/R6xitkYtVTqM4ai8NXanBa)
  - 08 [pants](https://claude.ai/artifact/SyV6vDaP1EZiEs8gM37dYA), 09 [witch stockings tiers](https://claude.ai/artifact/PbVyR1ohMYE2eM9XqQRUNf)
  - 10 [shoes](https://claude.ai/artifact/U7FP1PfACXU6BSim6B5w1w), 11 [slime kicks tiers](https://claude.ai/artifact/LAzcbgyNCUcZULZPH21DfZ)
  - 12 [transformation sketches](https://claude.ai/artifact/F4mvoFQ414a34NP2jM5LiD)
  - 13 [wardrobe batch](https://claude.ai/artifact/Dc1YJney4Pp82zybhseXDe)
  - 14 [transformations](https://claude.ai/artifact/PjB5iAgyCy3i4Z8emYhg9h)
  - 15 [locker](https://claude.ai/artifact/V2iSTuc1hDZG6cs9aXH2XJ)
- `source/`: drawing code for pages 13, 14 and 15. `engine.js` draws the 16-Bit
  Pro and layers gear by zone, with the item format documented at its
  bottom. `data/*.js` holds one file per slot (the transformations are
  `xe*.js` and `xl*.js`). `build.sh`, `xbuild.sh` and `lbuild.sh` (each
  takes `OUT.html`) rebuild pages 13, 14 and 15; the locker's own code is
  `locker.js`.
- `locker-mock/`: screenshots of page 15's three locker layouts.
- `profile-mock/`: option A's throwaway component, plus screenshots of the
  profile today and of options A, B and C.

The tier pages (03, 05, 07, 09, 11) carry their own drawing code inside the
HTML. That's the source for the picked items.
