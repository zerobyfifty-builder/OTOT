# Separate Owners and Partners as distinct stakeholder categories

## Current state

- `organizations.category` already holds the distinction: `owner` (4 rows) vs `institutional` / `business` (1 each).
- `AllOwners.tsx` correctly filters `category = 'owner'`.
- `AllPartners.tsx` has **no category filter** — it returns every non-archived organization, so owner orgs leak into the Partners list.
- `OwnerModules.tsx` and `OwnerLogs.tsx` are scoped to `category = 'owner'`. There is no equivalent Partner Modules / Partner Logs page.
- Sidebar (after the last change) links `Partners` → `/admin/partners` (the All Partners list). No Modules/Logs entries exist for partners.
- The partner creation wizard already restricts choices to `institutional | business` (see `src/types/partner.ts`), so new partners are tagged correctly; new owners come through `CreateOwnerSheet` with `category='owner'`. No backend schema change is needed — the data model is already separated; only the UI queries and missing partner-side screens need work.

## Changes

### 1. Stop owners showing under Partners (UI scoping only)
- `src/pages/admin/AllPartners.tsx`
  - Add `.in("category", ["institutional", "business"])` to the base query.
  - Update the category filter `Select` to only offer `All / Institutional / Business` (already correct) and ensure "All" maps to the `in(...)` list, not unfiltered.
- `src/pages/admin/Partners.tsx` (the landing tiles): no data change needed; tiles already split institutional vs business.

### 2. Add Partner Modules page (mirrors Owner Modules)
- New file `src/pages/admin/PartnerModules.tsx` — copy `OwnerModules.tsx` and change:
  - Query filter: `.in("category", ["institutional","business"])` instead of `.eq("category","owner")`.
  - Labels: "Owner" → "Partner".
  - Reuse the same `organization_modules` table and `useModulePermissions` plumbing (no schema change). Module assignment is per-organization, so partners get the same mechanism owners already use.
- Route in `src/App.tsx`: `/admin/partners/modules` wrapped in `SuperAdminRoute + AdminLayout`.

### 3. Add Partner Activity Logs page (mirrors Owner Logs)
- New file `src/pages/admin/PartnerLogs.tsx` — copy `OwnerLogs.tsx`, swap filter to partner categories and labels.
- Route `/admin/partners/logs` in `src/App.tsx`.

### 4. Sidebar
- `src/components/admin/AdminSidebar.tsx`: convert the single `Partners` link back into a small group with three children — `All Partners` (`/admin/partners`), `Module Assignment` (`/admin/partners/modules`), `Activity Logs` (`/admin/partners/logs`) — symmetrical to the Owners group.

### 5. Verify no cross-contamination elsewhere
- Grep audit of `from("organizations")` calls in `src/pages/admin/**`:
  - `AllOwners`, `OwnerModules`, `OwnerLogs`, `OwnersDashboard` → all already filter `category='owner'`. Leave as-is.
  - `PartnersBusiness.tsx`, `PartnersInstitutional.tsx` → confirm they filter by their specific category; tighten if missing.
- No edits to portals, routing guards (`OwnerRoute`, `BusinessPartnerRoute`, `InstitutionalRoute`), or backend RLS — they already key off role + organization, which is unchanged.

## Out of scope

- No database migration. The `category` column and `partner_types` table already model the separation. Adding a DB-level CHECK constraint isn't requested and would risk breaking existing rows.
- No changes to owner/partner portal features, modules table, or RLS policies — functionality is preserved exactly.

## Technical notes

- The leak is a single missing `.in()` filter on the Partners list query; everything else is additive (two new admin pages + sidebar entries + routes).
- New pages reuse existing components (`useModulePermissions`, sidebar preview dialog) so no new business logic is introduced.
