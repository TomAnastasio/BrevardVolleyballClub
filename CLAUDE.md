# Ground rules for working in this repo

## Database safety (read before touching anything Supabase-related)

The user is not a developer and the Supabase database holds real,
irreplaceable club data (game history, player profiles, Elo ratings). See
`supabase/README.md` for the full migration/backup/restore story. Hard rules:

- **Never run destructive SQL directly against the production database**
  from a session (`DROP`, `TRUNCATE`, bare `DELETE`, dropping/altering a
  column that loses data, etc.), even if asked to "clean up" or "fix" data.
  Schema changes are new, additive files in `supabase/migrations/` (see
  naming convention there) for the user to review and apply themselves —
  never executed ad hoc against the live project.
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
- **The `BrevardVolleyballClub/bvc-database-backups` repo is append-only.**
  No session should force-push, rewrite history, or delete anything there —
  including if asked to "prune old backups" or "clean it up." Flag the
  request back to the user instead of executing it; pruning, if ever
  wanted, should be a deliberate manual decision, not something routine.

## Everything else

See `README.md` for app-level context and `TODO.md` for the live roadmap and
decision log.
