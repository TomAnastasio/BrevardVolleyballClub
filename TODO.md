# To Do

## Overall App Goals & Scope (read this first)
Captured 2026-09-30 from a goals-scoping conversation with the user. This is
vision/context, not a task — re-read before making scope calls on the
numbered items below, since most of them exist to serve this.

**The two pillars:**
1. **Discovery** — be the place people go to see what pickup volleyball is
   happening around Brevard County, FL right now.
2. **Competition** — get people to genuinely care about their personal (and
   later team) ranking county-wide, and want to climb it.

**Audience & scale:** Brevard County, FL only. Realistically 100–500 people
total, ever. Explicitly no ambition to scale beyond the county — don't over-
engineer for growth that isn't wanted.

**Pace:** User wants to actively build toward the full platform (accounts,
sync, rankings), not just idle on a static site. Treat items 1, 3–7 below as
live near/mid-term roadmap, not someday-maybe.

**Budget:** Hard ceiling of ~$200/year total. Default to free-tier services;
only spend when there's clear ROI against the two pillars above (e.g. Apple
Developer Program for real Apple sign-in could be worth it; a paid SMS
provider needs to earn its keep — see item 7).

**Discovery/schedule details:**
- The weekly schedule should eventually list *all* public pickup volleyball
  groups in the county (not just BVC's), alongside BVC's own private group
  info.
- Owner-curated only, forever — the user is explicitly the sole editor of
  that schedule. This is not a self-serve/crowdsourced listing where other
  organizers submit their own events.
- Volume is intentionally tiny: always under ~30 events/week, probably
  settling around ~15. No need to design for scale here.

**Ranking system details:**
- Individual ELO first (ties to [[4. ELO rating system for accounts]]).
- Team rankings are a **mid-term** goal, computed as the combined ELO of a
  team's members (not a standalone/static team rating). A separate persistent
  team-ELO system is a distant, maybe-never feature — don't build for it yet.
- Ranked-game submission access is meant to **roll out in phases** as trust
  in the system grows (see the updated note on
  [[6. Require known profiles for ranked games]] for the phase list).
- Hard rule at every phase: a ranked game's participants must *all* be
  registered **and approved** accounts to be submitted — no anonymous/free-
  text players in ranked games, ever.

## Architecture Decisions (read this before building 1, 3, 4, 5, 6, 7)
Captured 2026-09-30 from an architecture-scoping conversation with the user.
These are binding decisions for the backend/accounts/ranking work, made so we
don't re-litigate them when implementation starts. User is not a developer and
has no prior database/ELO/BaaS experience — these calls were made by the
assistant based on the user's stated outcomes (low admin overhead, low cost,
ability to ban bad actors, no real-time requirement), not by the user
picking between technical tradeoffs directly.

**Decision: backend platform = Supabase (hosted Postgres + Supabase Auth).**
- Why: the app's data (players, games, ELO history, teams, approvals) is
  inherently relational — Postgres/SQL fits that naturally (joins, views for
  leaderboards, combined-team-ELO queries), whereas Firebase's Firestore
  (NoSQL/document model) would make those same queries more awkward.
- Why not Firebase: its main edge (real-time listeners) is moot — see the
  sync-model decision below, we don't need real-time. Both platforms are free
  at this app's scale (100–500 users, backup/restore-style usage), so the
  data-model fit was the deciding factor.
- Supabase Auth supports Google + Apple sign-in on its free tier and has a
  native "ban user" capability (settable via the Supabase Studio UI without
  writing code), which directly covers the "stop/ban bad actors" requirement
  from [[Overall App Goals & Scope]] with minimal custom work.
- Cost: $0/yr on Supabase's free tier at this scale. Combined with GitHub
  Pages (also free) for the static frontend, total hosting cost stays $0
  against the $200/yr ceiling — leaving full budget headroom for the
  Apple Developer Program ($99/yr, see item 3) and/or SMS provider (item 7)
  if/when those are picked up.
- Known gotcha: Supabase free-tier projects can pause after ~7 days with zero
  API traffic (one manual click un-pauses it). Unlikely to matter given the
  club's weekly usage pattern, but worth knowing if the app goes quiet for a
  stretch (e.g. off-season).
