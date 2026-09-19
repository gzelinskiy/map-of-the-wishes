# Wish Sky (Небо побажань)

A private archive website for daily "good morning" and "good night" wishes. React frontend, Fastify backend with file-based storage (no external database), and a Telegram bot as the admin interface.

```
apps/web        Vite + React SPA (mobile-first)
apps/server     Fastify API + grammY bot in a single process
packages/shared types, dates, file format
scripts/        import-oksana.ts, make-key.ts
deploy/         Docker, Caddy, backup script
design/         reference design mockups (visual comparison)
data/           ← wishes and access keys (excluded from git!)
```

## Quickstart (Development)

```bash
npm install
cp .env.example .env            # COOKIE_SECRET ≥ 16 characters; PUBLIC_URL=http://localhost:5173
npm run import -- ~/Oksana      # one-off: 149 files → data/wishes/
node --env-file=.env node_modules/.bin/tsx scripts/make-key.ts "dev"   # prints /unlock?k=… link
npm run dev:server              # :3000 (bot only starts if BOT_TOKEN + ADMIN_TELEGRAM_ID are set)
npm run dev:web                 # :5173, proxies /api and /unlock to :3000
```
Open the printed link — you will receive a session cookie and see the site. Run `npm test` for all tests; `npm run build` for type checking + production build.

## How Passwordless Access Works

1. You run `/link Ksusha` in the bot → receive `https://domain/unlock?k=<long secret>`.
2. She opens the link once → the server verifies the secret and sets a signed `HttpOnly` cookie for 1 year.
3. Subsequent visits open the site directly without requiring any login credentials. Without the cookie, `/api/*` responds with 401, and the website shows "This sky is just for you" ("Це небо — лише для тебе").
4. Lost phone / cleared cookies → run `/link` again. Revoke an old key: `/revoke <id>` (takes effect immediately).

`data/access/keys.json` stores **only SHA-256 hashes**. The website is hidden from search engines (`X-Robots-Tag`, `robots.txt`, `<meta robots>`).

## Telegram Bot (Only `ADMIN_TELEGRAM_ID`; silent to everyone else)

Send any wish text to the bot → action buttons: **🌙 Night / ☀️ Morning / 📅 Another date**. Overwriting an existing date always requires confirmation and displays the previous text.

| Command | Action |
|---|---|
| `/gn [date]`, `/gm [date]` | the next sent text will be saved as good night / good morning for this date |
| `/get gn 2026-09-19` | show wish; buttons: "Edit" / "Delete" |
| `/del gn 2026-09-19` | delete (with confirmation) |
| `/gaps`, `/stats` | missing dates; counts & statistics |
| `/link [label]`, `/links`, `/revoke id` | manage access keys |

Supported date formats: `2026-09-19`, `19.09`, `19.09.2026`, `сьогодні` (today), `вчора` (yesterday). For night wishes before 05:00, "today" resolves to the previous calendar day (Kyiv timezone).

## Deployment (Single VPS)

```bash
cp .env.example .env            # BOT_TOKEN, ADMIN_TELEGRAM_ID, COOKIE_SECRET, PUBLIC_URL=https://your.domain
mkdir -p data && chown 1000:1000 data
# copy your data/ (or run the import script), point DNS of your domain → VPS
SITE_ADDRESS=your.domain docker compose -f deploy/docker-compose.yml up -d --build
```
Caddy automatically provisions TLS certificates. Local stack verification without a custom domain:
`HOST_UID=$(id -u) HOST_GID=$(id -g) docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.local.yml up -d --build` → http://localhost:8080.

**Backups:** `deploy/backup.sh` (cron `15 4 * * *`) archives to `backups/nebo-YYYY-MM-DD.tar.gz` and keeps the last 30 daily archives. `data/` is deliberately omitted from git as it contains personal messages; you may store it in a separate private repository if needed.

## Data Format

`data/wishes/{night|morning}/YYYY-MM-DD.md`:
```markdown
---
date: 2026-08-01
type: night
updatedAt: 2026-09-19T21:30:00.000Z
---
First paragraph...

Second paragraph...
```
Paragraphs are separated by empty lines. Exact send time is neither stored nor displayed.

## Mobile Reliability Features

`viewport-fit=cover` + safe-area insets; `100dvh` with fallback; background rendered as a dedicated `position: fixed` layer; horizontal swipe built on Pointer Events (leaves vertical scroll untouched, preserves screen edges for system "swipe-to-go-back" gestures); self-hosted fonts (Latin + Cyrillic); reduced animated particles on low-power devices; canvas animations paused when the tab is in the background (`document.hidden`); `prefers-reduced-motion` compliance; View Transitions with feature detection.
