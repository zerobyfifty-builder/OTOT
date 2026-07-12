# Railway Deployment & Production-Readiness Plan

This document describes how to deploy the OTOT frontend on Railway and the
production-readiness work that should accompany the migration.

---

## Current progress (as of 2026-07-12)

Phase 1 (security remediation + deployability) is **substantially complete and
verified live on production** (`iezhssfzbiwnofhpjahv` + Railway). Legend:
✅ done · ⚠️ partial · ⛔ not started.

### Deployment steps (Option A)
| Step | Status | Notes / evidence |
|---|---|---|
| 1 — Parametrize config | ✅ | All backend config reads `VITE_*`. Fixed the leftover hardcoded `https://mvp.the1campaign.com` + anon-key in `MagicLink.tsx`, `utils/magicLinkAuth.ts` (magic-link / deeplink / set-password), and `lodge/PlantTree.tsx`. `.env.example` committed. **Separate open item:** two *public share-URL* references still point at `mvp.the1campaign.com` (`PdfPreviewDialog.tsx:48`, `Dashboard.tsx:485`) — not a backend call; decide the canonical public domain (see Pending user actions #4). |
| 2 — Prod server + SPA fallback | ✅ | `Dockerfile` (Node build → Caddy) + `Caddyfile` committed. Verified live: `/` → 200, deep link `/owner/dashboard` → 200 (fallback works). |
| 3 — Railway service | ⚠️ | Service is live at `https://otot-web-production.up.railway.app` (built with prod `VITE_*`). **Auto-deploy from GitHub not yet connected** — deploys are currently manual. |
| 4 — Supabase Auth redirect URLs | ⛔ | Railway domain not yet in Auth → URL Configuration (Site URL + Redirect URLs). Password-reset / email-verify / magic-link redirects to the Railway origin will fail until added. **User dashboard action.** |
| 5 — CORS on Edge Functions | ⚠️ | Functions send `Access-Control-Allow-Origin: *` via `_shared/authz.ts`. Works; tightening to an allowlist is deferred hardening. |
| 6 — Custom domain + auto-deploy on `main` | ⛔ | No custom domain; auto-deploy not wired; live build is off `develop`, not `main`. |

### Security bottlenecks
| Item | Status | Notes |
|---|---|---|
| #1 Lodge plaintext passwords / RLS hole | ✅ | Moved server-side (bcrypt via `lodge-login`), `lodges.password_hash` column dropped, `lodge_sessions` anon policies removed. **Verified live:** `password_hash` column gone (`42703`). Migration `20260711120000_harden_lodge_auth.sql`. |
| #3 `verify_jwt=false` privileged fns | ✅ | `create-owner/partner/agent-user` + `org-invite-user` now gated (`authenticate()` + role check; `verify_jwt=true`). Backdoors `reset-ktb-password` + `create-lodge-user` **deleted**. **Verified live:** privileged fns → 401 without JWT; backdoors → 404. |
| #4 Hardcoded URL/anon key | ✅ | Done (except `MagicLink.tsx`, see Step 1). |
| #2 Session tokens in `localStorage` | ⛔ | Lodge/agent tokens still in `localStorage`. Accepted risk for launch; revisit. |

### Performance / operational
| Item | Status | Notes |
|---|---|---|
| #5 Code splitting | ⛔ | 0 `React.lazy`, no `manualChunks` — still one monolithic chunk. Biggest fast-follow. |
| #6 SPA fallback | ✅ | Caddy (Step 2). |
| #7 CI / tests / Sentry | ⛔ | No `.github/workflows`, no Sentry. Local suites exist: `supabase/security-check.mjs`, `portal-smoke.mjs`. |
| #8 `.env.example` / env separation | ⚠️ | `.env.example` ✅; still a single Supabase project = prod (no staging). |
| #9 Full RLS audit (145 migrations) | ⚠️ | Lodge tables locked down; full cross-table audit not done. |

### Also true right now
- **Local prod-simulation stack** is running (Colima + `supabase start`, preview on `:4173`); seeded via `supabase/seed-local.mjs`. Suites pass: 16 security + 18 portal + 8 live-prod checks.
- `develop` (`45d764ca`) holds all Phase-1 work and is pushed to `origin/develop`; **`main` is behind** (does not contain the security hardening).
- **Two pre-existing route-guard bugs** (not caused by this work): (a) `/lodge/dashboard` is guarded by `BusinessPartnerRoute` which checks Supabase Auth, not the lodge custom session → lodge users bounce to `/auth/login`; (b) `/admin/lodges` uses a legacy `AdminRoute` checking a separate `user_roles` table.
- Uncommitted: `supabase/migrations/20260712120000_default_tourist_role.sql` (parked with the OAuth work; also benefits email signups — not on the deploy critical path).

---

## Pending user actions (blocking a clean launch)

These need dashboard/console access I don't have. Values are exact — copy them in.

1. **Supabase → Authentication → URL Configuration** (project `iezhssfzbiwnofhpjahv`)
   - Site URL: `https://otot-web-production.up.railway.app`
   - Add to Redirect URLs:
     `https://otot-web-production.up.railway.app/**`,
     `http://localhost:4173/**`, `http://localhost:8080/**`
   - *Why:* password-reset / email-verify / magic-link redirects to the Railway
     origin are rejected until the origin is allowlisted.

2. **Railway → `otot-web` → Settings → Source** — connect the GitHub repo
   `heyramsenthil/otot`, set the deploy branch to **`main`**, enable auto-deploy.
   Confirm the service has build variables `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
   - *Why:* makes every merge to `main` ship automatically (iterative deploys).

3. **Review & merge the `develop → main` PR** (opened for you — link in the
   handoff / PR list).

4. **Decide the canonical public domain** used in share/invite links
   (`PdfPreviewDialog.tsx:48`, `Dashboard.tsx:485` currently say
   `mvp.the1campaign.com`). If that custom domain will front the new deployment,
   leave as-is; otherwise tell me the domain and I'll switch these (ideally to a
   `VITE_PUBLIC_APP_URL` env var) so shared links resolve.

5. **Apply new migrations to prod via the Supabase SQL Editor** when shipped
   (`db push` is blocked by the migration-history mismatch). *None required for
   the current batch.*

---

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

## Next steps for production deployment

The security blockers are resolved and verified live. What remains to reach a
clean, iteratively-deployable production launch, in order:

### A. Complete the launch (do these next)
1. **Allowlist the Railway domain in Supabase Auth** *(user, dashboard)* —
   Auth → URL Configuration: Site URL = `https://otot-web-production.up.railway.app`,
   add `https://otot-web-production.up.railway.app/**` (+ localhost) to Redirect
   URLs. Without this, password-reset / email-verify redirects break. (Step 4.)
2. **Fix `MagicLink.tsx` hardcoded config** *(code)* — replace the
   `mvp.the1campaign.com` URL + inlined anon key at `src/pages/auth/MagicLink.tsx:9-10`
   with `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`,
   matching `client.ts`. Otherwise the magic-link flow points at the wrong
   backend in prod.
3. **Merge `develop` → `main`** *(PR)* — land the Phase-1 security/deploy commit
   on `main` so it becomes the deployable source of truth.
4. **Wire iterative auto-deploy** *(user + me)* — connect Railway to the GitHub
   repo (`heyramsenthil/otot`) and enable auto-deploy on `main`, with the three
   `VITE_*` build args set as Railway variables. This delivers the "push updates
   iteratively" requirement — every merge to `main` ships automatically. (Steps 3, 6.)
5. **Smoke-test on the live domain** — after 1–4: super-admin + one partner
   login, a password-reset round-trip (confirms the redirect allowlist), and
   re-run the anon `password_hash` + open-function checks against prod.

### B. Fast-follow hardening (post-launch, not blockers)
6. **Code splitting (#5)** — route-level `React.lazy` + Vite `manualChunks` for
   `mapbox-gl`, `@react-pdf/renderer`, TipTap, `jspdf`, `html2canvas`, `recharts`.
   Biggest UX/egress win.
7. **CI + monitoring (#7)** — GitHub Actions running `npm run build` + `npm run lint`
   on PRs; add Sentry. Wire `security-check.mjs` / `portal-smoke.mjs` into CI.
8. **Fix the two pre-existing route-guard bugs** — make `/lodge/dashboard`
   consume the lodge custom session (not `BusinessPartnerRoute`'s Supabase check),
   and reconcile the legacy `/admin/lodges` `AdminRoute`. Needed for the lodge
   portal to actually be usable end-to-end.
9. **Deeper hardening** — CORS allowlist (#5-plan), session tokens out of
   `localStorage` (#2), full RLS audit (#9), a staging Supabase project for
   env separation (#8), custom domain + TLS (Step 6).
