# Brevard Volleyball Club

## Beach Volleyball Scoreboard

A free, mobile-first web app for keeping score of volleyball games, tracking
player Elo rankings, and finding places to play. No install — just open it in a
phone browser. Live at
[brevardvolleyballclub.com](https://brevardvolleyballclub.com). Sign-in (Google)
and all game/profile data live in Supabase — see `supabase/README.md`.

Built with React, Vite, Tailwind CSS, and [HeroUI](https://www.heroui.com) as
the component/design library.

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
