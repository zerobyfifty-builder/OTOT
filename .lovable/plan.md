## Status

✅ **Database migration already approved and applied** (this step is done):
- Table `stakeholder_disbursements` → `owner_disbursements`
- Columns `stakeholder_org_id` → `owner_org_id` on trees, nurseries, planting_records, community_impact, owner_disbursements
- Columns `stakeholder_org` → `owner_org` (planting_cost_submissions), `stakeholder_type` → `owner_type` (org_job_role_defaults)
- Values `'stakeholder'` → `'owner'` in roles, organizations.category, partner_types.category, notifications.recipient_type (+ all CHECK constraints updated)
- Functions renamed: `is_stakeholder` → `is_owner`, `stakeholder_has_module` → `owner_has_module`, `stakeholder_has_module_permission` → `owner_has_module_permission`, `notify_stakeholder_allocation` → `notify_owner_allocation`
- Triggers renamed; all ~45 RLS policies recreated against new names

The three sub-types (Institutional, Plantation, Technology) and all other roles (admin, super_admin, lodge, tourist, institutional_partner, business_partner, travel_agent) are unchanged.

## What remains to implement

### 1. Edge function
- Rename folder `supabase/functions/create-stakeholder-user/` → `create-owner-user/`
- Update the function body (table refs are unchanged; only literal strings/role lookups need `'owner'`)
- Update all frontend callers of `supabase.functions.invoke('create-stakeholder-user', …)` → `'create-owner-user'`
- Delete the old function from Supabase

### 2. Frontend folders & files
Rename (preserving git history via `git mv`):
- `src/components/stakeholder/` → `src/components/owner/`
- `src/pages/stakeholder/` → `src/pages/owner/`
- Files: `Stakeholder*.tsx`, `StakeholderSidebar.tsx`, `useOrgStakeholderType.ts` → `useOrgOwnerType.ts`, `useStakeholder*.ts` → `useOwner*.ts`, etc.
- Update every import path

### 3. Routes (no legacy redirects — per your direction)
In `src/App.tsx`:
- `/stakeholder/*` → `/owner/*`
- `/admin/stakeholders` → `/admin/owners`
- `/admin/stakeholders/:id` → `/admin/owners/:id`
- Update every `navigate(...)`, `<Link to=...>`, and `<Navigate to=...>` site-wide

### 4. Code identifiers (find/replace, case-preserving)
- `stakeholder_org_id` → `owner_org_id` (all Supabase queries in src/)
- `stakeholder_disbursements` table refs → `owner_disbursements`
- `is_stakeholder` RPC → `is_owner`; same for `stakeholder_has_module*` → `owner_has_module*`
- Hooks/types/vars: `stakeholderType` → `ownerType`, `useStakeholder…` → `useOwner…`, `isStakeholder` → `isOwner`
- Role checks comparing to `'stakeholder'` string → `'owner'`
- `recipient_type === 'stakeholder'` → `'owner'`
- `category === 'stakeholder'` → `'owner'`

### 5. UI copy (every visible string)
"Stakeholder" → "Owner", "Stakeholders" → "Owners", "stakeholder" → "owner" in:
- Page titles, breadcrumbs, headings, sidebar labels, dialog titles, tooltips, toasts, alt text, empty states, table headers, button labels, descriptions, helper text, placeholders
- Activity log message templates
- PDF/CSV export labels
- Modules registry (`StakeholderModules.tsx` → `OwnerModules.tsx`), permission sheets, settings pages
- Admin pages, owner portal pages, institutional pages that mention stakeholders

### 6. Memory & docs
- Update `mem://index.md` core rule about "stakeholder" terminology
- Rename memory files referencing stakeholder (`mem://stakeholder/*`, `mem://ui/stakeholder-management-actions`, `mem://features/stakeholder-portal-ui`, `mem://style/stakeholder-financial-ui-standards`, `mem://arch/stakeholder-role-logic`) → `mem://owner/*` equivalents and update index links

### 7. Verify
- `rg -i 'stakeholder' src supabase` must return **zero hits** (except types.ts which Supabase auto-regenerates after migration — already done)
- Build passes
- Spot-check: sidebar shows "Owners", `/owner/dashboard` loads, admin "Owner Modules" page works, user-permissions sheet works, allocation trigger fires on tree insert

## Technical notes
- Supabase's `src/integrations/supabase/types.ts` regenerated automatically after the DB migration — no manual edit needed
- Edge function changes auto-deploy
- No data loss; FK constraints preserved (renamed columns keep their constraints)
- Roles row updated in-place: existing users with role_id pointing at the old row keep their access (the row is the same id, only `name`/`display_name`/`role_category` changed)

## Out of scope (intentionally unchanged)
- Sub-type names ("Plantation Partner", "Institutional Partner", "Technology Partner") — these are owner sub-types, not the word "stakeholder"
- Other roles (admin, super_admin, lodge, tourist, institutional_partner, business_partner, travel_agent)
- Historical activity log rows already written with the word "stakeholder" — left as-is (audit trail)
- Old `/stakeholder/*` URL redirects — **not added**, per your instruction
