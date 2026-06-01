# Workflow Assignment Tab — Role-Based Module Permissions

Move module/sub-feature permission allocation from **per-user** to **per-role**, scoped to each owner org. Reuse the exact UI/UX of the Super Admin → Owners → Modules screen (the attached design).

## Scope

- Owner portals only (Institutional, Plantation, Tech).
- Adds a new **Workflow Assignment** tab in Organization Settings (next to Roles).
- Removes the **Manage Permissions** action from the Users tab.
- Permissions now resolve from the user's assigned custom role.
- Gates Roles tab, Workflow Assignment tab, and the per-user action menu in the Users tab to **org owner + users whose custom role is the system Admin role** (mapped_job_role = `org_admin`).

## Access gating

A single helper `useIsOrgAdminUser()` returns true when **either**:
1. The signed-in user is the org owner (`users.organization_id = current org` — the existing `is_org_admin` fallback), or
2. The user's `org_users.custom_role_id` points to an `org_custom_roles` row with `is_system = true` AND `mapped_job_role = 'org_admin'`.

Applied to:
- `OrganizationSettings.tsx` — Roles tab + Workflow Assignment tab are hidden (and their routes return null) for non-admins.
- `UsersTab.tsx` — the 3-dot action menu column is hidden for non-admins (they still see the user list, read-only).
- RLS on `org_role_permissions` and existing `org_custom_roles` policies enforce the same rule server-side.

## Database (migration)

### New table `public.org_role_permissions`
- `id uuid pk`, `organization_id uuid`, `role_id uuid → org_custom_roles(id) ON DELETE CASCADE`
- `module_name text` (matches `modules.name`)
- `enabled boolean default false`
- `permissions jsonb` — `{ read, write, edit, delete }`
- `sub_features jsonb` — same keys as today (e.g. `tree_orders.action.*`)
- `created_at`, `updated_at`
- UNIQUE `(role_id, module_name)`
- GRANT: `authenticated` (CRUD), `service_role` (all). No anon.
- RLS:
  - SELECT: any authenticated user in the same org (so `useModulePermissions` resolves their own role).
  - INSERT/UPDATE/DELETE: `is_org_admin(auth.uid(), organization_id)` OR `is_super_admin(auth.uid())`.
- `updated_at` trigger via existing `update_updated_at_column()`.

No backfill — existing `org_user_permissions` rows are left in place but no longer read. Kept for rollback; can be dropped later.

## Frontend

### New: `src/hooks/useIsOrgAdminUser.ts`
Returns `{ isAdmin, isLoading }` based on the rule above. Reused by Organization Settings tabs and UsersTab.

### New: `src/components/owner/settings/WorkflowAssignmentTab.tsx`
Mirrors `src/pages/admin/OwnerModules.tsx`:
- Columns = active roles from `org_custom_roles` for the current org (system Admin first, then by name).
- Rows = modules currently assigned to the org via `organization_modules`, using the same display names, OM codes, `Shared` / `Own data` badges, Forest Registry collapsible group, and same ordering.
- Each cell: `Switch` (enabled) + RWED short label + popover with RWED checkboxes (Read auto-kept when any other is on).
- Tree Orders row expandable to show the 9 sub-feature action items (same keys as `UserPermissionsSheet`'s `TREE_ORDERS_SUBFEATURES`), each with its own toggle per role.
- Forest Registry group toggle with `n/5` count badge and bulk enable/disable.
- Writes go to `org_role_permissions`.
- The system Admin role column is rendered read-only with all toggles on (full access).

### New: `src/hooks/useOrgRolePermissions.ts`
- `useOrgRoles(orgId)` → `org_custom_roles` list.
- `useOrgRolePermissions(orgId)` → all permission rows for the org.
- `setRolePermission(roleId, moduleName, patch)` mutation.

### Edit: `src/pages/owner/OrganizationSettings.tsx`
- Add `Workflow Assignment` tab (icon `SlidersHorizontal`) immediately after **Roles**.
- Use `useIsOrgAdminUser()` to conditionally render the **Roles** and **Workflow Assignment** triggers + content. Non-admins never see these tabs.

### Edit: `src/components/owner/settings/UsersTab.tsx`
- Remove "Manage Permissions" from the action menu.
- Hide the entire 3-dot action menu column when `useIsOrgAdminUser()` returns false (non-admins get a read-only user list).
- Remove `UserPermissionsSheet` import + render.
- Keep Edit / Resend invite / Deactivate / Delete actions for admins.

### Delete: `src/components/owner/settings/users/UserPermissionsSheet.tsx`
No longer used.

### Edit: `src/hooks/useModulePermissions.ts`
Resolve permissions via the user's role instead of per-user override:
1. Look up the caller's `org_users` row → `custom_role_id`, `organization_id`.
2. If user has no `org_users` row OR `custom_role_id` is null → fall back to existing org-level `organization_modules` permissions (preserves current behavior, prevents lockout).
3. If the role is the system Admin row (`is_system = true` AND `mapped_job_role = 'org_admin'`) → grant full RWED + all sub-features.
4. Otherwise read `org_role_permissions` for `(role_id, module_name)`:
   - Row exists → use its `enabled`, `permissions`, `sub_features` (strict opt-in for sub-features, same semantics as today's user override).
   - No row → module disabled for that role.
5. Org-level `organization_modules` still gates whether a module is available to the org at all (unchanged).

Return shape is unchanged, so every downstream consumer (sidebar visibility, route guards, action-menu gating) keeps working without edits.

## Out of scope / unchanged

- `organization_modules` (super-admin allocation per owner type) — unchanged.
- `org_user_permissions` table — left in place, no reads, no writes from new code.
- Roles tab content, Invite/Edit user dialogs, role dropdown — unchanged.
- Sub-feature keys and action-menu gating — unchanged.
- Other portals (admin, lodge, agent, tourist) — untouched.

## Risks / mitigations

- **Users with no assigned role** → `useModulePermissions` falls back to org-level permissions so they keep working until an admin assigns roles.
- **Admin lockout** → org owner (`is_org_admin` fallback) + system Admin role both always resolve to full access.
- **Stale React Query cache** → invalidate `["modulePermissions"]`, `["orgRolePermissions"]`, `["orgCustomRoles"]` on any write.
