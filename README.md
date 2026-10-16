# WriteSpace

WriteSpace is a responsive, browser-local publishing demo built as a static React SPA. Guests can discover recent writing, register, or sign in; authors can create and manage their own plain-text posts; and administrators can review posts and manage local accounts.

> **Demo-only security notice:** WriteSpace stores account records, including passwords, as plain text in this browser's `localStorage`. Never use a real password or sensitive content. Client-side roles and route guards are workflow controls, not a secure authorization boundary.

## Architecture

- React 18 with JavaScript/JSX
- Vite 5 static build
- React Router DOM 6 client routing
- Tailwind CSS 3.4 utilities
- Browser `localStorage` only—no backend, database, API, or cross-device synchronization
- Vitest + Testing Library for unit/component tests
- Playwright for live browser journeys

Application code lives in `frontend/`. The only persisted keys are:

- `writespace_posts`
- `writespace_users`
- `writespace_session`

Collection reads validate every record. Malformed or unavailable data produces an explicit warning and blocks destructive replacement rather than being treated as a clean empty collection.

## Local development

```bash
cd frontend
npm ci
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173`.

The built-in demonstration administrator is:

- Username: `admin`
- Password: `admin`

Do not reuse those credentials anywhere else.

## Test

```bash
cd frontend
node node_modules/vitest/vitest.mjs run
node node_modules/@playwright/test/cli.js test --config playwright.config.js
```

If Chromium is not installed for Playwright:

```bash
node node_modules/@playwright/test/cli.js install chromium
```

## Production build

```bash
cd frontend
node node_modules/vite/bin/vite.js build
```

The static output is written to `frontend/dist/`. The root `vercel.json` supplies the required SPA fallback so direct client routes resolve to `index.html`.

## Product limits

WriteSpace is intentionally local and non-sensitive:

- Data is scoped to one browser origin/profile.
- Clearing browser data removes posts, users, and sessions permanently.
- There is no backup, export, synchronization, password recovery, or server-enforced authorization.
- Multiple tabs use last-write-wins local updates.
- The fixed Admin credential and local plaintext passwords are for demonstrations only.

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Everyone | Public discovery and recent posts |
| `/login` | Guests | Local account sign-in |
| `/register` | Guests | Local account registration |
| `/blogs` | Authenticated | Newest-first post list |
| `/blog/:id` | Authenticated | Plain-text post reader |
| `/write` | Authenticated | Create a post |
| `/edit/:id` | Owner or Admin | Edit a post |
| `/admin` | Admin | Local dashboard |
| `/users` | Admin | Local account management |

## Static hosting

Any host must rewrite unknown paths to `/index.html`. Deployment provisioning is intentionally outside this project; the checked-in Vercel rewrite preserves direct route compatibility.
