# Database: migrations & backups

Plain-language guide to how this project's database is changed, backed up,
and restored. Written for the club's owner (not a developer) to be able to
follow in an emergency without needing to ask anyone else first.

## The two safety nets

1. **Migrations** (`supabase/migrations/*.sql`) — an ordered, permanent
   record of every schema change ever made (new tables, new columns, new
   security rules), oldest first. This is the database's "source code."
2. **Nightly backups** — a full copy of the *actual data* (every game, every
   profile, every Elo rating), taken automatically every night and stored in
   a separate private GitHub repo: `BrevardVolleyballClub/bvc-database-backups`.

Migrations tell you how the database is *shaped*. Backups tell you what was
*in it* on any given day. You need both to fully recover from a bad day.

## How migrations work now

Each file in `supabase/migrations/` is named `<timestamp>_<description>.sql`
and applied in that order. They were historically pasted by hand into the
Supabase SQL Editor one at a time — that still works, but this folder is now
also in the format the official Supabase CLI expects, which unlocks two
things going forward:

- `npx supabase link --project-ref <your-project-ref>` (one-time, requires
  logging into your own Supabase account) connects this folder to the real
  project.
- After that, `npx supabase db push` applies any migration files that
  haven't been run yet, and the CLI keeps track of exactly which ones have
  — no more guessing or re-reading old files to figure out "did I already
  run this one?"

Linking is optional — nothing here breaks if it's never done. Backups
(below) do not depend on it.

**Rule going forward:** never edit or delete a file already in this folder.
Once a migration has been pasted into the real database, it's history —
fix mistakes with a *new* migration file, the same way you'd never edit a
bank statement from last month, only add a new one.

## How the nightly backup works

A GitHub Action (`.github/workflows/backup-database.yml`) runs every night,
connects to the live Supabase database, dumps everything, and commits it as
a new file (`backups/2026-10-03.sql.gz`, etc.) into the separate
`bvc-database-backups` repo. Each day's file is a permanent, separate commit
— nothing is ever overwritten, so you end up with one archived snapshot per
day going back as far as the repo exists.

### One-time setup (you need to do this — I can't do it for you)

1. **Create the backups repo.** On github.com: New repository →
   `bvc-database-backups` → **Private** → Create. No README needed.
