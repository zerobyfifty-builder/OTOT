

## Organization Settings + Org Users Module

Rebuild the stakeholder Settings page as a tabbed **"Organization Settings"** experience and introduce an **Org Users** module that lets organization admins invite team members, assign a job role, and scope which app modules + sub-features (e.g. Tree Orders impact sliders) each role can access.

### 1. Page rename + tabbed shell

`/stakeholder/settings` becomes **Organization Settings**.

Tabs (left-to-right, matching the reference design — text labels with subtle icons, active = underline):

```text
General  |  Users  |  Organization  |  Planting Costs  |  Notifications
```

- **General** — current Personal Info, Email, Password, Security cards (existing content).
- **Users** — NEW. Visible only to org admins.
- **Organization** — read-only org details (currently inside General).
- **Planting Costs** — existing tab, kept.
- **Notifications** — placeholder for future preferences.

Header: `Organization Settings` + sub `Manage your account, team and organization settings`. Org switcher chip (top-right) shows org initials + name (read-only for v1).

### 2. Users tab — listing

Layout matches uploaded reference (`Users_module_under_org_settings.png`):

```text
N Members                                      [+ Invite User]
Manage organization members and their permissions
─────────────────────────────────────────────────────────────
Name              Email           Job Role     Status   Joined   ⋯
[avatar] John D.  john@…          Admin        ●Active  2d ago   ⋯
                  Owner
```

- Avatar with initials, name + position subtitle, email, **Job Role** pill (color per role), **Status** pill (Active / Deactivated), Joined (relative + tooltip absolute), 3-dot action menu.
- Action menu: **Edit user**, **Manage permissions**, **Resend invite** (pending), **Activate / Deactivate**, **Remove** (confirm dialog).
- Search by name/email + role filter.

### 3. Invite User dialog

Fields: First name, Last name, Email, Position/Title, **Job role** (dropdown — see roles below), Personal message (textarea, optional).

On submit → edge function `org-invite-user` creates auth user (random temp password), inserts `org_users` row with `pending` status, and emails magic-link / set-password link. Closes via top-right `X` (per memory).

### 4. Job roles (8 fixed)

Stored as `org_job_role` enum:

| Key | Label |
|---|---|
| `field_ops` | Field Ops |
| `expert` | Expert |
| `operations_manager` | Operations Manager |
| `project_manager` | Project Manager |
| `community_coordinator` | Community Coordinator |
| `impact_analyst` | Impact Analyst |
| `finance` | Finance |
| `org_admin` | Admin |

Each role has a default permission template (editable per user later):

| Role | Default modules | Default sub-features |
|---|---|---|
| Admin | All assigned org modules | All sliders, all CRUD |
| Field Ops | Tree Orders, Tree Mgmt, Planting | Status transitions only |
| Expert | Tree Orders, Species, Sequestration | Carbon + Ecosystem sliders |
| Ops Manager | Tree Orders, Nurseries, Planters, Forest Locations | Carbon slider |
| Project Mgr | Dashboard, Trip Mgmt, Tree Orders, Analytics | All sliders (read) |
| Community Coord | Tree Orders, Community Impact | **Community Impact slider only** |
| Impact Analyst | Impact Insights, Outcomes, Tree Orders | **Ecosystem Impact slider only** |
| Finance | Financial, Payment Mgmt, Planting Costs | — |

### 5. Manage permissions (per user)

Side sheet listing every module assigned to the org. For each module:

- Toggle: enabled for this user
- CRUD checkboxes: Read / Write / Edit / Delete
- **Sub-feature checkboxes** when applicable. Tree Orders exposes:
  - `tree_orders.slider.carbon` — Carbon Metrics
  - `tree_orders.slider.ecosystem` — Ecosystem Impact
  - `tree_orders.slider.community` — Community Impact
  - `tree_orders.action.status_transition`
  - `tree_orders.action.send_update`

Saving writes to `org_user_permissions` (per-user override of role defaults).