- Frontend stays on GitHub Pages as a static site; it calls Supabase directly
  from the client (via Supabase's JS client + Row Level Security policies).
  No separate server/API to host or pay for.

**Decision: sync model = backup/restore, not real-time.**
- "Sync saved games across devices" ([[1. Sync saved games across devices]])
  means: finish/save a game on one device, see it in history on another
  device later. It does NOT mean two devices editing the same live in-progress
  game simultaneously.
- Why it matters: this rules out needing websockets/real-time subscriptions,
  which significantly simplifies item 1's implementation to plain
  save-on-write / fetch-on-load calls against Supabase.

**Decision: account gating is two independent layers, not one.**
1. **Sign-up itself** ([[3. Account profiles / login]]): open by default.
   Anyone can create a profile via Google/Apple sign-in — no pre-approval
   gate on account creation. Bad actors get banned after the fact (via
   Supabase Auth's ban capability), rather than everyone being vetted before
   they can even sign up. If abuse becomes a real problem later, this can be
   flipped to an invite/approval-gated signup — the schema should stay
   flexible enough to add that without a rework, but don't build that gate
   now.
2. **Ranked-game submission access** ([[6. Require known profiles for ranked
   games]]): a separate, deliberate phased trust rollout (owner-only → club
   admins (~10) → any approved account), unchanged from the existing note on
   item 6. This gate is about trust in ranking data integrity, not spam
   prevention, so it stays intentionally stricter and slower to open up than
   plain sign-up.
- These two gates use separate flags on a user's profile (e.g. `banned` for
  layer 1, `approved` for layer 2) since they serve different purposes and
  roll out on different timelines.

**Decision: build a simple in-app admin screen for ban/approve, not a
DB-console-only workflow.**
- User wants to manage bad actors and (later) ranked-game approvals without
  needing direct database access each time. This is new implicit scope inside
  items 3 and 6 — a minimal admin page (list accounts, toggle
  banned/approved) — not a separate roadmap item of its own.

**Decision: auth rollout sequencing = Google first, Apple later.**
- Ship free Google sign-in when [[3. Account profiles / login]] starts.
  Add Apple sign-in once usage and/or budget clearly justify the $99/yr
  Apple Developer Program cost, rather than paying for it on day one.

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
- 2026-09-30: Resolved by [[Architecture Decisions]] — backend is Supabase,
  and sync means backup/restore (save on one device, appears on another
  later), not real-time simultaneous editing. Access model is settled by
  item 3 (real login), superseding the open-question note above.

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
- 2026-09-30: Resolved by [[Architecture Decisions]] — backend/auth provider
  is Supabase Auth. Sequencing is Google sign-in first (free), Apple sign-in
  added later once justified. Sign-up itself is open by default (no
  pre-approval gate); bad actors get banned after the fact via a simple
  in-app admin screen, not vetted before they can register.

## 4. ELO rating system for accounts
Status: **not started** — queued, no implementation work done yet.

Progress notes:
- 2026-09-30: Logged at user's request. Depends on [[3. Account profiles /
  login]] existing first (need real profiles to attach a rating to). Also
  depends on [[5. Ranked vs. for-fun game modes]] since ELO should presumably
  only update from ranked games, not casual ones.
- 2026-09-30: Per [[Overall App Goals & Scope]], build individual ELO first.
  Team rankings are a mid-term follow-on, derived from combined member ELOs
  rather than a separate static team rating — don't build standalone team ELO
  storage/logic now.

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
- 2026-09-30: Per [[Overall App Goals & Scope]], who is *allowed to submit* a
  ranked game result should roll out in phases as trust builds:
  1. Phase 1 (playtesting): only the user (owner) can submit ranked games.
  2. Phase 2: club admins (~10 people) can submit ranked games.
  3. Phase 3: open to any registered **and approved** account.
  At every phase, the existing rule still applies — all participants in a
  ranked game must be registered and approved accounts, not just the
  submitter. "Approved" implies some kind of admin approval step on account
  registration, which isn't scoped yet.
- 2026-09-30: Resolved by [[Architecture Decisions]] — the "approved" concept
  here is a separate flag from account-level banning (item 3), tracked via
  Supabase, and managed through the same simple in-app admin screen (list
  accounts, toggle approved/banned) rather than direct database access.

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
- 2026-09-30: Per [[Architecture Decisions]], backend is Supabase, so this
  would specifically be Supabase's phone auth (still requires a paid SMS
  provider like Twilio — the cost tradeoff above still applies and still
  needs a go/no-go decision against the $200/yr budget when this is picked
  up).

## 8. County-wide pickup volleyball listing (owner-curated)
Status: **completed** — done.

Progress notes:
- 2026-09-30: Logged from [[Overall App Goals & Scope]]. The app already
  shows a real weekly schedule on the landing page (added in a recent
  commit), but at the time this was thought to be just BVC's own meetups.
- 2026-09-30: User confirmed all known local pickup volleyball in the county
  is already in the app. Marking complete.
