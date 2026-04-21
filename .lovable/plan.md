

## Organization Settings + Org Users Module — Revised

Adding role taxonomy split by stakeholder type. All other plan items remain unchanged.

### Updated section: Job roles by stakeholder type

Roles are now scoped to the organization's **stakeholder category** (`organizations.category` / sub-type per `mem://stakeholder/taxonomy-and-inheritance`).

**Plantation stakeholders — 8 specialised roles**

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

**Institutional / Technology / other stakeholders — 4 generic roles**

| Key | Label |
|---|---|
| `org_admin` | Admin |
| `finance` | Finance |
| `project_manager` | Project Manager |
| `user` | User |

The `org_job_role` enum holds the **union** of all keys (`field_ops`, `expert`, `operations_manager`, `project_manager`, `community_coordinator`, `impact_analyst`, `finance`, `org_admin`, `user`). The Invite User dialog filters the dropdown by the inviting org's stakeholder type.

### Updated section: Default permission templates

`org_job_role_defaults` now keyed by `(stakeholder_type, job_role)` so the same role key (e.g. `project_manager`) can have different defaults per org type.

| Stakeholder type | Role | Default modules | Default sub-features |
|---|---|---|---|
| Plantation | (8 roles as previously specified) | … | … |
| Institutional / Technology | Admin | All assigned org modules | All |
| " | Finance | Financial, Payment Mgmt, Planting Costs | — |
| " | Project Manager | Dashboard, Trip Mgmt, Tree Orders, Analytics, Reports | All sliders (read) |
| " | User | Dashboard, Tree Orders (read) | — |

### Updated section: Invite dialog behaviour

- On open, hook resolves the current org's stakeholder type via `organizations.category` / sub-type.
- Role dropdown options are filtered: Plantation orgs see all 8; others see the 4 generic roles.
- Validation rejects role keys not allowed for the org type (server-side check in `org-invite-user`).

### Migration delta (additive)

- `org_job_role` enum: include `user` in addition to the previously listed keys.
- `org_job_role_defaults` table: add `stakeholder_type text not null` column; PK = `(stakeholder_type, job_role)`.
- Seed rows for both Plantation (8) and Generic (4) defaults.

### Files affected (delta)

- `src/components/stakeholder/settings/users/InviteUserDialog.tsx` — filter role options by stakeholder type.
- `src/components/stakeholder/settings/users/UserPermissionsSheet.tsx` — labels/defaults per type.
- `src/hooks/useOrgStakeholderType.ts` (new) — returns `'plantation' | 'institutional' | 'technology' | 'other'`.
- `supabase/functions/org-invite-user/index.ts` — validate role ↔ stakeholder type.

All other sections of the previously approved plan (tabbed shell, Users listing, Manage Permissions sheet, module gating, Tree Orders sub-feature enforcement, build order) are unchanged.