### 6. Module gating

New module `org_users` (category `oversight`, route `/stakeholder/settings?tab=users`) seeded into `modules` so super-admins assign it from Module Assignment. The Users tab only renders when:
- `assignedModules.includes('org_users')` AND
- current user's `job_role = 'org_admin'` OR is the org owner.

### 7. Tree Orders enforcement

`StakeholderOrders.tsx` reads sub-feature flags via extended `useModulePermissions('tree_orders')` (now returns `subFeatures: Record<string, boolean>`). The 3 ImpactLogSliders entries in the row action menu are conditionally rendered. Status-transition button gated by `tree_orders.action.status_transition`.

### Technical details

**New tables (migration)**
- `org_users` — `id`, `organization_id`, `user_id` (nullable until invite accepted), `email`, `first_name`, `last_name`, `position`, `job_role org_job_role`, `status` (`pending|active|deactivated`), `invited_by`, `invited_at`, `joined_at`.
- `org_user_permissions` — `id`, `org_user_id`, `module_name`, `permissions jsonb` (`{read,write,edit,delete}`), `sub_features jsonb` (`{key: bool}`).
- `org_job_role_defaults` — seed table mapping role → default modules + sub-features (used to bootstrap a new user's permissions row).

**RLS**
- Org admins can SELECT/INSERT/UPDATE/DELETE rows where `organization_id = get_user_organization(auth.uid())` AND `has_role(auth.uid(), 'org_admin')` via new SECURITY DEFINER helper `is_org_admin(_user_id, _org_id)`.
- Members can SELECT their own row only.

**Edge function**
- `org-invite-user` — admin client, creates auth user, inserts `org_users` + `users` row, seeds `org_user_permissions` from defaults, sends magic-link email.
- `org-toggle-user-status` — flips `status` and disables auth user.

**Hooks**
- `useOrgUsers(orgId)` — list/CRUD via React Query.
- `useIsOrgAdmin()` — boolean for tab visibility.
- Extend `useModulePermissions` to merge org-level + per-user perms and expose `subFeatures`.

**Files**
- New: `src/pages/stakeholder/OrganizationSettings.tsx` (replaces direct render of `StakeholderSettings`), `src/components/stakeholder/settings/{GeneralTab,UsersTab,OrganizationTab,NotificationsTab}.tsx`, `src/components/stakeholder/settings/users/{UsersList,InviteUserDialog,EditUserDialog,UserPermissionsSheet,UserActionsMenu}.tsx`, `src/hooks/useOrgUsers.ts`, `src/hooks/useIsOrgAdmin.ts`, `supabase/functions/org-invite-user/index.ts`, `supabase/functions/org-toggle-user-status/index.ts`.
- Edited: `src/pages/stakeholder/StakeholderSettings.tsx` (kept as `GeneralTab` content), `src/App.tsx` (route still `/stakeholder/settings`, uses `OrganizationSettings`), `src/hooks/useModulePermissions.ts` (sub-features), `src/pages/stakeholder/StakeholderOrders.tsx` (gate slider menu items), `src/components/stakeholder/StakeholderSidebar.tsx` (label `Organization Settings`).
- Migration seeds `org_users` module + `org_job_role` enum + permission defaults.

### Build order
1. Migration: enum, tables, RLS, seed `org_users` module + role defaults.
2. Tabbed `OrganizationSettings` shell + move existing settings into `GeneralTab`.
3. `useOrgUsers` + `UsersList` + `UserActionsMenu`.
4. `InviteUserDialog` + `org-invite-user` edge function.
5. `EditUserDialog` + `UserPermissionsSheet` (module + sub-feature matrix).
6. Extend `useModulePermissions` with sub-features; gate Tree Orders sliders.
7. Notifications tab placeholder + Org tab polish.

### Not in v1
- Cross-organization membership / org switcher functionality.
- Audit log of permission changes (table is ready, UI later).
- Bulk import of users.

