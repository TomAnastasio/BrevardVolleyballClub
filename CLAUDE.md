# Ground rules for working in this repo

## Database safety (read before touching anything Supabase-related)

The user is not a developer and the Supabase database holds real,
irreplaceable club data (game history, player profiles, Elo ratings). See
`supabase/README.md` for how migrations, backups and restores work. Hard
rules, applying identically to production and the staging project (staging
is lower-stakes, not a place these get relaxed):

- **Never run destructive SQL directly against the database** from a
  session (`DROP`, `TRUNCATE`, bare `DELETE`, dropping/altering a column
  that loses data, etc.), even if asked to "clean up" or "fix" data. Schema
  changes are new, additive files in `supabase/migrations/` (naming
  convention there), never typed/executed ad hoc against a live project.
- **Never edit or delete an existing file in `supabase/migrations/`.** Once
  committed, a migration is permanent history. Fix mistakes with a new one.
- **Committing a migration to `main` auto-applies it** to production
  (`apply-migrations.yml`) and staging (`apply-migrations-staging.yml`). The
  user accepted the risk of app downtime from a bad migration (2026-10-03),
  recoverable by a follow-up migration or, for data loss, the nightly
  backup. That acceptance doesn't extend to anything destructive or ad hoc.
- **Never request, type, paste, or store the Supabase service-role key or
  database password** in this repo, in chat, or in any file. The only
  Supabase credential in client code is the anon/publishable key (in
  `.env.local` / GitHub Actions secrets), which is meant to be public. If a
  task seems to need the service-role key or DB password, stop and ask the
  user to do that step themselves outside the session.
- **The `TomAnastasio/bvc-database-backups` repo is append-only.** Never
  force-push, rewrite history, or delete anything there, including if asked
  to "prune old backups" or "clean it up." Flag the request back to the
  user instead; pruning, if ever wanted, is their deliberate manual call.

## Git workflow: direct pushes to `main`

- The user chose (2026-10-20) to let Claude commit and push straight to
  `main` for everything, migrations included, with no PR or review step,
  knowing that undo isn't symmetric:
  - **App code** is cleanly revertible: push an older commit and the site
    redeploys in a couple of minutes (`deploy.yml`).
  - **A migration can't be undone** once applied. It's fixed forward with a
    new migration, or, if it damaged data, restored from the previous
    night's backup, losing up to 24 hours of real games/profiles/Elo.
- The SSH key used for pushing is held in the user's Bitwarden vault and
  reached through an agent relay: the container can *use* it but never sees
  it. Never try to export, print, copy, or work around that key, and never
  ask the user for it.
- Never add or change a workflow so that it exposes, prints, or sends
  anywhere the environment secrets (`SUPABASE_DB_URL`, `BACKUP_REPO_TOKEN`,
  `STAGING_SUPABASE_DB_URL`). See "Where the secrets live" in
  `supabase/README.md`.
- Going back to branch + PR review is a one-line change here, plus the user
  re-adding the branch-protection ruleset on `main`.

## E2E testing uses a separate staging Supabase project

`e2e/*.spec.js` run against a staging Supabase project (ref
`cbgismbfbfvovxhvhtor`), never production. What a session needs to know:
- Two test-only bot accounts sign in by email/password via
  `e2e/signInAsTestUser.js`, bypassing Google OAuth. Their logins and the
  staging URL/key live only in the gitignored `.env.local`; if it's missing,
  `TODO.md` has the recovery steps.
- The admin bot is `is_admin` on staging only, granted by hand once in the
  SQL Editor (never with the service-role key).
- Seed scripts (`e2e/seedStaging*.js`) use the admin bot's normal API
  access, never the service-role key or DB password.
- Staging holds **permanent demo players, ranked games and tournaments**
  (README "Testing"). Never delete them when cleaning up after a test.
  `e2e/profileEloChange.spec.js` depends on the ranked games: if it finds
  no Elo pills, re-run `node e2e/seedStagingGames.js` (safe to re-run)
  before suspecting the code.
- If an e2e test fails on something a new migration adds, check the
  staging migrations workflow's latest run before assuming the code is
  wrong.

## Seasonal themes stay additive

Temporary skins (README "Seasonal themes") must never change the classic
look:
- Put theme work in `src/themes/<name>/`, with CSS scoped under
  `html.theme-<name>`. Never edit classic styles or assets
  (`src/index.css`, `src/assets/badges/`) for a theme.
- Before pushing theme work, screenshot key screens with `?theme=classic`
  and compare them pixel for pixel with an untouched copy of `main`
  (`git archive HEAD` served on a second port). Animated art can differ
  frame to frame, so mask it out. Show the owner before/after screenshots
  of the themed look first.
- Tag the commit before a new theme lands (e.g. `classic-theme-2026`).

## Keeping the docs useful

- `README.md`: how the app works *now*. Update it in the same push as any
  user-visible change.
- `TODO.md`: what's open, unconfirmed or next, plus owner decisions to keep
  honoring. When something ships or is confirmed, shrink it to a one-line
  decision or delete it.
- `supabase/README.md`: database operations and emergencies, for the owner.
- Put each fact in one place and point to it from the others. Don't copy
  counts or details that drift (e.g. how many demo games exist). History
  belongs in `git log`, not in "this used to…" notes.
