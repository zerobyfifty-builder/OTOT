
## Goal

Create a new Super Admin section **Tourists** that mirrors the Owners/Partners pattern. Super admins control which tourist-portal modules and sub-actions every tourist can access via RWED permissions. Tourist portal pages read these centrally so toggling a module/sub-action immediately enables/disables it for all tourists — and new tourist modules added later inherit the same control surface automatically.

## What gets built

### 1. New admin section: `/admin/tourists`

Sidebar entry added under "Users" group in `AdminSidebar.tsx`, route group in `App.tsx`:

- `/admin/tourists` — **Tourist User Accounts** (Tab 1)
- `/admin/tourists/modules` — **Module Assignment** (Tab 2)
- `/admin/tourists/logs` — Activity Log (optional, matches Owners pattern)

Shared `TouristsLayout.tsx` provides the title, subtitle, Refresh icon, and tabs — same UI shell as `OwnersLayout` / `PartnersLayout`.

### 2. Tab 1 — Tourist User Accounts

Lists all tourists (rows from `public.users` whose role is `tourist`/no org). Read-only table with:
- Name, email, country, signup date, trees count, last activity, status
- Search + filter
- Row action: view profile / deactivate (matches existing Users.tsx affordances; no schema changes)

This tab does not change data — it simply scopes the existing user listing to tourists.

### 3. Tab 2 — Module Assignment (the core)

A single global config table (not per-user, not per-org) listing every tourist-portal module. For each module:

- Master enable/disable switch
- RWED checkboxes (Read / Write / Edit / Delete)
- Expand row → sub-action toggles registered for that module

Saving any toggle is instant (optimistic, with toast). All tourist users inherit the same set — exactly what you described.

Example rows (initial seed, all defaulted to enabled / Read):

| Module | Sub-actions |
|---|---|
| Dashboard | hero_stats, pledge_carousel, recent_contributions |
| My Trips | create_trip, delete_trip, export_pdf |
| My Trees | **view_individual_trees_accordion**, download_certificate, share_socially, map_view |
| Carbon Calculator | flight_offset, accommodation_offset |
| Pledge | create_pledge, edit_pledge, share_pledge |
| Profile | edit_profile, change_password |
| Tree Purchase | one_time, subscription |

The "view individual trees accordion" toggle on My Trees is wired exactly as you called out.

### 4. How the tourist portal consumes it

A new hook `useTouristModulePermissions(moduleName)` returns `{ isEnabled, hasRead, hasWrite, hasEdit, hasDelete, subFeatures, isLoading }`, mirroring the existing `useModulePermissions` shape so the pattern is familiar.

Each tourist page reads it once at the top and gates UI:

- `MyTrees.tsx` — wrap the Accordion block (line ~494) in `{subFeatures["view_individual_trees_accordion"] && (...)}`.
- `MyTrips.tsx` — gate the create/delete buttons by `hasWrite` / `hasDelete`.
- `Dashboard.tsx`, `CarbonCalculator.tsx`, etc. — gate their sub-sections by their declared sub-actions.
- If `isEnabled === false`, the page-level route shows a "This feature is currently unavailable" placeholder instead of the content. Routes themselves remain mounted, so deep links never 404.

Default behavior when no row exists: **fully enabled with Read** — guarantees nothing breaks for existing users on day one.

### 5. Extensibility — new tourist modules automatically appear

The Module Assignment table is data-driven off the `modules` table filtered by `audience='tourist'`. To add a new tourist module later, a developer (or you, via a future "Register Module" UI) inserts one row into `modules` plus optional sub-action rows into `module_sub_actions`. The admin Module Assignment tab and `useTouristModulePermissions` pick it up with no code changes. This is the same pattern Owners/Partners already use.

## Technical details

### Database (single migration)

1. **Extend `modules.audience`** — already supports `owner` / `partner` / `both`; add `tourist` (and `'both'` semantics unchanged). No data migration required for existing rows.

2. **New table `public.tourist_module_permissions`** (one row per module):
   - `module_id uuid PK → modules.id`
   - `is_enabled boolean default true`
   - `permissions jsonb default '{"read":true,"write":false,"edit":false,"delete":false}'`
   - `updated_at`, `updated_by`
   - GRANT SELECT to `anon, authenticated`; full to `service_role`. RLS: read = anyone authenticated; write = `is_super_admin(auth.uid())`.

3. **New table `public.module_sub_actions`** (catalog of toggleable sub-features per module):
   - `id uuid PK`, `module_id uuid → modules.id`, `key text`, `label text`, `sort_order int`, `is_active bool`
   - Unique (`module_id`, `key`)
   - GRANT SELECT to `authenticated`; super-admin write only.

4. **New table `public.tourist_sub_action_permissions`**:
   - `sub_action_id uuid PK → module_sub_actions.id`
   - `is_enabled boolean default true`
   - GRANT + RLS same shape as #2.

5. Seed rows for the modules / sub-actions listed in the table above (idempotent inserts; defaults to enabled so existing tourist UX is unchanged).

### Frontend files

New:
- `src/pages/admin/tourists/TouristsLayout.tsx`
- `src/pages/admin/AllTourists.tsx` (Tab 1)
- `src/pages/admin/TouristModules.tsx` (Tab 2, modelled on `OwnerModules.tsx` but single-column since it's global, not per-org)
- `src/hooks/useTouristModulePermissions.ts`

Edited (additive only — no existing behaviour removed):
- `src/App.tsx` — add 3 routes inside the existing super-admin guard; remove the `/admin/users/tourists` placeholder entry.
- `src/components/admin/AdminSidebar.tsx` — add "Tourists" item next to "Owners" / "Partners".
- `src/pages/MyTrees.tsx`, `src/pages/MyTrips.tsx`, `src/pages/Dashboard.tsx`, `src/pages/CarbonCalculator.tsx`, `src/pages/Pledge*.tsx`, `src/pages/Profile.tsx`, `src/pages/TreePurchase.tsx` — wrap relevant blocks in `useTouristModulePermissions(...)` checks. Defaults make every gate pass until you change a toggle, so this is safe.

### Safety guarantees

- **No changes to existing tables** other than `modules.audience` enum extension.
- **Defaults are permissive** — a missing row = fully enabled. Existing tourist users see no difference until a super admin explicitly disables something.
- **Routes stay mounted** — disabled modules render a placeholder, not a 404, so bookmarks and emails keep working.
- **Owners/Partners modules untouched** — different tables (`organization_modules`, `org_role_permissions`) remain the source of truth for those audiences.
- **New tourist modules just need a `modules` row** — UI auto-discovers them.

## Out of scope (can be follow-ups)

- Per-tourist overrides (today's request is global for all tourists).
- A self-serve "Register a new module" admin UI — for now adding a module is a small migration.
- Audit log of toggle changes (Tab 3 placeholder exists if you want it later).
