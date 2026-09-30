# Brevard Volleyball Club

## Beach Volleyball Scoreboard

A free, mobile-first web app for keeping score of a beach volleyball game to 21.
No install, no backend — just open it in a phone browser. Live at
[brevardvolleyballclub.com](https://brevardvolleyballclub.com).

Built with React, Vite, Tailwind CSS, and [HeroUI](https://www.heroui.com) as
the component/design library.

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

Git is already configured inside the container with its own SSH key, so
Claude can commit and push to GitHub when you ask it to.
