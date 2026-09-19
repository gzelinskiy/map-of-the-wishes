# Instructions for AI Agents (AGENTS.md)

This repository is a monorepo for the **"Wish Sky"** (`nebo-pobazhan`) project: a private archive website for daily wishes ("good night" and "good morning"), powered by file-based storage without external databases, a React SPA client, and a Telegram bot serving as the admin interface.

---

## 1. Overall Architecture & Project Structure

```
.
├── apps/
│   ├── web/          # Vite + React SPA (mobile-first, wish constellation/path, sky animations)
│   └── server/       # Fastify HTTP API + grammY Telegram bot in a single process
├── packages/
│   └── shared/       # Shared types, validation, date parsing (Kyiv TZ), and markdown formatting
├── scripts/          # Helper utilities (import-oksana.ts, make-key.ts)
├── deploy/           # Dockerfile, docker-compose, Caddy config with auto-TLS, backup script
├── data/             # Local storage (NOT committed to git!):
│   ├── wishes/       # wishes/{night|morning}/YYYY-MM-DD.md
│   └── access/       # keys.json (SHA-256 hashes of magic keys only)
└── design/           # Reference design mockups
```

- **Package Manager**: `npm` workspaces.
- **Language**: TypeScript (pure ESM across the entire project, `"type": "module"`).
- **Script / Test Runner**: `node --test` via `tsx`.

---

## 2. Development, Verification & Testing Commands

Before making any commits, ensure that tests and builds pass cleanly:

```bash
# Install dependencies
npm install

# Run all tests (shared + server + web)
npm test

# Run tests per package
npm test -w @nebo/shared
npm test -w @nebo/server
npm test -w @nebo/web

# Full typecheck and build
npm run build

# Development
npm run dev:server    # Fastify API (:3000) + grammY (if bot env vars are provided)
npm run dev:web       # Vite Dev Server (:5173) proxying /api and /unlock to :3000
```

---

## 3. Key Modules & Implementation Rules

### `packages/shared`
- **Pure functions with no side effects**: types (`Wish`, `WishType`, `WishIndex`), validators (`isIsoDate`, `isWishType`).
- **Time handling**: always respect the `Europe/Kyiv` timezone.
- **Night-time cutoff rule (`effectiveNightDate`)**: from 00:00 to 04:59 Kyiv time, night wishes belong to the previous calendar day (`YYYY-MM-DD`).
- **Wish file format (`wishFile.ts`)**:
  - Wishes are stored in Markdown with YAML frontmatter:
    ```markdown
    ---
    date: 2026-08-01
    type: night
    updatedAt: 2026-09-19T21:30:00.000Z
    ---
    Wish content paragraph...
    ```
  - Paragraphs are separated by double newlines.

### `apps/server`
- **Security & Authorization (Magic Links / Cookies)**:
  - Website access is authenticated via `/unlock?k=<secret_key>`.
  - `data/access/keys.json` stores **only SHA-256 hashes**. The plaintext key is never persisted.
  - Hash comparisons must use `crypto.timingSafeEqual`.
  - Upon successful verification, a signed HttpOnly cookie (`nebo`) valid for 1 year is issued.
  - All `/api/*` routes require an active session (returning 401 on missing or revoked cookie).
  - `/unlock` is protected by rate limiting.
- **Atomic File Writes**:
  - `WishStore` and `KeyStore` write to a temporary file (`*.tmp`) and then perform an atomic `rename` to prevent corrupted files during crashes.
- **Telegram Bot (grammY)**:
  - Restricted **exclusively** to the user matching `ADMIN_TELEGRAM_ID`. All messages from other user IDs must be completely ignored.
  - When overwriting an existing wish, the bot must prompt for confirmation and show the existing text.
  - Bot states are kept in-memory (single concurrent admin session).

### `apps/web`
- **Stack**: React 18+, React Router, Lucide icons, HTML Canvas for starry skies (`skies.tsx`).
- **UI/UX Details**:
  - Mobile focus: support for `100dvh`, Safe Area insets (`env(safe-area-inset-*)`), and `viewport-fit=cover`.
  - Gestures: horizontal swipe navigation between dates is implemented using Pointer Events, without blocking vertical scroll or system edge-swipe "back" gestures.
  - Animations: respect `prefers-reduced-motion`; automatically pause canvas animations when tab is in background (`document.hidden`).
  - Unauthorized state: unauthenticated visits redirect to the locked screen (`Locked.tsx` — "Це небо — лише для тебе").

---

## 4. Guidelines for AI Agents Making Changes

1. **Do not break the Markdown frontmatter contract**: Any changes to `parseWish` or `serializeWish` must maintain backward compatibility with existing files.
2. **Privacy & Security**:
   - Never commit `data/` directory contents or `.env` files to git.
   - Do not log raw wish texts or plaintext magic-link secret keys.
   - Always return `X-Robots-Tag: noindex, nofollow, noarchive` to prevent search engine indexing.
3. **Strict Typing**: Avoid `any` except for standard `fs` error catching (`e: any` checking `code === 'ENOENT'`).
4. **Tests are Mandatory**: When modifying date logic, parsers, map layouts (`mapPath.ts`), or server endpoints, always update or add corresponding unit tests.
