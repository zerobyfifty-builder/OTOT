# Railway Deployment & Production-Readiness Plan

This document describes how to deploy the OTOT frontend on Railway and the
production-readiness work that should accompany the migration.

## Architecture decision

OTOT is a **pure client-side SPA** (Vite + React + TypeScript). Its entire
backend is **Supabase** (managed Postgres + Auth + Deno Edge Functions +
Storage). The browser talks to Supabase directly — there is no Node server,
no SSR, and no API layer of our own.

**Consequence:** Railway would host only the **built static frontend**
(`dist/`), pointed at the existing (or a new) Supabase project.

### Option A — Frontend on Railway, Supabase stays managed (recommended)

Railway serves `dist/` with SPA fallback; the browser continues talking to
Supabase directly. ~1–2 day migration; changes nothing about the backend.
**Edge Functions do NOT move to Railway** — they remain Deno functions
deployed to Supabase via `supabase functions deploy`.

### Option B — Self-host all of Supabase on Railway

Run Postgres + GoTrue + PostgREST + Realtime + Storage + the Edge runtime as
separate Railway services. Full control and one bill, but a multi-week project
(we own DB backups, auth-service upgrades, the Deno edge runtime). Pursue only
if leaving Supabase-managed is a hard requirement.

**The rest of this plan assumes Option A.**

---

## Step-by-step (Option A)

### Step 1 — Parametrize configuration (prerequisite, do first)

The Supabase URL and anon key are currently hardcoded as string literals in
`src/integrations/supabase/client.ts:5-6` and duplicated in `Profile.tsx`,
`OwnerSettings.tsx`, `PlantTree.tsx`, and `Users.tsx` (18 hardcoded references
total). Replace them with env reads:

```ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

Add a fail-fast guard if either is undefined, and commit a `.env.example`.
Vite inlines `VITE_`-prefixed vars **at build time**, so these must be present
in Railway's build environment (Step 3), not just at runtime. The four
hardcoded `functions/v1/...` fetch URLs should also become
`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/...`.

### Step 2 — Add a production server + SPA fallback

Railway needs something to serve `dist/` and rewrite unknown paths to
`index.html` (required because the app uses `BrowserRouter` — deep links like
`/owner/dashboard` otherwise 404). Cleanest is a small Dockerfile with Caddy
(gzip/brotli + cache headers + SPA fallback for free):

```dockerfile
# Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
```

```caddyfile
# Caddyfile
:{$PORT}
root * /srv
encode gzip zstd
@static path *.js *.css *.png *.jpg *.svg *.woff2
header @static Cache-Control "public, max-age=31536000, immutable"
try_files {path} /index.html   # SPA fallback
file_server
```

(Railway injects `$PORT`; Caddy's `try_files … /index.html` provides the SPA
fallback.)

### Step 3 — Create the Railway service

New project → deploy from the GitHub repo → Railway detects the Dockerfile.
Set **build-time** variables (Railway passes service variables as Docker build
args when referenced): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_SUPABASE_PROJECT_ID`. Point them at a **staging** Supabase project first
if you want environment separation.

### Step 4 — Update Supabase Auth redirect URLs

In the Supabase dashboard, add the Railway domain (e.g.
`https://otot-production.up.railway.app` and any custom domain) to
**Auth → URL Configuration → Redirect URLs** and Site URL. The code already
uses `window.location.origin` for redirects (`AuthContext.tsx:60,93`), so no
code change — but Supabase must allowlist the new origin or
magic-link/password-reset/verify flows break.

### Step 5 — CORS on Edge Functions

Confirm each function's CORS `Access-Control-Allow-Origin` permits the Railway
domain (many templates hardcode `*` or a specific origin). Re-point the
hardcoded `functions/v1/...` fetch URLs via env (see Step 1).

### Step 6 — Custom domain + deploy

Add the domain in Railway (it provisions TLS), update Supabase redirect URLs
again for the real domain, and enable auto-deploy on the `main` branch.

---

## Production-readiness bottlenecks (address alongside the migration)

Ordered by severity. Security items are genuine blockers, not nitpicks.

### 🔴 Critical — security

1. **Lodge passwords are plaintext and readable by every client.**
   `LodgeAuthContext.tsx:87` does `if (lodgeData.password_hash !== password)` —
   the browser fetches the `password_hash` column with the anon key and
   compares in JavaScript. Passwords aren't hashed, and anyone with the public
   anon key can `SELECT password_hash` from `lodges` and dump every credential.
   Move the comparison server-side (an Edge Function checking a real
   bcrypt/argon2 hash) and add an RLS policy forbidding client reads of the
   hash column. **Blocker before any production traffic.**
2. **Custom session tokens live in `localStorage`** (`lodge_session_token`,
   `lodge_id`, plus agent auth) — readable by any XSS.
3. **13 of 14 Edge Functions run with the service-role key and
   `verify_jwt = false`.** Some are legitimately pre-auth (magic link, signup),
   but each is effectively a privileged endpoint whose only protection is its
   internal authz. Audit every `verify_jwt = false` function to confirm it
   validates the caller before service-role writes.
4. **Hardcoded Supabase URL/anon key** (see Step 1) — blocks staging/prod
   separation. (`.env` is correctly gitignored and not tracked.)

### 🟠 High — performance

5. **Zero code splitting.** `App.tsx` statically imports all ~90 route
   components, so `mapbox-gl`, `@react-pdf/renderer`, all of TipTap, `jspdf`,
   `html2canvas`, and `recharts` land in one monolithic JS chunk on first
   paint. Fix: `React.lazy()` per route + a Vite `manualChunks` split for the
   heavy libs. Biggest UX/cost win and lowers Railway egress.

### 🟡 Medium — operational readiness

6. **SPA-fallback** for deep links — handled by Step 2's Caddy config.
7. **No CI, no tests, no error monitoring.** Add Sentry, a GitHub Actions
   workflow running `npm run build` + `npm run lint` on PRs. Note eslint has
   `@typescript-eslint/no-unused-vars: off` and TS is non-strict — the compiler
   catches very little.
8. **No `.env.example`**, no environment separation (dev/staging/prod all point
   at project `iezhssfzbiwnofhpjahv`).
9. **145 migrations, unaudited RLS.** Before production, confirm RLS is enabled
   and correct on every table the anon key can reach.

---

## Recommended sequencing

1. **Before public traffic:** Fix the lodge plaintext-password/RLS hole (#1)
   and audit `verify_jwt = false` functions (#3). The true blockers.
2. **With the migration:** Steps 1–6 above (config parametrization is shared
   work with security item #4).
3. **Fast follow:** Route-level `React.lazy` + Vite `manualChunks` (#5).
4. **Hardening:** Sentry, GitHub Actions (`build` + `lint` on PRs),
   `.env.example`, staging/prod Supabase separation.
