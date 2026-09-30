# To Do

## 1. Sync saved games across devices
Status: **not started** — queued, no implementation work done yet.

Progress notes:
- 2026-09-30: Logged this item at user's request. User explicitly does not
  want it built yet, just tracked. Did preliminary research so future-me
  doesn't have to re-derive it:
  - App currently has zero backend. It's a static Vite/React app (deployed via
    GitHub Pages, CNAME = brevardvolleyballclub.com).
  - All game state lives in `localStorage` only, nothing synced:
    - `src/hooks/useGameHistory.js` (key `bvc-game-history-v1`) — saved game history list
    - `src/hooks/useScoreboardState.js` (key `bvc-scoreboard-v1`) — in-progress game
  - When work starts, will need decisions from user: (a) which backend
    (Firebase/Supabase/custom API), (b) access model (open shared pool vs.
    name-tagged vs. real login).

## 2. Fix the look of the net graphic on landing page
Status: **not started** — owned by user, just tracking per their request.

Progress notes:
- 2026-09-30: Logged at user's request. User is fixing this themselves, not
  asking me to implement. Likely lives in `src/components/VolleyballRally.jsx`
  or `src/components/LandingView.jsx` (landing page rally animation added in
  recent commits) — not yet confirmed, just a starting-point guess for later.

## 3. Account profiles / login (Google, Apple sign-in)
Status: **not started** — queued, no implementation work done yet.

Progress notes:
- 2026-09-30: Logged at user's request. Idea is user profiles with
  "Sign in with Google" / "Sign in with Apple" style social login, rather than
  a custom username/password system.
- This overlaps directly with [[1. Sync saved games across devices]] — real
  accounts would settle the "access model" open question noted there (open
  shared pool vs. name-tagged vs. real login → this picks "real login").
  Should probably be scoped/designed together with item 1 rather than
  separately, since whichever backend is chosen for game sync (Firebase/
  Supabase/custom) likely also provides the auth layer (e.g. Firebase Auth,
  Supabase Auth both support Google + Apple sign-in out of the box).
- Apple Sign-In specifically requires an Apple Developer Program account
  ($99/yr) to configure — worth flagging to user when this gets picked up.

## 4. ELO rating system for accounts
Status: **not started** — queued, no implementation work done yet.

Progress notes:
- 2026-09-30: Logged at user's request. Depends on [[3. Account profiles /
  login]] existing first (need real profiles to attach a rating to). Also
  depends on [[5. Ranked vs. for-fun game modes]] since ELO should presumably
  only update from ranked games, not casual ones.

## 5. Ranked vs. for-fun game mode selection
Status: **not started** — queued, no implementation work done yet.

Progress notes:
- 2026-09-30: Logged at user's request. Players choose "ranked" or "for fun"
  before/when starting a game. Ties together [[4. ELO rating system]] (only
  ranked games should affect ELO) and [[6. Require profiles for ranked games]]
  (ranked mode is where the profile-selection requirement applies).

## 6. Require known profiles for ranked games
Status: **not started** — queued, no implementation work done yet.

Progress notes:
- 2026-09-30: Logged at user's request. Rule: to start a **ranked** game,
  every participant (all players on both teams, not just the one starting the
  game) must have a known profile selected — no anonymous/blank-name players
  allowed in ranked mode. For-fun games presumably keep today's free-text
  name entry. Depends on [[3. Account profiles / login]] existing and ties
  directly to [[5. Ranked vs. for-fun game modes]].

## 7. Phone number based accounts
Status: **not started** — queued, no implementation work done yet.

Progress notes:
- 2026-09-30: Logged at user's request. Idea: use phone number (e.g. SMS/OTP
  verification) as an account identifier/login method, as an alternative or
  addition to the Google/Apple sign-in in [[3. Account profiles / login]].
  Note for later: phone auth usually isn't free at scale — e.g. Firebase Auth
  phone sign-in and Supabase phone auth both require hooking up a paid SMS
  provider (Twilio or similar) rather than being covered by the free tier like
  Google/Apple sign-in are. Worth flagging cost tradeoff to user when picked
  up. Needs a decision on whether phone replaces or supplements social login.
