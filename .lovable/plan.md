

# Stakeholders Module Development Plan

## Overview

This plan introduces a new **Stakeholders** module to the OTOT platform, starting with plantation partner **Mau-ICLIP**. It mirrors the existing Partners architecture (admin onboarding, dedicated portal, auth context, route guards) but adds domain-specific pages for plantation operations: nurseries, planting, monitoring, financials, and outcomes.

---

## Architecture Summary

```text
┌─────────────────────────────────────────────────────┐
│                   SUPER ADMIN                       │
│  /admin/stakeholders      - List all stakeholders   │
│  /admin/stakeholders/create - Onboard wizard        │
│  /admin/stakeholders/:id  - Detail/manage           │
│  /admin/stakeholders/modules - Assign modules       │
└──────────────┬──────────────────────────────────────┘
               │ creates stakeholder account
               ▼
┌─────────────────────────────────────────────────────┐
│            STAKEHOLDER PORTAL                       │
│  /stakeholder/login                                 │
│  /stakeholder/dashboard   - KPIs, recent activity   │
│  /stakeholder/nurseries   - CBOs, seed species      │
│  /stakeholder/planting    - Blocks, planters, dates  │
│  /stakeholder/monitoring  - Height, survival rates   │
│  /stakeholder/financial   - KTB funds, reconciliation│
│  /stakeholder/outcomes    - Impact, carbon, reports  │
│  /stakeholder/admin       - Sub-accounts, settings   │
└─────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema (Migrations)

### 1a. New role & stakeholder tables

- Add `'stakeholder'` to the `app_role` enum
- Add `'plantation'` (and future types) to a new `stakeholder_type` column on `organizations`, or create a dedicated `stakeholders` table referencing `organizations`
- New tables:

**`nurseries`** — CBO nurseries per block
| Column | Type |
|--------|------|
| id | uuid PK |
| stakeholder_org_id | uuid FK → organizations |
| cbo_name | text |
| block_name | text (Mau block) |
| location | text |
| capacity | integer |
| is_active | boolean |

**`seed_species`** — certified seed species catalog
| Column | Type |
|--------|------|
| id | uuid PK |
| species_name | text |
| certification_source | text |
| category | text (indigenous/exotic) |

**`seedling_batches`** — seedlings grown per nursery per species
| Column | Type |
|--------|------|
| id | uuid PK |
| nursery_id | uuid FK |
| species_id | uuid FK |
| quantity | integer |
| date_sown | date |
| status | text |

**`planting_records`** — individual planting events
| Column | Type |
|--------|------|
| id | uuid PK |
| stakeholder_org_id | uuid FK |
| block_name | text |
| beat | text |
| species_id | uuid FK |
| seedlings_planted | integer |
| planter_name | text |
| date_planted | date |
| nursery_id | uuid FK |
| latitude/longitude | numeric |

**`monitoring_records`** — growth tracking over time
| Column | Type |
|--------|------|
| id | uuid PK |
| planting_record_id | uuid FK |
| measurement_date | date |
| height_cm | numeric |
| survival_count | integer |
| original_count | integer |
| survival_rate | numeric (computed) |
| notes | text |
| photos | jsonb |

**`stakeholder_disbursements`** — financial flows from KTB
| Column | Type |
|--------|------|
| id | uuid PK |
| stakeholder_org_id | uuid FK |
| amount | numeric |
| currency | text |
| disbursement_date | date |
| reference | text |
| status | text (pending/received/reconciled) |
| reconciled_at | timestamp |
| notes | text |

- RLS policies follow the existing pattern: super admins can manage all; stakeholder users can read/write their own organization's data via `get_user_organization(auth.uid())`

### 1b. New database function

- `is_stakeholder(user_id uuid)` — security definer function checking `roles.name = 'stakeholder'`, mirroring `is_institutional_partner()`

---

## Phase 2: Auth & Route Infrastructure

### 2a. Stakeholder Auth Context
- New file: `src/contexts/StakeholderAuthContext.tsx`
- Uses Supabase Auth (like the main AuthContext), checks `stakeholder` role on login and redirects to `/stakeholder/dashboard`

### 2b. Route Guard
- New file: `src/components/auth/StakeholderRoute.tsx`
- Mirrors `InstitutionalRoute.tsx` — checks user has stakeholder role via the users/roles join

### 2c. Edge Function
- `supabase/functions/create-stakeholder-user/index.ts` — mirrors `create-agent-user`, creates auth user, assigns stakeholder role, links to organization

---

## Phase 3: Super Admin — Stakeholder Management

### 3a. Admin Sidebar
- Add "Stakeholders" menu group (icon: `Landmark` or `Sprout`) with sub-items: All Stakeholders, Create New, Module Assignment

### 3b. Pages (mirror Partners pattern)
- `src/pages/admin/AllStakeholders.tsx` — list with status, category, actions
- `src/pages/admin/CreateStakeholder.tsx` — multi-step wizard (reuse partner wizard pattern):
  - Step 1: Select stakeholder type (Plantation, Research, etc.)
  - Step 2: Organization details (name, contact, address, MoU reference)
  - Step 3: Module access (which portal pages they get)
  - Step 4: API integration (optional)
  - Step 5: Review and create
- `src/pages/admin/StakeholderModules.tsx` — assign/share modules across stakeholders

### 3c. Routes
- `/admin/stakeholders`, `/admin/stakeholders/create`, `/admin/stakeholders/modules` — wrapped in `SuperAdminRoute` + `AdminLayout`

---

## Phase 4: Stakeholder Portal (Mau-ICLIP)

### 4a. Layout & Sidebar
- `src/components/stakeholder/StakeholderSidebar.tsx` — navigation for portal pages
- `StakeholderLayout` component in App.tsx

### 4b. Portal Pages

**Dashboard** (`/stakeholder/dashboard`)
- KPI cards: Total Trees Planted, Survival Rate %, Active Nurseries, Funds Received, Pending Disbursements
- Chart: Monthly planting progress vs target
- Chart: Species distribution (pie)
- Recent planting activity feed
- Mau-ICLIP programme context (from PDF: 317,000 ha target, 100,000+ farmers)

**Nurseries** (`/stakeholder/nurseries`)
- Table of CBOs by block with capacity, seedling counts
- Add/edit nursery form
- Seedling batches per nursery with species breakdown
- Certified seed source tracking (KEFRI certification)

**Planting** (`/stakeholder/planting`)
- Planting records table with filters (block, beat, species, date range)
- "Record Planting" form: block, beat, species, quantity, planter name, date, GPS coordinates
- Link to nursery source
- Bulk import capability

**Financial** (`/stakeholder/financial`)
- Disbursements from KTB: amount, date, status
- Reconciliation workflow (mark received, attach receipt)
- Summary: total received, pending, reconciled
- Export to CSV/PDF

**Monitoring** (`/stakeholder/monitoring`)
- Growth tracking records per planting batch
- Height measurements over time (line chart)
- Survival rate dashboard with alerts for low survival
- Photo evidence upload
- Filters by block, beat, species

**Outcomes** (`/stakeholder/outcomes`)
- Impact summary: total trees planted, CO2 sequestered (calculated), hectares restored
- SDG alignment indicators (SDG 13, 15)
- Exportable impact reports for KTB
- Carbon credit potential estimates

**Admin** (`/stakeholder/admin`)
- Sub-account management (create users for Nursery Manager, Field Officer, etc.)
- Organization settings
- Module visibility configuration

### 4c. Login
- `src/pages/stakeholder/StakeholderLogin.tsx` — uses unified `/auth/login` with stakeholder role redirect

---

## Phase 5: App.tsx Route Registration

Add all new routes under `StakeholderRoute` + `StakeholderLayout`, and admin routes under `SuperAdminRoute` + `AdminLayout`.

---

## Implementation Order (Recommended)

1. Database migrations (tables, RLS, functions) — foundation
2. Auth infrastructure (role, route guard, edge function) — access control
3. Admin sidebar + stakeholder list/create pages — onboarding flow
4. Stakeholder portal layout + dashboard — first visible output
5. Nurseries + Planting pages — core operational pages
6. Monitoring + Financial pages — tracking and money
7. Outcomes + Admin pages — reporting and sub-accounts
8. Module sharing system — cross-stakeholder module assignment

---

## Key Design Decisions

- **Stakeholders use Supabase Auth** (like institutional partners), not session-token auth (like lodges/agents). This is more secure and consistent with the platform direction.
- **Organizations table is reused** with a new category value `'stakeholder'` rather than creating a separate stakeholders table — keeps the module/permission system unified.
- **Plantation-specific tables** (nurseries, planting_records, monitoring_records, etc.) are new and specific to this domain.
- **Module sharing** leverages the existing `organization_modules` table — admin can assign any module to any stakeholder.

