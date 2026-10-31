# Brevard Volleyball Club

## Beach Volleyball Scoreboard

A free, mobile-first web app for keeping score of volleyball games, tracking
player Elo rankings, and finding places to play. No install — just open it in a
phone browser. Live at
[brevardvolleyballclub.com](https://brevardvolleyballclub.com). Sign-in (Google)
and all game/profile data live in Supabase — see `supabase/README.md`.

Built with React, Vite, Tailwind CSS, and [HeroUI](https://www.heroui.com) as
the component/design library.

### Logging a game

Any signed-in player taps **New Game** and picks either **Live Scoreboard**
(keep score point by point) or **Enter Final Score** (for a game that just
finished: pick the players, then type in the final score). Both save the
same way, dated now, with the same Elo update. There's no way to backdate a
game. Admins fix a game's details afterward with **✏️ Edit** (below).

**No signal courtside is fine.** Pressing Save keeps the game on the phone
first, then uploads it. The game and all its players go up together in one
step, so a game is never half-saved (e.g. saved without its players, or
rated against the wrong Player 1). Until the server confirms it, the game
shows in Past Games with **⏳ Waiting to upload** and a **Retry** button,
and a yellow note above the game screens counts what's waiting. The app
retries by itself when it opens, when the phone gets a connection back,
when you switch back to it, and every 30 seconds while it's open. Retrying
never saves a game twice. If the server refuses a game outright (rare: e.g.
a ranked game with a player who wasn't picked from the list), the note turns
red, the game says why, and it stays on the phone until someone taps
**Retry** or **Remove**. A game waits for the account that saved it: if
someone else signs in on that phone, it stays put until that player signs
back in.

Team names you tap to edit on the scoreboard stop at 24 characters per
player, like everywhere else names are typed.

### Live scoreboard

The scoreboard picks its layout from how the phone is held:

- **Sideways (landscape):** the original side-by-side board, Team A on the
  left and Team B on the right.
- **Upright (portrait):** Team A on top, Team B below. Each team has its
  score, a full-width **+1** in the team's color and a red **−1** beside it.

The upright layout also shows:

- **Who's serving:** a volleyball and "SERVING" under whichever team won
  the last rally. Nothing shows at 0–0, since the coin toss isn't tracked.
- **Switch sides (beach only):** a yellow banner at every 7 combined points
  (7, 14, 21…). **Done** hides it until the next one. The line between the
  teams counts down ("Switch sides in 3"). Indoor games don't switch.

**−1** takes back that team's most recent point, so the serving marker
stays right after a correction. The order points were scored in is kept
only on the scorekeeper's phone. It isn't saved with the game.

In either layout, when a team reaches the winning score (21 beach, 25
indoor) with a 2-point lead, a green banner offers **Save Game** or
**Keep Playing** (big, full-width buttons in the upright layout, like the
switch-sides **Done**).

The screen stays on while the scoreboard (or a tournament's **Keep score**
screen) is open, so the phone doesn't dim and lock between rallies
(`src/hooks/useWakeLock.js`; browsers without it just behave as before).

### Game details

Tapping any game opens its own screen, in Past Games or in a player's
profile. It shows when it was played, the format, Ranked/Casual, the
tournament tag if any, the score, and both rosters. Every player picked from
player search opens their profile when tapped. Names that were typed in
instead show as plain text. For ranked games, signed-in members also see
each player's Elo change (e.g. +12 / −11). Elo history isn't public, so
signed-out visitors don't. Admins edit or delete a game with the **✏️ Edit
game** button on this screen. Back always returns to the previous screen
(`App.jsx` stacks these screens on top of the current view).

### Getting around

- **The phone's Back button** (or back swipe, or the browser's back) does
  exactly what the screen's own **‹ Back** does: game details → profile →
  Rankings → home, the game-tracking setup screens one by one, the admin
  panel's tools, and Tournaments (Keep Score / Manage → the tournament →
  the list). From the live scoreboard it goes to the game menu, where
  **In Progress** picks the game back up; it never leaves the app mid-game.
  Only from the home screen does Back leave the site. A reload opens home
  (or the tournament in the address bar); a game in progress is still
  kept. How it works: `src/lib/backNavigation.js`.
- **Opening splash:** the BVC splash plays on the first open of the day
  only; later opens that day go straight in (`src/lib/splashOncePerDay.js`).
- **When something can't load** (no signal), Rankings, Past Games,
  profiles (games and tournaments), game details, the Locker, the
  Cauldron, the tournament list, a tournament, Keep score, Manage and the
  player search (New Game, Merge Profiles, tournament entrants) say
  "Couldn't load … Check your connection" with a **Retry** button,
  instead of looking empty.
  Past Games still lists the games kept on the phone underneath. Loading
  gives up after about 7 seconds (the database client retries first).
- **If a screen crashes**, a "Something went wrong" screen offers **Back to
  home** and **Reload** instead of a blank page
  (`src/components/ErrorBoundary.jsx`). A game in progress survives either.

### My profile

Once signed in, your profile photo sits in the home screen's top-right
corner, and tapping it opens your own profile ("‹ Menu" goes back home).
Signed out, that corner says **Sign in**. After Google sign-in it opens your
profile (a short-lived breadcrumb, `src/lib/pendingMyProfile.js`, survives
the redirect).

### Home-screen rally

The strip at the bottom of the home screen is an endless 1v1 rally, with
the odd spike that knocks a player over. Signed in, it's you (left) vs your
rival (right): your toughest opponent (see "Partners & rivals" below), or,
until you have one, the #1 ranked player (#2 if you're #1). Signed out, it's
#1 vs #2. Each player is their pixel avatar (`src/avatar/engine.js`), with
their first name underneath, in the avatar, skin color and outfit (or
monster) they picked in the Locker; plain grey clothes if they wear nothing. The item art only downloads
when one of the two wears something. On short screens (small
phones, landscape) the avatars and net are drawn a bit smaller so tall
headgear and jumps fit.

### Tokens, the Cauldron and the Locker

Every ranked game saved since 2026-10-24 earns tokens for each player in it
who signs in: 2 for a win, 1 otherwise, at most 10 a day (Eastern time, by
when the game was saved). Casual games, placeholder players and older games
earn nothing; games a placeholder brings into an account through a merge
never pay. Tokens are counted about a minute after a game is saved and are
never taken back. On 2026-10-24 every account that signs in with Google got
a one-time gift of 10 tokens (`token_gifts`, migration
`20261024235000_gift_10_tokens.sql`); accounts made later don't get it.

- **Profile card:** every profile shows the player's pixel avatar on a
  little stage, with what they wear (head, shirt, pants, shoes, and a
  monster if they're transformed). Your own adds your token count and
  **Change outfit**, which opens the Locker.
- **Avatar and skin color:** free for everyone from the start, picked at
  the top of the Locker: **Avatar 1** or **Avatar 2** (the same body and
  gear zones, so every item fits both; Avatar 2 has longer hair) and one of
  four skin colors (default: Avatar 1, skin color 2). Saved by `set_look()`
  (migration `20261024230000_avatar_and_skin_color.sql`).
- **Locker:** your avatar big on top, a tab per slot plus Monsters, and a
  tile for each item you own (rarest first; nothing you don't own shows).
  Tapping a tile wears it and saves at once; **Plain** takes a slot off. A
  monster covers your whole outfit; **Back to my outfit** (or wearing any
  clothing) switches it off. NEW badges clear when you leave the Locker.
  Quick taps always end on the last one; if a save fails, just that change
  is undone and a message says which. If the item pictures can't download
  (a bad connection, or the app was updated while open), the Locker offers
  **Try again** and **Reload app** instead of loading forever.
- **Cauldron** (from the Locker): 1 token = 1 brew. The database rolls the
  prize, always something you don't own yet (odds in `pull_odds`). The token
  drops in, the brew climbs through the tier colors, a geyser carries the
  prize up, then **Wear it** puts it on. Once the token is spent the prize
  is always shown, with its name and tier even if its picture didn't load.

Code: screens in `src/components/loot/`, data calls in `src/avatar/loot.js`,
item art in `src/avatar/art/` (loaded on demand, keyed by the database's
item keys; `art.test.js` checks every catalog item has art). The database
side is migration `20261024200000_tokens_items_and_pulls.sql`. Halloween
items stop dropping on Dec 1.

### Profile stats

Below the Overall/Ranked records, a profile shows:

- **Elo over time.** A line chart of their Elo after every ranked game,
  one evenly spaced step per game, from their starting rating. Touch, hover
  or use the arrow keys to read each game's date, Elo and change. Signed-in
  members only, since Elo history isn't public.
- **Partners & rivals.** Most frequent partner, best partner (highest win
  rate together), and toughest opponent (lowest win rate against, only
  someone they've lost to). Best and toughest need at least 3 games. All
  games count, ranked and casual, beach and indoor. Typed-in names that
  aren't linked to a profile don't count. Tap one to open their profile.
- **Their games.** Each ranked game's card shows that player's Elo change
  as a green **+15 Elo** or red **−22 Elo** pill, for signed-in members
  only (same reason as the chart). Casual games show none.

### Motion

Small animations give the app a livelier feel. With "reduce motion" on in
the phone's settings, they're all skipped and everything just appears.

- The Elo chart waits until it's on screen, pauses a moment, then draws its
  line left to right; the soft fill and end dot follow.
- The scoreboard number kicks up on +1 and dips on −1. The win and
  switch-sides banners spring in, and the serve marker pops in.
- Screens ease in when opened, list rows rise in one after another, and
  tappable cards shrink slightly while pressed.
- The profile Elo ticks up to its value, and the loading meteor floats
  while its stars twinkle.

The shared animations live in `src/index.css` (the "App-wide motion"
section); `stagger()` in `src/lib/motion.js` spaces out list rows.

### Seasonal themes (Halloween)

The app can wear a temporary skin without changing its normal look. The
**Halloween** theme (pixel font, purple night sky, orange accents, moon,
stars, bats, a ghost and a graveyard) is on from Oct 1 through Nov 20,
2026, by the phone's own clock, and switches itself off at midnight going
into Nov 21. On the live scoreboard only the stars and bats show, so nothing
sits behind the +1/−1 buttons.

The rank badges change for the theme too (same ranks and titles, only the
pictures): pumpkins for Bronze, ghosts for Gold, skulls for Diamond,
Frankenstein (#3), a witch (#2) and a crowned vampire (#1), a cracked RIP
tombstone with a zombie hand for last place and a plain tombstone for
unranked. The top three and last place are animated: the vampire's bats,
the witch's sparkles, Frankenstein's stomp and blink, and the RIP stone's
green glow and fog (phones set to reduce motion get still pictures). They live in
`src/themes/halloween/badges/`; the classic badges in `src/assets/badges/`
are untouched and come back with the classic look.

The home-screen rally gets the same treatment: the players hit a
jack-o'-lantern over a cobweb net on bone posts (with a little spider). Only
the ball and net change (`src/themes/halloween/rally.js`).

Players with no profile photo get a pixel-art Halloween monster in their
photo circle instead of the blank one: 100 of them (vampires, witches,
zombies, ghosts, skeletons, werewolves, mummies, jack-o'-lanterns,
Frankensteins and black cats, each in 10 goofy versions). Each player
always gets the same one (picked from their profile id), on every screen.
Players whose Google "photo" is just Google's coloured circle with their
first initial get one too: each phone looks at every Google picture once
(`src/themes/halloween/googleLetterPhotos.js`) and remembers which are
plain letters, so on a first visit the letter can show for a moment before
the monster replaces it. Nothing is saved to anyone's profile: anyone with
a real Google or uploaded photo keeps it, uploading a photo replaces the
monster right away, and
everyone goes back to the blank circle when the theme ends. Typed-in names
with no profile stay blank, and the admin screens always show the real
photo (or none). The pictures are in `src/themes/halloween/avatars/`,
drawn by `generate.mjs` there (`node src/themes/halloween/avatars/generate.mjs`
redraws them after an edit).

- **Preview either look any day:** add `?theme=classic` or
  `?theme=halloween` to the address. It lasts until you reload without it.
- **Turn it off early or change the dates:** edit the `from`/`until`
  dates in `src/themes/activeTheme.js`. If something looks wrong during
  Halloween, `?theme=classic` is the instant workaround; turning the theme
  off is a one-line push, live in about a minute.
- **The classic look is untouched.** Every Halloween rule only applies while
  the theme is on, and with it off the app is pixel-for-pixel what it was
  before (checked screen by screen, including Rankings and profiles). The
  exact pre-Halloween code is also kept under the git tag
  `classic-theme-2026` (on GitHub under Tags).
- **Remove it for good:** delete `src/themes/halloween/` and the Halloween
  entry in `activeTheme.js`, then the lines that use them: the CSS import
  and `applyTheme` call in `main.jsx`, the `HalloweenDecor` line in
  `App.jsx`, the `halloween`/`ART` swap in `RankBadge.jsx`
  (`BADGES` and `UnrankedBadge` are the classic ones), and the Halloween
  imports and line in `src/themes/playerPhoto.js` (plus its test) and the
  letter-photo `useSyncExternalStore` line in `App.jsx`, and the
  `halloween` lines in `VolleyballRally.jsx`.

Everything for the theme lives in `src/themes/`. Its fonts (Pixelify Sans,
Press Start 2P) are free under the SIL Open Font License.

### Rank titles

Each rank badge has a title, shown under the player's name in Rankings and
next to their Elo on their profile (where the badge shows 3× bigger in the
top-right corner, its top level with the profile photo): **Bronze I–III**, **Gold I–III**,
**Diamond I–III** (III is the top of each tier), then **Emerald** (#3),
**Amethyst** (#2) and **Champion** (#1). The lowest-ranked player is
**Platinum** (the stink badge — it's a joke). Names live in
`src/lib/rankTitle.js`; which badge a player gets is in `useLeaderboard.js`.

### Profile photos

A player's photo starts as their Google account photo (copied once, at
first sign-in). On their own profile page, tapping their photo opens a
bottom sheet to **Take photo** with the camera or **Choose from library**,
then preview and save it. The phone center-crops it to a square, shrinks it
to 512px, and strips its metadata (e.g. GPS location) before uploading to
their own folder in the `profile-photos` storage bucket. Players can only
ever change their own photo, never anyone else's — see migration
`20261022120000_players_set_own_profile_photo.sql`. Closing the sheet
means "never mind": a photo still being prepared is dropped. Admin
**Add Manual Profile** photos get the same crop, shrink and metadata strip.
The bucket only accepts JPEG, PNG or WebP images up to 2 MB (a prepared
photo is a few hundred KB at most), and a player's photo link must point at
this app's own Supabase project
(`20261025030000_profile_names_and_photo_limits.sql`).

### Player names

Every profile has a name; the database refuses a blank one. A new Google
account takes its Google name, or **New player** if Google gives none (never
the email address, since profiles are public); older nameless profiles were
given it too. An admin can rename anyone from their profile page. Even so, your own profile, Locker and Cauldron never depend on having
a name.

### Admin tools

The **Admin Panel** button on the home screen only appears for admin
accounts (`profiles.is_admin`). Current admins: the owner, and Julia
Swalchick (from 2026-10-22). There's no in-app button to make someone an
admin. It's a one-line database change, done as a new migration (see
`20261022230000_make_julia_admin.sql`) or run by hand in the Supabase SQL
Editor. This repo is public, so a migration matches the person by an md5 of
their lowercase sign-in email, never the email itself. They must have
signed in to the app at least once first, or the change matches nothing.
Removing admin is another migration that sets `is_admin = false`. It
contains:

- **Sign-Up QR Code** — the fastest way to onboard a new player in person.
  Shows a QR code for `brevardvolleyballclub.com/?join=1`; when they scan it
  with their phone camera, the app skips the intro animation and sends them
  straight to Google sign-in. Their first Google sign-in creates their player
  profile automatically (the `handle_new_user` database trigger), and they
  land directly on their own player profile page. If they back out of
  Google, they get a "Sign-in didn't finish" screen with a retry button. The QR code points at whatever site it's opened
  from, so open it on the live site, not a local dev server.
- **Add Manual Profile** — create a player with no Google account.
- **Recompute Elo Ratings** — reset and replay every ranked game's rating.
- **Merge Profiles** — combine a manual profile into the player's real
  Google profile (e.g. after someone who played as a manual profile signs up
  via the QR code). Its **Find a player** box checks whether someone
  already exists: matching players show up tagged Google or Manual, and if
  nobody has exactly that name, **+ Add "Name" as a new player** creates them
  as a manual profile on the spot (name only; use Add Manual Profile for a
  photo). After a merge the lists reload, so the removed profile is gone.

Admins also see an **Admin only** box on every player's profile (open a
player from Rankings): their sign-in email, how they sign in, when they
signed up and last signed in, whether they're an admin, any email/phone
from tournament registration forms, and the profile ID. A profile marked
"Manual profile" has no sign-in account. The data comes from the admin-only
`admin_profile_details()` database function
(`20261022220000_admin_profile_details.sql`); players never see the box or
the data.

The box also lets an admin rename the player: **✏️ Edit** next to "Display
name" (up to 24 characters). The new name shows everywhere straight away
(rankings, profiles, player search, game details, tournaments), except the
team names on games already played, which keep the name used at the time.
Saved by the admin-only `admin_set_display_name()` function
(`20261023180000_admin_set_display_name.sql`).

Anywhere the app lets you copy something (those details, a tournament's
share link), it shows a copy icon, and tapping the text or the icon copies
it. The icon briefly turns into a ✓. New copyable text should use
`src/components/CopyableText.jsx` so it works the same way.

### Tournaments (Queen of the Court)

The **Tournaments** button on the home screen lists every published
tournament. Each one has a public live page, which needs no sign-in. Its
link is `brevardvolleyballclub.com/?t=<id>`, shown at the bottom of the
page (tap it to copy). The page shows each division's pools, live standings and the fixed
game order, highlights who's up next, and shows a signed-in player their own
next game.

How a tournament runs (admins do this from **Manage tournament**). The
rules below are the Queen of the Court rules confirmed by the organizer for
Queen of Paradise (2026-10-31):

1. **New tournament.** Enter the name, date, location and divisions, and
   whether games count toward Elo. The game rules here only cover unusual
   pool sizes; pools of 4 and 5 and the finals have fixed rules (below).
2. **Import registrations.** Copy the Google Form's response sheet,
   including the header row, and paste it in. Each name is matched to an
   existing player, or a manual profile is created. You confirm every row
   first. Email and phone are kept in an admin-only table. Date of birth is
   never stored. If the sheet has AVP ranking, TruVolley score or junior
   columns, those come in too. The import goes in all at once or not at
   all, so after an error just tap Import again: anyone already entered is
   skipped and listed. A "new" name that exactly matches an existing player
   (ignoring case and accents) reuses that player rather than making a
   duplicate, unless you picked "New profile" for it on purpose (two people
   with one name). Even then, if a player with that name is already
   entered, the row is skipped, so a retry never adds them twice; to enter
   a second person with the same name, create them with Add Manual Profile
   and add them on Players. If the player list can't load, the review step
   waits with a Retry button.
3. **Players & check-in.** Tap a player for their details: AVP rank,
   TruVolley score (used for seeding), and a **Junior** box (juniors play in
   adult divisions but can't win cash prizes). A division under 5 players
   shows **Merge all into…** to move everyone to the next level up or down.
   On the day, tap each player as they arrive. **Remove from tournament**
   (e.g. a no-show) says exactly what will happen before you confirm, and
   does it all in one step: if nothing in their pool has been scored or
   started, the pool gets a fresh schedule for the players left (a pool of
   5 becomes a pool of 4 with its own rules); otherwise only their unplayed
   games go, scored games stay (they're real, rated games), and the other
   games keep their numbers. An unplayed final they're in goes too (set it
   up again on Finals). Someone in a final that already has a scored set
   can't be removed: undo that set's score first, or leave them in.
4. **Pools & schedule, round 1.** Pools are 4s and 5s, snake-seeded by AVP
   rank, then TruVolley, then Elo. Pools of 4 play 3 games to 28 (cap 30);
   pools of 5 play 4 games to 21 (cap 23); always win by 2. Everyone
   partners everyone once. Preview, move players by hand if needed, save,
   then **Publish**. If anyone didn't show, rebuild with checked-in players
   only; **Start tournament** stays locked until the pools match check-in
   and no unplayed game lists someone who isn't in its pool (the same
   warnings stay visible while the tournament is live).
5. **Scoring.** Any signed-in member taps a game on the live page and keeps
   score point by point (spectators see it live) or types the final score.
   Each scored game is saved as a normal 2v2 beach game, so Elo and game
   history work as usual. A wrong score: an admin taps **undo this score**
   on the live page, and the game can be scored again. Opening a game to
   keep score starts from its current live score and sends nothing until
   someone taps a point on that phone, so a second phone can't reset it.
   If two phones keep score on one game, each follows the other's taps
   while it's idle (it says so), and the latest tap wins. A phone that
   lost signal holds its unsent taps and sends them when it reconnects,
   unless another phone has updated the game since, in which case it
   shows that newer score instead. Players rank by
   games won, then fewest points against; a tie after that is settled by a
   mini game to 15 on the sand (the page flags it; it isn't scored in the
   app). If players in a pool end up with different numbers of games
   (someone was removed mid-pool, or an admin changed a game's players),
   that pool ranks by share of games won, then share of points won,
   and says so under its table.
   An admin changing a tournament game's players (Edit Game) also changes
   them in the schedule and standings. A substitute who isn't in the pool
   gets no standings row; the game still counts for the pool players in
   it, and for everyone's Elo. Edit Game never changes "Submitted by".
6. **Round 2.** Once every round 1 game is scored, **Preview round 2**
   re-pools each division into Gold, Silver, Bronze and Copper pools (one
   per round 1 pool). Two pools of 4: top 2 of each pool to Gold, bottom 2
   to Silver. Four pools: 1st of each pool to Gold, 2nd to Silver, and so
   on. Two pools of 5, or three pools: everyone ranked together and split
   top to bottom (share of games won, then share of points won, so pools
   of 4 and 5 compare fairly). Ties at a cut line are flagged so you can move the
   mini-game winner. Round 1 results don't carry over. A division with one
   pool skips round 2.
7. **Finals.** Each round 2 pool's top 2 play a final, each with a partner
   of their choice from their division. Best 2 of 3 sets (21, 21, 15, or
   all to 21), or one set to 21 if both teams agree; win by 2, no cap. A
   third set that isn't needed disappears on its own. Only the Gold final
   decides the Queen and the cash prize.
8. **Crown the winners.** Queen and Princess default to the Gold final's
   winner and runner-up. The 👑 and 👸 show on player profiles, and every
   entrant's profile lists their tournaments.

A player imported as a manual profile who later signs up with the QR code
keeps their tournament history when you merge the profiles.

Tournament games show up in Past Games and on player profiles like any
other game. They also get a tag with the tournament's name and stage, e.g.
"👑 Queen of Paradise · Pool play" or "· Final". The pool letter isn't shown.
"Pool play" gets a round number ("Pool play · Round 2") only when the
division had a second round of pools. Tapping the tag opens the tournament.
This needs no extra database column. The link already exists as
`tournament_matches.game_id` (see `src/lib/tournamentGameTag.js`).

### Local development

```bash
npm install
npm run dev       # dev server with hot reload
npm run build      # production build to dist/
npm run preview    # preview the production build locally
```

### Testing

```bash
npm test           # unit tests (Vitest), no backend needed
npm run test:e2e   # browser tests (Playwright) against the staging backend
```

Unit tests sit next to the code they cover (`src/**/*.test.js`). Each
`e2e/*.spec.js` says what it covers in its test names; what isn't covered
yet is listed in `TODO.md`.

The browser tests run against a separate **staging** Supabase project, never
the real club data. They sign in as two test-only bot accounts whose
credentials live in the gitignored `.env.local` (see `CLAUDE.md`).

Staging also holds permanent fake data for trying things by hand. Leave it
in place, since nothing recreates it automatically:

- **Players and games** (`node e2e/seedStagingGames.js`): ranked players
  covering every rank badge (e.g. Sam Whitaker, Maya Torres), players with
  only casual games, and players with no games. `e2e/profileEloChange.spec.js`
  relies on these ranked games, so they must always be there.
- **Tournaments** (`node e2e/seedStagingTournaments.js`, run after the one
  above):
  - **Fall Classic 2026** is finished: round 2, finals of 3 sets, 2–0 and
    1 set, a junior finalist, ties, and two players with the same name.
  - **Halloween Bash** is live: partly scored, with a game in progress, a
    pool of 7, and a division too small for a pool.
  - **Winter Wahine Invitational…** is published: an 80-character name,
    mixed pool sizes, and an empty division.

  Each script's header lists everything it covers. Re-running either one
  skips whatever already exists and never deletes. Both refuse to run
  against anything but staging. `DRY_RUN=1` previews the tournament script
  without writing anything.

### Hosting: GitHub Pages

Every push to `main` auto-deploys via `.github/workflows/deploy.yml`. The
custom domain is set in the repo's Settings → Pages (Source: **GitHub
Actions**, **Enforce HTTPS** on) and in the `CNAME` file. If the domain
ever stops resolving, the registrar needs four **A** records for `@`:
`185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
`185.199.111.153` (and optionally a `www` CNAME to
`TomAnastasio.github.io`).

## Running Claude Code (sandboxed)

Claude Code runs inside a Docker container here so it can never touch anything
on this computer outside this project folder.

To start it:

```bash
cd .devcontainer
docker compose run --rm claude
```

The first time, it'll ask you to log in (follow the printed link in your
browser). After that, login and settings are remembered automatically.

Claude pushes its work straight to `main`, which auto-deploys within a
couple of minutes, with no review step (owner's choice; see `CLAUDE.md`).
Ask Claude to switch back to branch + pull request review any time.

On the Windows PC, the container is started from a launch config kept
*outside* this repo (so Claude can't change what the container is allowed to
reach), and the SSH key it pushes with is held in Bitwarden: Claude can use
it, but never sees it. Revoke it any time by deleting the deploy key under
the repo's Settings → Deploy keys.
