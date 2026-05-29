## Goal

Make the partner (Institutional / Lodge) and Owner portals render only the modules that Super Admin has allocated to that organization — same RBAC pattern Owner already uses.

## Current state

- **Already exists**: Super Admin pages `/admin/partners/modules` (`PartnerModules.tsx`) and `/admin/owners/modules` (`OwnerModules.tsx`) let admins toggle modules + permissions per organization in `organization_modules`.
- **Already dynamic**: `OwnerSidebar` reads `organization_modules` and builds its menu from `assignedModules`. Hook `useModulePermissions` returns per-module access.
- **Static today**: `InstitutionalSidebar` and `LodgeSidebar` use hardcoded menu arrays — they ignore `organization_modules`.
- **Catalog gap**: `modules` table only has 2 partner-audience rows (`partner_management`, `travel_agents`). The actual partner pages (Trips, Tree Orders, Disbursements, Reports, etc.) have no module entries, so PartnerModules' table currently can't toggle them.

## Plan

### 1. Expand `modules` catalog (migration)

Insert partner-audience module rows that mirror real Institutional + Lodge menu items:

Institutional (`audience='partner'`, category='institutional'):
- `inst_dashboard` — Dashboard — /institutional/dashboard
- `inst_trips` — Recent Trips — /institutional/trips
- `inst_tree_orders` — Tree Orders — /institutional/trees
- `inst_travel_agents` — Travel Agents — /institutional/travel-agents
- `inst_partners` — Plantation Partners — /institutional/partners
- `inst_disbursements` — Disbursements — /institutional/disbursements
- `inst_reports` — Reports — /institutional/reports

Lodge (`audience='partner'`, category='lodge'):
- `lodge_dashboard`, `lodge_tourists`, `lodge_trees`, `lodge_reimbursements`, `lodge_performance`, `lodge_notifications`

Backfill: auto-grant ALL new modules to every existing partner org so behavior doesn't regress.

### 2. Make `InstitutionalSidebar` dynamic

Mirror OwnerSidebar pattern:
- Resolve `organization_id` from logged-in user.
- Query `organization_modules` joined to `modules` where `is_active=true`.
- Build menu from a `name → {title, url, icon}` map filtered by allocated module names, sorted by `sort_order`.
- Always keep "Available Modules" item visible (meta page).

### 3. Make `LodgeSidebar` dynamic

Lodge auth is session-token based (`LodgeAuthContext`, not Supabase auth). The lodge id maps to `organizations.id` (business category). Reuse the same approach: query `organization_modules` by `lodge.id`, filter the hardcoded menu by allocated module names.

### 4. Wire institutional dashboard sections (light touch)

`/institutional/dashboard` itself stays — but the sidebar links it shows control what's reachable. No route gating change in this pass (routes remain mounted; sidebar visibility is the RBAC surface, matching Owner behavior today).

## Technical notes

- No edits to existing PartnerModules / OwnerModules / OwnerSidebar.
- Module rows use the existing schema (`name`, `display_name`, `route`, `audience`, `category`, `sort_order`, `is_active`, `access_type='shared'`).
- Backfill uses `INSERT ... ON CONFLICT DO NOTHING` against `(organization_id, module_id)`.
- Icon mapping lives in the sidebar component (lucide-react); fall back to `Home` when unknown.

## Out of scope

- Building a brand new "partner home" page distinct from /institutional/dashboard or /lodge/dashboard.
- Changing per-user (org_user_permissions) overrides for partner sidebars — first pass uses org-level allocation only.
