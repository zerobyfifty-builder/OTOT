# CLAUDE.md

Guidance for working in this repository.

## Project overview

OTOT (One Tourist One Tree) is a Kenya Tourism Board tree-planting / carbon-offset SPA: Vite + React + TypeScript + shadcn/ui. The browser authenticates with JWT against `VITE_API_URL` (the `bakend` Express API) and loads domain data from `GET /v1/store`. Flight CO₂ uses the optional `emission_calculator` HTTP API.

Canonical schema, statuses, and API table: [`DATA_MODEL.md`](DATA_MODEL.md).

The previous Supabase-backed app (lodges, travel agents, owner MDM, edge functions) lives on git branch `archive/supabase-full`.

## Commands

```sh
npm i
npm run dev      # Vite on port 5173
npm run build
npm run lint
npm run preview
```

There is no test suite. The API must be running (`bakend` on port 4000) for login and dashboards.

## Demo login

Password for every seeded account: `Test1234!`

| Email | Role | Home |
|---|---|---|
| tourist@demo.otot.app | Tourist | `/dashboard` |
| ministry@demo.otot.app | Ministry admin | `/ministry/dashboard` |
| ministryuser@demo.otot.app | Ministry user (view) | `/ministry/dashboard` |
| partner@demo.otot.app | Vendor admin | `/partner/dashboard` |
| partneragent@demo.otot.app | Vendor agent | `/partner/assignments` |
| superadmin@demo.otot.app | Super admin | `/admin` |

JWT is stored as `otot.jwt`. Super admin reset calls `POST /v1/admin/reset-demo`.

## Architecture

- [`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx) — JWT login / tourist signup / `/v1/auth/me`
- [`src/contexts/StoreContext.tsx`](src/contexts/StoreContext.tsx) — hydrates from `GET /v1/store` and mutates via `/v1/*`
- [`src/lib/portal.ts`](src/lib/portal.ts) — hostname copy (`office.` / `partner.`) and `portalHomePath`
- [`src/utils/emissionCalculatorApi.ts`](src/utils/emissionCalculatorApi.ts) — flight CO₂; uses `VITE_EMISSION_API_URL` / `VITE_EMISSION_API_KEY`, falls back locally
- [`src/lib/treeMix.ts`](src/lib/treeMix.ts) — local preview of tree mix; Donate also calls `POST /v1/tree-mix/quote`

### Product flow

Tourist mock-pays → donation + payment + unassigned plantation request (optionally linked to a trip) → ministry assigns a vendor → partner admin creates a vendor plantation request and assigns an agent → agent updates status → when vendor work is complete, ministry marks the plantation request complete and can create a mock payout.

## Portals

| Portal | Prefix | Roles |
|---|---|---|
| Tourist | `/dashboard`, `/my-trips`, `/my-trees`, `/my-impact`, `/carbon-calculator`, `/donate` | tourist |
| Ministry | `/ministry/*` | ministry_admin, ministry_user |
| Partner | `/partner/*` | partner_admin, partner_agent |
| Super admin | `/admin/*` | super_admin |

Route guards: [`src/components/auth/RoleRoute.tsx`](src/components/auth/RoleRoute.tsx).
