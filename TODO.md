# TODO / roadmap

What's left to do, what's still unconfirmed, and the owner's decisions that
shape future work. How things work today lives in `README.md`; history lives
in `git log`. When something here ships or gets confirmed, shrink it to a
one-line decision (or delete it) rather than leaving the old detail.

## Halloween theme (auto-off 2026-11-21)

After Halloween, ask the owner whether to delete `src/themes/halloween/`
(steps in README "Seasonal themes") or keep it for next October with new
dates.

## Pixel avatars: what's left

Tokens, the profile card, the Locker, the Cauldron, outfits in the
home-screen rally, and Avatar 1/2 with four skin colors are live (README
"Tokens, the Cauldron and the Locker"). Not built yet: a non-Halloween item
set (needed before Dec 1, when Halloween items stop dropping and brewing
says there's nothing left), victory/defeat poses on past games, and the
later ideas in PLAN.md (held items, name colors, borders). Full plan:
`design/gacha/PLAN.md` and `DATABASE.md` on branch
`claude/gacha-avatars-design`, which also has the item catalog generator and
the database scenario tests. Halloween items stop dropping Dec 1.
Unconfirmed: when you're #1 with no toughest opponent, your rival is #2.

## Open: tournaments (Queen of Paradise, Sat 2026-10-31)

Live in production; how it runs is in README "Tournaments", the rules are
at the top of `src/lib/queenOfCourt.js`. Assumptions still to confirm with
the organizer:
- Finals third set defaults to 15 (standard beach); "all to 21" is an
  option on the Finals screen.
- AVP ranking is a rank number (lower = better); TruVolley score: higher =
  better.
- Mini-game tiebreaks (to 15) aren't scored in the app: it flags the tie
  and the admin moves the winner (round 2 preview) or picks finalists.
- 5+ round 1 pools in one division would make "Tier 5" pools (no rule
  given).

Known bugs, found on the demo tournaments 2026-10-23:
- Tournament games are dated when the score is entered, not the
  tournament's date (`submit_tournament_match_score` uses now()), so late
  entries show the wrong day in Past Games.
- Standings tables cut names short ("Zoë Ramí…", "Anastasi…").
- Two players with the same name (the two "Sam Lee"s) look identical
  everywhere in a tournament.

Not built: in-app registration/payments (Google Form + Venmo for now),
placings beyond Queen/Princess, court auto-assignment (court is a free-text
label per pool).

After the event: collapse README "Tournaments" and this section once the
assumptions above are settled.

## Next up (owner picks; one item at a time)

- **Past Games:** filters (All/Ranked/Casual/Tournaments), a "Mine" toggle,
  grouping by day, each tournament collapsed into one row. Same filters on
  a profile's game list.
- **Scoreboard:** a "who scored each point" tile strip (owner liked mockups
  8A–8E). Point order is phone-only today, so showing it in Past Games needs
  a migration to save it with the game.
- **Motion ideas offered 2026-10-23, not picked yet:** confetti on a win or
  crowning; a gold flash when a player moves up the rankings; standings
  re-sorting with motion; shimmer placeholders while loading; an up/down
  arrow by a player's Elo for their last game.
- **Profile photos:** drag/zoom to adjust the crop (always center-cropped
  now); old replaced photos pile up in storage (~50KB each; players can't
  delete, on purpose).
- Undecided: separate Elo for beach and indoor.

## Decisions to keep honoring

- No ranked seasons yet: every ranked game so far is "season 1", and the UI
  says plain "Overall" / "Ranked". Seasons come only when the owner asks.
- Elo history is members-only: the Elo chart, game-detail Elo changes and
  the Elo pill on profile game cards are hidden when signed out
  (2026-10-22).
- Landscape scoreboard is "perfect", don't change it. No momentum charts,
  run counts ("4–0 run") or who-was-leading graphs.
- Serving = whoever won the last rally; no coin-toss picker. Switch sides
  every 7 combined points, beach only.
- Best costume was removed for good (2026-10-22). The owner dropped its
  columns/table/functions by hand on prod and staging; a database rebuilt
  from migrations would get them back, empty and unused. Don't re-add it.
- Direct pushes to `main`, no PR step (2026-10-20); see CLAUDE.md.
- Pixel avatars (2026-10-24): the base choices are labeled "Avatar 1",
  "Avatar 2" and "Skin color", never with gendered words. The three slime
  shoe sets stay "Slime Kicks", "Slime Kicks II", "Slime Kicks III". The
  10-token gift was one time only; another gift is the owner's call (how:
  `supabase/README.md` "Tokens and items"). The design branch
  `claude/gacha-avatars-design` stays separate from `main`, not merged.

## Testing gaps

Each `e2e/*.spec.js` names what it covers in its test titles. Not yet
covered, most valuable first:
1. **Merge Profiles** — the feature that once had a real data-loss bug
   (076bf8c). Two manual profiles each with a game, merge, verify both
   games survive and point to one profile.
2. **Recompute Elo Ratings.**
3. **Delete Game** (admin, in `EditGameScreen.jsx`).
4. Indoor 6v6 games; the admin-only contact box on profiles (checked by
   hand 2026-10-22).

CI: the Tests workflow's e2e step has failed on every push since
2026-10-20, because the staging URL/key and bot logins live only in
`.env.local`, not GitHub secrets. It doesn't block deploys. Fix: add them as
secrets in a GitHub environment and pass them to that step.

## Risk: staging test setup lives only in this container's `.env.local`

The staging URL/anon key and both bots' logins (`E2E_ADMIN_EMAIL`/
`PASSWORD`, `E2E_PLAYER_EMAIL`/`PASSWORD`) exist only in the gitignored
`.env.local`. If a fresh container doesn't have it:
1. Copy the staging project's URL + anon key from its dashboard
   (Settings → API).
2. Recreate `.env.local` with those plus new bot email/password pairs.
3. Owner re-runs the one-time `profiles.is_admin = true` grant for the new
   admin bot in the staging SQL Editor (see `ADMIN_NAME` in
   `e2e/signInAsTestUser.js`).
4. `node e2e/seedStaging.js` (test profiles Bob/Carla/Dana), then
   `node e2e/seedStagingGames.js` (demo players and ranked games —
   `profileEloChange.spec.js` needs these), then
   `DRY_RUN=1 node e2e/seedStagingTournaments.js` and again without
   `DRY_RUN` (a published tournament can't be deleted if a run goes wrong).
   All are safe to re-run and never delete.
