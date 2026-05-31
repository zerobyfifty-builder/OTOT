## Goal

Add a **Roles** tab next to the Users tab in Organization Settings (all three owner portals: institutional, plantation, tech) that lets the org admin create, edit, deactivate, and delete custom Job Roles for their organization. The role dropdown in the Add User / Edit User sheets is then populated from these custom roles instead of the hard-coded enum list.

## Database changes (one migration)

Create `public.org_custom_roles`:

| column          | type                  | notes                                       |
| --------------- | --------------------- | ------------------------------------------- |
| id              | uuid PK               |                                             |
| organization_id | uuid (FK orgs)        | required                                    |
| name            | text                  | role label, unique per org                  |
| color           | text                  | preset key: slate, rose, pink, emerald, teal, sky, indigo, violet, amber, orange |
| description     | text                  | optional                                    |
| is_active       | boolean default true  |                                             |
| is_system       | boolean default false | true for the seeded "Admin" row, non-deletable |
| mapped_job_role | org_job_role default 'user' | hidden — keeps existing admin gating (`is_org_admin`) working; the seeded Admin row maps to `org_admin`, all custom roles map to `user` |
| created_at / updated_at | timestamptz   |                                             |

- GRANT to authenticated + service_role; enable RLS.
- Policies: org members can read their org's roles; only org admins (or super_admin) can insert/update/delete; system rows cannot be deleted (enforced via trigger).
- Seed: for every existing organization, create one `is_system = true` row named "Admin" with color `violet` and `mapped_job_role = 'org_admin'`. New orgs get the same seed via a trigger on `organizations` insert.
- Add nullable column `org_users.custom_role_id uuid` referencing `org_custom_roles(id)`. Existing `job_role` enum column stays for backward compatibility (admin gating, RLS).

## UI changes

### 1. New `RolesTab` component (`src/components/owner/settings/RolesTab.tsx`)

Matches the attached design:

- Header: "Roles" title + "Define custom roles for users in <Org Name>" subtitle + **Create Role** button (top right).
- Table columns: Role (colored pill), Description, Active (toggle switch), Created (DD/MM/YYYY), Actions (3-dot menu → Edit / Delete).
- Tab label badge shows live role count (mirrors the "3" badge on the Users tab).
- Toggle on a system row is disabled; Delete is hidden for system rows.

### 2. New `RoleFormSheet` component

Right-side slider sheet (`Sheet`) used for both Create and Edit:

- Title: "Create Role" / "Edit Role" with top-right X close (per dialog-closing standard).
- Fields: Role Name (required), Color (10 swatches selectable grid: slate, rose, pink, emerald, teal, sky, indigo, violet, amber, orange), Description (textarea, optional).
- Footer: Cancel / Create or Save.

### 3. Wire Roles tab into `OrganizationSettings.tsx`

Insert a `TabsTrigger` + `TabsContent` for `roles` immediately after `users`. Gated by `isOrgAdmin` (same as Users/Logs).

### 4. Update Invite / Edit User dropdowns

- `useOrgOwnerType.ts` keeps the legacy presets but is no longer used by the Invite/Edit dialogs.
- `InviteUserDialog.tsx` and `EditUserDialog.tsx`: replace the hard-coded `roles` list with a query of active `org_custom_roles` for the current org. Submit sends both `custom_role_id` and a derived `job_role` (the role's `mapped_job_role`) so existing RLS/admin logic keeps working.
- `org-invite-user` edge function: accept new optional `custom_role_id`; persist it on `org_users` alongside the existing `job_role`.

### 5. Update `UsersTab.tsx` role pill + filter

- Join `org_users` with `org_custom_roles` so the role pill shows the custom role name + color when `custom_role_id` is set; falls back to the existing `ROLE_LABELS[job_role]` otherwise.
- Role filter dropdown is populated from the org's `org_custom_roles` list (plus "All roles").

## Out of scope (kept unchanged)

- Module/permission assignment (still handled by the existing `UserPermissionsSheet`).
- Job-role-driven RLS functions — they continue to use the existing `job_role` enum via the `mapped_job_role` bridge.
- Other portals (admin, lodge, agent) — change is limited to the owner portals.