2. **Get the database connection string.** (Dashboard screens get renamed
   / reshuffled by Supabase periodically — this matches the layout as of
   2026-10; if yours looks different, the goal is always the same: an IPv4
   pooler connection string on port 5432.)
   - Go to [supabase.com/dashboard](https://supabase.com/dashboard) and open
     the project.
   - Click the green **Connect** button near the top of the project's
     dashboard page.
   - In the dialog, click the **Direct** tile (subtitle "Connection
     string"). It jumps straight to a box labeled **"Shared pooler"** with
     a banner above it reading "Only use session pooler on an IPv4
     network" — that confirms this box *is* the session/IPv4 pooler
     connection (Supabase's newer UI doesn't separately spell out "Session
     pooler" as its own tile the way older docs describe; "Shared pooler"
     on port 5432 is it).
   - **Already have the database password saved** (e.g. in a password
     manager, from when the project was first created)? You don't need to
     reset it — reusing it is fine and is actually less churn than
     generating a new one. Skip straight to the next bullet, using that
     saved password in place of "the generated password." The one caveat:
     check it for any of these characters first — `@  :  /  ?  #  %  &` or
     a space. Those are URL-reserved and will break the connection string
     unless percent-encoded (ask for help encoding a specific character if
     needed — no need to paste the actual password into chat). If it's
     plain letters/numbers (or just `-`/`_`/`.`), it's safe to use as-is. If
     it does contain one of those and encoding feels like a hassle, it's
     easier to just reset to a fresh auto-generated one instead (see next
     bullet).
   - **Don't have it saved / it's not URL-safe?** Click **Reset database
     password** (top-right of the "Shared pooler" box). Use the dashboard's
     auto-generate option, not a typed-in password — generated ones are
     plain letters/numbers, so they drop straight into the connection
     string with no escaping needed. **Copy the generated password
     immediately and save it** (e.g. in your password manager) — Supabase
     shows it to you exactly once. Either way, this password is separate
     from your Supabase account login and from your app's
     `VITE_SUPABASE_ANON_KEY` — resetting it doesn't affect your app's
     sign-in or anything currently live, only this one direct database
     connection.
   - Copy the connection string shown in the "Shared pooler" box (there's a
     copy icon on the right of it — widen your browser window if it's cut
     off). It looks like:
     `postgresql://postgres.xxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
   - Replace the placeholder portion with your real password (saved one or
     freshly reset one). (If the copy icon is hard to find, the box below
     it, "Connection parameters," lists the same host/port/database/user
     individually with their own copy icons — you can assemble the string
     by hand from those plus the password instead.)
   - The finished string (real password included) is what goes into the
     `SUPABASE_DB_URL` secret in step 3 below.
3. **Add two secrets to *this* repo** (the app repo, not the backups repo):
   Settings → Secrets and variables → Actions → New repository secret.
   - `SUPABASE_DB_URL` — the connection string from step 2.
   - `BACKUP_REPO_TOKEN` — a GitHub token that can push to the backups repo
     *and nothing else*: GitHub avatar → Settings → Developer settings →
     Personal access tokens → Fine-grained tokens → New token → Repository
     access: **only** `bvc-database-backups` → Permissions: Contents =
     **Read and write**. Don't grant it anything beyond that — it should
     not be able to delete the repo, change its settings, or touch any
     other repo.
4. **Trigger the workflow once by hand first**, before trying to lock the
   repo down: this repo's GitHub Actions tab → "Nightly database backup" →
   Run workflow. Wait a minute, then check the backups repo — it should now
   have a `backups/<today>.sql.gz` file and a `main` branch. Do this before
   step 5: a brand-new repo has zero commits and no branch yet, so there's
   nothing yet for a branch-protection rule to attach to.
5. **Lock the backups repo down** (strongly recommended, now that `main`
   exists): in the backups repo, Settings → look for **Branches** in the
   left sidebar. If that's not there, look for **Rules → Rulesets** instead
   — GitHub has been migrating this feature and different accounts may show
   either one. Either way, add a rule targeting `main` with branch deletion
   and force-pushes restricted/blocked. This means even your own account
   can't erase backup history by accident — doing so would require
   deliberately removing this rule first, as a separate, visible step.

Until steps 2–3 are done, the workflow will fail every night with a clear
error message (not silently) — that's expected, not a bug, until setup is
finished.

### Why a separate repo, and why this is hard for anything (AI included) to wipe out

- Deleting the Supabase project doesn't touch GitHub at all — the backups
  live somewhere entirely independent.
- The token used to push backups can only write files to that one repo —
  it has no power to delete the repo, rewrite its history, or touch this
  app's repo.
- Branch protection (step 4) means nobody — not a careless command, not a
  compromised token, not an AI coding assistant told to "clean up old
  backups" — can force-push or delete history on that branch without first
  manually turning the protection off in GitHub's UI.
- No AI coding session (this one or a future one) should ever be given admin
  rights on the backups repo, and should never hold your Supabase database
  password or service-role key. See the ground rules in `CLAUDE.md` at the
  repo root.

## How to restore from a backup

Only do this if you've actually lost data and need it back. Restoring
overwrites whatever is currently in the target database with that day's
snapshot — anything saved *after* that backup was taken will be lost from
the target you restore into.

**Recommended path — restore into a brand-new Supabase project first, not
the live one**, so you can look at the recovered data before deciding
anything:

1. Create a new (free) Supabase project in the dashboard.
2. Download the day's backup file you want from the `bvc-database-backups`
   repo (`backups/<date>.sql.gz`) and unzip it.
3. Get that new project's **Session pooler** connection string (Settings →
   Database → Connect), same as the setup steps above.
4. From a machine with `psql` installed (ask a developer/Claude Code session
   to help run this command if you're not comfortable in a terminal):
   ```
   psql "<new project's connection string>" < backups/2026-10-03.sql
   ```
5. Open that new project's Table Editor and confirm the data looks right.
6. Only once you're confident: either (a) point this app's
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (in GitHub's Actions
   secrets and your local `.env.local`) at the new project and treat it as
   the new production, or (b) if you instead need to restore the *existing*
   project back in place, run the same `psql` command against its
   connection string instead — understanding that this overwrites its
   current contents.

If this is happening for real, it's worth getting a second pair of eyes
(a developer, or a fresh Claude Code session) before running step 6 against
a live project — restoring is meant to guarantee you're never stuck with
zero options, not to be a casual undo button.
