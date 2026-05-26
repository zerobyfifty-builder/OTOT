## Goal
Keep Owner modules and Partner modules as two separate catalogs. The Owners → Module Assignment page should only list owner modules (CM01–CM07 + sub-codes). The Partners → Module Assignment page should only list partner modules. No cross-leakage.

## Current state
- Single `modules` table is shared. Both `OwnerModules.tsx` and `PartnerModules.tsx` run `select * from modules where is_active=true`, so every module (Dashboard, Climate Funding, Tree Orders, Per-Tree Insights, Travel Offsets, Impact Overview, Forest Registry group, etc.) shows under Partners too.
- No column today distinguishes the intended audience of a module.

## Approach
Add an `audience` tag on each module row and filter the two admin pages by it. Additive only — no behavior change for end-user portals or `organization_modules` assignments already in place.

### 1. Schema (migration)
- Add column `modules.audience text not null default 'owner'` with a check constraint allowing `'owner' | 'partner' | 'both'`.
- Backfill:
  - `audience='owner'` for every currently active module (these are all the CM01–CM07 owner modules and their MDM children).
  - Leave room for future partner modules — none seeded now; partners catalog starts empty until partner-specific modules are created.

### 2. Admin pages
- `src/pages/admin/OwnerModules.tsx` — modules query becomes `.in('audience', ['owner','both'])`.
- `src/pages/admin/PartnerModules.tsx` — modules query becomes `.in('audience', ['partner','both'])`. Empty-state copy updated to: "No partner modules defined yet."
- No change to per-user permission assignment logic, sidebar preview, or `organization_modules` writes.

### 3. Out of scope (do not touch)
- Owner/Partner portals, routing guards, RLS, `useModulePermissions`, `organization_modules` rows.
- The `category` column on `modules` (functional grouping — financial/operations/etc.) stays as-is.
- No new partner-specific modules are seeded. When you want a partner module created (e.g. Partner Dashboard, Reporting), tell me the name + display and I'll insert it with `audience='partner'`.

## Result
- Owners → Module Assignment: shows CM01–CM07 owner catalog only (unchanged from today).
- Partners → Module Assignment: shows partner catalog only (empty until partner modules are added). CM01–CM06 no longer appear here.
- Adding a new module later is a single insert with `audience='owner' | 'partner' | 'both'`.