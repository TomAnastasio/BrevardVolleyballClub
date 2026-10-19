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

## Git workflow: branches and pull requests, never `main` directly

- **`main` is protected** (GitHub ruleset): every change must arrive as a
  pull request that the user merges; force-pushes and deleting `main` are
  blocked. Pushing to `main` will be rejected — don't try to work around it.
- Do work on a branch named `claude/<short-topic>`, commit, and push that
  branch. Then give the user the link to open the pull request, so they can
  review and merge from their phone:
  `https://github.com/TomAnastasio/BrevardVolleyballClub/compare/main...claude/<short-topic>?expand=1`
  (The container has no GitHub API token, so it can't open the PR itself.)
- The SSH key used for pushing is held in the user's Bitwarden vault and
  reached through an agent relay — the container can *use* it but never sees
  it. Never try to export, print, copy, or work around that key, and never
  ask the user for it.
- Never add or change a workflow so that it exposes, prints, or sends
  anywhere the `production` environment secrets (`SUPABASE_DB_URL`,
  `BACKUP_REPO_TOKEN`). See "Where the secrets live" in `supabase/README.md`.

## Everything else

See `README.md` for app-level context and `TODO.md` for the live roadmap and
decision log.
