# Ground rules for working in this repo

## Database safety (read before touching anything Supabase-related)

The user is not a developer and the Supabase database holds real,
irreplaceable club data (game history, player profiles, Elo ratings). See
`supabase/README.md` for the full migration/backup/restore story. Hard rules:

- **Never run destructive SQL directly against the production database**
  from a session (`DROP`, `TRUNCATE`, bare `DELETE`, dropping/altering a
  column that loses data, etc.), even if asked to "clean up" or "fix" data.
  Schema changes are new, additive files in `supabase/migrations/` (see
  naming convention there) — never typed/executed ad hoc against the live
  project from inside a session. As of 2026-10-03, committing a migration
  file to `main` auto-applies it to production via
  `.github/workflows/apply-migrations.yml` (see "Automatic migrations" in
  `supabase/README.md`) — the user has explicitly accepted the risk of
  app downtime from a bad migration, recoverable via a follow-up migration
  and, for data loss, the nightly backups. That acceptance does not extend
  to anything destructive or ad hoc — the additive-only and
  never-edit-a-committed-migration rules above still apply in full.
- **Never edit or delete an existing file in `supabase/migrations/`.** Once
  committed, a migration is permanent history. Fix mistakes with a new
  migration file, never by rewriting an old one.
- **Never request, type, paste, or store the Supabase service-role key or
  database password** in this repo, in chat, or in any file. The only
  Supabase credential that belongs in this project's client code is the
  anon/publishable key (already in `.env.local` / GitHub Actions secrets) —
  it's meant to be public. If a task seems to need the service-role key or
  DB password, stop and ask the user to handle that step themselves outside
  the session.
- **The `TomAnastasio/bvc-database-backups` repo is append-only.**
  No session should force-push, rewrite history, or delete anything there —
  including if asked to "prune old backups" or "clean it up." Flag the
  request back to the user instead of executing it; pruning, if ever
  wanted, should be a deliberate manual decision, not something routine.

## Git workflow: direct pushes to `main`

- As of 2026-10-20, the user explicitly chose to let Claude commit and push
  straight to `main` for all changes, including new files in
  `supabase/migrations/` — no pull request or review step required. This
  trades away the human-review checkpoint for speed, on the understanding
  that "rollback" is **not symmetric** between code and data:
  - **App code** is cleanly revertible — push an older commit, the site
    redeploys in a couple minutes via `deploy.yml`, nothing is lost.
  - **Database migrations are not cleanly revertible.** They auto-apply to
    production the moment they land on `main` (`apply-migrations.yml`). A
    bad one is fixed forward with a new migration, or — if it damaged data —
    recovered only from the previous night's backup, which costs up to 24
    hours of real games/profiles/Elo changes made since that backup. There
    is no "undo" for a migration once applied.
  The user made this choice fully aware of that asymmetry (see conversation
  around 2026-10-20) and would rather move fast than require a merge tap on
  their phone. All the destructive-SQL / additive-only / never-edit-a-
  migration rules above still apply in full — this only removes the PR
  step, not the database-safety rules.
- The SSH key used for pushing is held in the user's Bitwarden vault and
  reached through an agent relay — the container can *use* it but never sees
  it. Never try to export, print, copy, or work around that key, and never
  ask the user for it.
- Never add or change a workflow so that it exposes, prints, or sends
  anywhere the `production` environment secrets (`SUPABASE_DB_URL`,
  `BACKUP_REPO_TOKEN`). See "Where the secrets live" in `supabase/README.md`.
- If the user ever wants to go back to a branch + PR review workflow, that's
  a one-line change here, plus the user re-adding the GitHub branch-
  protection ruleset on `main`.

## E2E testing uses a separate staging Supabase project

As of 2026-10-20, `e2e/*.spec.js` run against a real backend — a staging
Supabase project (ref `cbgismbfbfvovxhvhtor`), never production — because
real e2e coverage needs real signed-in/directory-search behavior that an
unconfigured backend can't provide. Key things a future session won't see
locally (all live only in the gitignored `.env.local` of whichever container
set this up, so may be missing in a fresh one — see `TODO.md` if present for
full recovery steps):
- Two test-only email/password bot accounts (`E2E_ADMIN_EMAIL`/`PASSWORD`,
  `E2E_PLAYER_EMAIL`/`PASSWORD`) sign in via `e2e/signInAsTestUser.js`,
  bypassing real Google OAuth — see that file for how and why.
- The admin bot has `profiles.is_admin = true` on staging only, granted by
  hand once via the SQL Editor (no self-serve way to grant admin, and this
  must never be done with the service-role key).
- `e2e/seedStaging.js` seeds fixture player profiles via the admin bot's own
  normal API access — never the service-role key or DB password.
- As of 2026-10-22, staging's schema is kept in sync with
  `supabase/migrations/` automatically by
  `.github/workflows/apply-migrations-staging.yml` (its own `staging`
  GitHub environment and `STAGING_SUPABASE_DB_URL` secret, set up by the
  owner — see "Automatic migrations for staging" in `supabase/README.md`).
  If an e2e test fails on something a new migration adds, check that
  workflow's latest run before assuming the code is wrong.
All the database-safety rules above (no service-role key, no DB password,
additive-only migrations) apply identically to the staging project — it's
lower-stakes than production, not a place those rules get relaxed.

## Everything else

See `README.md` for app-level context and `TODO.md` for the live roadmap and
decision log.
