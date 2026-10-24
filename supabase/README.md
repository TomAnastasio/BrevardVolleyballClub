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
   a separate private GitHub repo: `TomAnastasio/bvc-database-backups`.

Migrations tell you how the database is *shaped*. Backups tell you what was
*in it* on any given day. You need both to fully recover from a bad day.

## How migrations work

Each file in `supabase/migrations/` is named `<timestamp>_<description>.sql`
and applied in that order.

**Rule:** never edit or delete a file already in this folder. Once a
migration has run against the real database, it's history — fix mistakes
with a *new* migration file, the same way you'd never edit a bank statement
from last month, only add a new one.

### Automatic: every push to `main` applies new migrations

Two GitHub Actions run `supabase db push` whenever a new file in this folder
lands on `main`. The CLI tracks which migrations each database already has,
so only new ones run.

- **Production:** `.github/workflows/apply-migrations.yml`, using the
  `SUPABASE_DB_URL` secret (the same one the nightly backup uses).
- **Staging** (ref `cbgismbfbfvovxhvhtor`, the project the e2e tests use):
  `.github/workflows/apply-migrations-staging.yml`, using
  `STAGING_SUPABASE_DB_URL`. A failed staging run doesn't affect production
  or the live site; e2e tests may just run against an out-of-date schema
  until it's fixed.

**Accepted risk (decided 2026-10-03):** a bad migration can reach production
automatically and cause downtime. Recovery is a new, additive fix-up
migration and, if data was actually damaged, a restore from the nightly
backups (below). This doesn't loosen any of the hard rules in `CLAUDE.md`.

### What a failed run looks like, and what to do

`supabase db push` stops at the first migration that errors (e.g. "relation
already exists") — it does not run partial changes from that file, and it
does not touch any other data. A failed run means: the app keeps running on
whatever schema was already live (nothing was torn down), but the change
you just pushed isn't in effect. Check the failed job's log in the Actions
tab for the actual Postgres error, fix it with a *new* migration file (never
edit the one that failed), and push again.

### If the staging database password is ever reset

Only `STAGING_SUPABASE_DB_URL` needs updating: get the staging project's
connection string (see "Getting a connection string" below, in the
*staging* project's dashboard), then on github.com: this repo → Settings →
Environments → `staging` → update that secret. Actions tab → "Apply
database migrations (staging)" → **Run workflow** catches it up.

## How the nightly backup works

A GitHub Action (`.github/workflows/backup-database.yml`) runs every night,
connects to the live Supabase database, dumps everything, and commits it as
a new file (`backups/2026-10-03.sql.gz`, etc.) into the separate
`bvc-database-backups` repo. Each day's file is a permanent, separate commit
— nothing is ever overwritten, so there's one archived snapshot per day
going back as far as the repo exists.

It needs two secrets in this repo's `production` environment (Settings →
Environments → production): `SUPABASE_DB_URL` and `BACKUP_REPO_TOKEN`. If
the backup starts failing every night, one of these is usually the cause
(a reset database password, or an expired token). To replace them:

- **`SUPABASE_DB_URL`:** a fresh connection string (next section).
- **`BACKUP_REPO_TOKEN`:** GitHub avatar → Settings → Developer settings →
  Personal access tokens → Fine-grained tokens → New token → Repository
  access: **only** `bvc-database-backups` → Permissions: Contents = **Read
  and write**. Nothing beyond that.

Then Actions tab → "Nightly database backup" → **Run workflow**, and check
that a `backups/<today>.sql.gz` file appears in the backups repo.

### Getting a connection string

(Supabase reshuffles its dashboard now and then; this matches 2026-10. The
goal is always an IPv4 pooler connection string on port 5432.)

1. Open the project at [supabase.com/dashboard](https://supabase.com/dashboard)
   and click the green **Connect** button.
2. Click the **Direct** tile. The box labeled **"Shared pooler"** (port
   5432, with an "Only use session pooler on an IPv4 network" banner) is
   the one you want. Copy its string; it looks like
   `postgresql://postgres.xxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
3. Replace `[YOUR-PASSWORD]` with the database password. If you have it
   saved, reuse it, unless it contains `@ : / ? # % &` or a space (those
   break the string). Otherwise click **Reset database password** in that
   box, use the auto-generate option (plain letters/numbers, safe as-is),
   and **save it immediately** — Supabase shows it only once. Resetting it
   only affects this direct connection, not the app's sign-in.

Never paste the password or the finished string into a Claude session or
any file; it goes only into the GitHub secret.

### Why the backups are hard for anything (AI included) to wipe out

- Deleting the Supabase project doesn't touch GitHub at all — the backups
  live somewhere entirely independent.
- `BACKUP_REPO_TOKEN` can only write to that one repo: it can't delete it,
  change its settings, or touch this app's repo. It *can* force-push (which
  could erase the repo's history), and GitHub's protection against that
  needs a paid plan on private repos (declined 2026-10-03). Two things
  cover that gap:
  - **An add-only copy on the owner's PC.** A daily scheduled task on the
    owner's Windows PC downloads each new backup (with a separate,
    read-only key) into a local folder and never deletes or overwrites a
    saved file. It raises a Desktop alert if the GitHub history is ever
    rewritten, an old backup changes, or no new backup appears for 3 days.
    Nothing that can push to GitHub can reach that folder.
  - **The token is hard to get** — see the next section.
- No AI coding session should ever be given admin rights on the backups
  repo, or hold your Supabase database password or service-role key. See
  the ground rules in `CLAUDE.md`.

### Where the secrets live (and why not as plain repo secrets)

`SUPABASE_DB_URL` and `BACKUP_REPO_TOKEN` are secrets of a GitHub
**environment** called `production`; `STAGING_SUPABASE_DB_URL` is in a
separate one called `staging`. Both are restricted to the `main` branch, so
each workflow can only read its own project's secret.

Why: anyone who can push *any* branch could add a workflow that reads
ordinary repository secrets. Environment secrets are only handed to jobs
that name that environment **and** run from `main`.

Since Claude sessions push straight to `main` (owner's choice, 2026-10-20;
see `CLAUDE.md`), what stands between a session and these secrets is the
`CLAUDE.md` rule that no workflow may ever expose, print, or send them
anywhere, not a human review. Re-adding the pull-request ruleset on `main`
restores the stronger guarantee. A new workflow that genuinely needs one of
these secrets must declare the matching environment and only run on `main`.

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

## Tokens and items

How tokens, the Cauldron and the Locker work for players is in the main
`README.md` ("Tokens, the Cauldron and the Locker"). For the database:

- **These tables hold real player data** like games do: token balances
  (`token_balances`), what each player owns (`player_items`), every pull
  (`pulls`), outfits (`player_outfits`) and gifts (`token_gifts`). They're
  in the nightly backup. Restoring a backup also rolls these back, so
  pulls and outfit changes made after it would be lost, the same as games.
- **Nobody can change them directly**, not even from the app: only the
  database functions (`brew()`, `equip_item()`, `set_look()`, …) can, and
  each one checks who's asking.
- **Giving everyone tokens again** is a new migration modeled on
  `20261024235000_gift_10_tokens.sql` with a *new gift name* (that name is
  what stops anyone getting the same gift twice). It's the owner's call
  each time.
- **Before any new migration**, run the database scenario tests: `npm run
  test:db`. They build a throwaway copy of the database from every file in
  `supabase/migrations/` (in-memory PGlite, no real data) and check tokens,
  outfits, the gift and who can call which function (`supabase/tests/`).
  A migration reaches staging and production at the same moment, so this
  is the only place to try one first. Add a scenario for anything new.
