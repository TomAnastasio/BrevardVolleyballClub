# Brevard Volleyball Club

## Beach Volleyball Scoreboard

A free, mobile-first web app for keeping score of volleyball games, tracking
player Elo rankings, and finding places to play. No install — just open it in a
phone browser. Live at
[brevardvolleyballclub.com](https://brevardvolleyballclub.com). Sign-in (Google)
and all game/profile data live in Supabase — see `supabase/README.md`.

Built with React, Vite, Tailwind CSS, and [HeroUI](https://www.heroui.com) as
the component/design library.

### Profile photos

A player's photo starts as their Google account photo (copied once, at
first sign-in). On their own profile page, tapping their photo opens a
bottom sheet to **Take photo** with the camera or **Choose from library**,
then preview and save it. The phone center-crops it to a square, shrinks it
to 512px, and strips its metadata (e.g. GPS location) before uploading to
their own folder in the `profile-photos` storage bucket. Players can only
ever change their own photo, never anyone else's — see migration
`20261022120000_players_set_own_profile_photo.sql`.

### Admin tools

The **Admin Panel** button on the home screen only appears for the admin
account (`profiles.is_admin`, set by hand in Supabase). It contains:

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
  via the QR code).

### Tournaments (Queen of the Court)

The **Tournaments** button on the home screen lists every published
tournament. Each one has a public live page, which needs no sign-in. Its
link is `brevardvolleyballclub.com/?t=<id>` and the page has a Copy link
button. The page shows each division's pools, live standings and the fixed
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
   columns, those come in too.
3. **Players & check-in.** Tap a player for their details: AVP rank,
   TruVolley score (used for seeding), and a **Junior** box (juniors play in
   adult divisions but can't win cash prizes). A division under 5 players
   shows **Merge all into…** to move everyone to the next level up or down.
   On the day, tap each player as they arrive.
4. **Pools & schedule, round 1.** Pools are 4s and 5s, snake-seeded by AVP
   rank, then TruVolley, then Elo. Pools of 4 play 3 games to 28 (cap 30);
   pools of 5 play 4 games to 21 (cap 23); always win by 2. Everyone
   partners everyone once. Preview, move players by hand if needed, save,
   then **Publish**. If anyone didn't show, rebuild with checked-in players
   only; **Start tournament** stays locked until the pools match check-in.
5. **Scoring.** Any signed-in member taps a game on the live page and keeps
   score point by point (spectators see it live) or types the final score.
   Each scored game is saved as a normal 2v2 beach game, so Elo and game
   history work as usual. A wrong score: an admin taps **undo this score**
   on the live page, and the game can be scored again. Players rank by
   games won, then fewest points against; a tie after that is settled by a
   mini game to 15 on the sand (the page flags it; it isn't scored in the
   app).
6. **Round 2.** Once every round 1 game is scored, **Preview round 2**
   re-pools each division into Gold, Silver, Bronze and Copper pools (one
   per round 1 pool). Two pools of 4: top 2 of each pool to Gold, bottom 2
   to Silver. Four pools: 1st of each pool to Gold, 2nd to Silver, and so
   on. Two pools of 5, or three pools: everyone ranked together and split
   top to bottom. Ties at a cut line are flagged so you can move the
   mini-game winner. Round 1 results don't carry over. A division with one
   pool skips round 2.
7. **Finals.** Each round 2 pool's top 2 play a final, each with a partner
   of their choice from their division. Best 2 of 3 sets (21, 21, 15, or
   all to 21), or one set to 21 if both teams agree; win by 2, no cap. A
   third set that isn't needed disappears on its own. Only the Gold final
   decides the Queen and the cash prize.
8. **Best costume.** Open voting from the tournament's manage screen.
   Each signed-in player gets one vote (changeable, not for themselves) on
   the live page. Votes are private; the tally shows only to admins until
   the tournament is finished.
9. **Crown the winners.** Queen and Princess default to the Gold final's
   winner and runner-up, and best costume to the most votes. The 👑, 👸
   and 🎃 show on player profiles, and every entrant's profile lists their
   tournaments.

A player imported as a manual profile who later signs up with the QR code
keeps their tournament history when you merge the profiles.

### Local development

```bash
npm install
npm run dev       # dev server with hot reload
npm run build      # production build to dist/
npm run preview    # preview the production build locally
```

### Hosting: GitHub Pages

Every push to `main` auto-deploys via `.github/workflows/deploy.yml`.

One-time setup in the GitHub repo:
1. Settings → Pages → Source: set to **GitHub Actions**.
2. Settings → Pages → Custom domain: enter `brevardvolleyballclub.com` (the
   `CNAME` file in this repo already declares it, but GitHub also needs it set
   here) → Save. Check **Enforce HTTPS** once the certificate is issued
   (can take up to ~24h after DNS is correct).

### DNS setup (at your domain registrar)

Point the apex domain at GitHub Pages with these four **A** records for `@`:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

If you also want `www.brevardvolleyballclub.com` to work, add a **CNAME**
record: `www` → `TomAnastasio.github.io`.

DNS changes can take anywhere from a few minutes to a few hours to propagate.

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
couple minutes — there's no pull request or review step (by the owner's
choice, made 2026-10-20, trading that checkpoint for speed). Ask Claude to
switch back to a review-first branch + PR workflow any time you want it.

On the Windows PC, the container is started from a launch config kept
*outside* this repo (so Claude can't change what the container is allowed to
reach), and the SSH key it pushes with is held in Bitwarden: Claude can use
it, but never sees it. Revoke it any time by deleting the deploy key under
the repo's Settings → Deploy keys.
