# CLAUDE.md

Guidance for working in this repository.

## Project overview

OTOT (One Tourist One Tree) is a Kenya Tourism Board tree-planting / carbon-offset SPA. It is **frontend-only**: Vite + React + TypeScript + shadcn/ui. There is no Supabase, no JWT, and no backend besides the optional carbon emission calculator HTTP API.

The previous Supabase-backed app (lodges, travel agents, owner MDM, edge functions) lives on git branch `archive/supabase-full`.

## Commands

```sh
npm i
npm run dev      # Vite on port 5173
npm run build
npm run lint
npm run preview
```

There is no test suite.

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

Sessions are `localStorage` (`otot.mock-session`). Product data is `otot.mock-store.v1`. Super admin can reset the store.

## Architecture

- [`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx) — demo sign-in / tourist signup
- [`src/contexts/StoreContext.tsx`](src/contexts/StoreContext.tsx) — shared in-memory/localStorage store for donations, payments, plantation requests, vendor requests, payouts
- [`src/lib/portal.ts`](src/lib/portal.ts) — hostname copy (`office.` / `partner.`) and `portalHomePath`
- [`src/utils/emissionCalculatorApi.ts`](src/utils/emissionCalculatorApi.ts) — **only live network call**; uses `VITE_EMISSION_API_URL` / `VITE_EMISSION_API_KEY`, falls back locally
- [`src/lib/treeMix.ts`](src/lib/treeMix.ts) — browser-side mix of tree types for a CO₂ volume and donation amount

### Product flow

Tourist pays → donation + payment → ministry creates/assigns a plantation request (1:1 with donation) → partner admin creates a vendor plantation request and assigns an agent → agent updates status → when vendor work is complete, ministry marks the plantation request complete and can create a payout.

## Portals

| Portal | Prefix | Roles |
|---|---|---|
| Tourist | `/dashboard`, `/carbon-calculator`, `/donate` | tourist |
| Ministry | `/ministry/*` | ministry_admin, ministry_user |
| Partner | `/partner/*` | partner_admin, partner_agent |
| Super admin | `/admin/*` | super_admin |

Route guards: [`src/components/auth/RoleRoute.tsx`](src/components/auth/RoleRoute.tsx).
