# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

OTOT is a tree-planting / carbon-offset platform built for Kenya Tourism Board (KTB) partners. It is a Vite + React + TypeScript SPA backed by Supabase (Postgres, Auth, Edge Functions). The app was originally scaffolded and is still partly edited via **Lovable** (lovable.dev) — `lovable-tagger` runs in dev mode and `.lovable/plan.md` may contain in-flight design plans worth checking before large UI rewrites.

## Commands

```sh
npm i            # install deps (bun.lock/bun.lockb also present — bun works too)
npm run dev      # start Vite dev server on port 8080
npm run build    # production build
npm run build:dev # development-mode build (keeps lovable-tagger, unminified)
npm run lint     # eslint .
npm run preview  # preview a production build
```

There is no test suite configured in this repo (no test runner in `package.json`).

Supabase is managed via the CLI against the linked project (`supabase/config.toml`, project id `iezhssfzbiwnofhpjahv`). Migrations live in `supabase/migrations/*.sql`; Edge Functions live in `supabase/functions/*/index.ts`. Typed DB access comes from the generated `src/integrations/supabase/types.ts` — regenerate this file after schema changes rather than hand-editing it.

## Architecture

### Multi-portal routing

The app is one React Router tree (`src/App.tsx`) serving **five distinct portals** from role/session data, each with its own layout, sidebar, and route guard:

| Portal | Route prefix | Guard component | Layout | Sidebar |
|---|---|---|---|---|
| Tourist (default end-user) | `/dashboard`, `/my-trees`, ... | `ProtectedRoute` | `DashboardLayout` | `AppSidebar` |
| Super admin ("God Mode") | `/admin/*` | `SuperAdminRoute` | `AdminLayout` | `AdminSidebar` |
| Legacy admin | `/admin/dashboard`, `/admin/trees`, ... | `AdminRoute` | `DashboardLayout` | — |
| Owner (forest/plantation owner org) | `/owner/*` | `OwnerRoute` | `OwnerLayout` | `OwnerSidebar` |
| Institutional / government partner | `/institutional/*` | `InstitutionalRoute` | `InstitutionalLayout` | `InstitutionalSidebar` |
| Business partner (lodge) | `/lodge/*` | `BusinessPartnerRoute` | `LodgeLayout` | `LodgeSidebar` |
| Travel agent | `/agent/*` | `AgentRoute` | `AgentLayout` | `AgentSidebar` |

Route guards (`src/components/auth/*.tsx`) all follow the same pattern: read the current session, call the `get_user_role` Postgres RPC (or check a `users`/`user_roles`/`org_users` row), and either render children or redirect to the correct portal home. When adding a new protected page, match it to the correct guard/layout pair rather than inventing a new one.

### Three separate auth systems

There are three independent, concurrently-mounted auth providers wrapping the app (`AgentAuthProvider` > `LodgeAuthProvider` > `AuthProvider`, see `src/App.tsx`):

- **`AuthContext`** (`src/contexts/AuthContext.tsx`) — real Supabase Auth (`supabase.auth`), used by tourists, owners, institutional partners, and super admins. Role is resolved *after* login via the `get_user_role` RPC / `user_roles` table — there is no separate admin login route.
- **`LodgeAuthContext`** (`src/contexts/LodgeAuthContext.tsx`) — custom username/password auth against a `lodges` table with a hand-rolled session token stored in `lodge_sessions` and `localStorage` (not Supabase Auth).
- **`AgentAuthContext`** (`src/contexts/AgentAuthContext.tsx`) — travel-agent auth, also outside standard Supabase Auth session flow.

When working on auth-related bugs, check which of the three contexts is actually in play for the affected portal — they do not share session state.

### Permissions model (organization portals)

Owner/institutional org users have fine-grained module permissions layered on top of role:
- `useModulePermissions(moduleName)` (`src/hooks/useModulePermissions.ts`) resolves effective CRUD permissions + sub-feature flags for the current user's module by walking `users` → `org_users` (custom role) → `org_custom_roles` → `org_role_permissions`, falling back to `organization_modules` org-level grants when the user has no custom role.
- System role `mapped_job_role === 'org_admin'` short-circuits to full access.
- Related hooks: `useOrgUsers`, `useOrgCustomRoles`, `useOrgRolePermissions`, `useIsOrgAdmin`, `useOrgOwnerType`, `useTouristModulePermissions`.

### Activity logging

`src/integrations/supabase/client.ts` monkey-patches `supabase.from()` so that any successful `insert`/`update`/`delete`/`upsert` on a non-skipped table automatically writes a row to `activity_logs` (resolving the actor's `organization_id` best-effort). Page views are separately auto-logged via `useAutoPageViewLogger` mounted at the app root (`ActivityLoggerMount` in `App.tsx`). Tables in `SKIP_TABLES` (log tables, sessions, tokens, notifications) are excluded to avoid log spam/recursion — add new noisy tables there rather than special-casing call sites.

### Templates Studio (WYSIWYG documents)

`src/lib/templates/` implements a document-template system for certificates, invoices, receipts, and social-share assets, used by the super-admin Templates Studio (`src/pages/admin/config/Templates.tsx`, `src/components/admin/templates/**`):
- `types.ts` — v1 block-based design schema (`TemplateDesign`, `TemplateBlock`) independent of `@react-pdf/renderer` so it can be imported without pulling in the PDF renderer graph. A v2 TipTap-based schema is being introduced per `.lovable/plan.md` — check that file for the current migration state before touching the editor.
- `resolveTemplate.ts` — resolves the active template for a category + `ResolveContext` (partner org, portal).
- `renderTemplate.tsx` / `htmlToPdf.tsx` — render a resolved design to PDF (react-pdf) or HTML.
- `defaultDesigns.ts` / `starters/` — built-in starter designs per category.
- Categories (`CategoryKey`) map 1:1 to real business documents: pledge/tree certificates, tourist/B2B/agent invoices, lodge receipts, social share cards.

### PDF/document generation

Several generators under `src/utils/` (`certificateGenerator.tsx`, `invoiceGenerator.ts`, `receiptGenerator.ts`, `engagementReportGenerator.ts`) build on `jspdf`/`jspdf-autotable`/`@react-pdf/renderer` and `html2canvas`. These are largely independent of the Templates Studio system above — check whether a document type has already been migrated to the templates system before adding logic to a legacy generator.

### UI stack

- shadcn-ui components live in `src/components/ui/**` (generated; configured via `components.json`, Tailwind base color `slate`, no class prefix). Prefer composing these over adding new UI primitives.
- Path alias `@/*` → `src/*` (configured in `vite.config.ts` and both `tsconfig.*.json`).
- Styling is Tailwind (`tailwind.config.ts`) plus a couple of hand-written CSS modules for glassmorphism effects (`src/styles/glass.css`, `src/styles/glass-dashboard.css`), used on tourist-facing dashboard surfaces (`tourist-glass` classes in `DashboardLayout`).
- TypeScript is configured non-strict (`strict: false`, `strictNullChecks: false`, `noImplicitAny: false`) — don't assume strict-mode guarantees when reading or writing types.

### Supabase Edge Functions

`supabase/functions/*` handle privileged operations that must not run client-side: creating owner/partner/agent/lodge users, password resets, magic-link send/verify, deep links, and org invites. `supabase/config.toml` marks most of these `verify_jwt = false` because they're invoked pre-auth (e.g. during signup/magic-link flows) or use custom auth — check the JWT verification setting before assuming a function is protected by Supabase Auth.
