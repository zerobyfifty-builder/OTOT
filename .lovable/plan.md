

## Plan: Dynamic Module Assignment with Access Types and Granular Permissions

### Problem
Currently, module assignment is a simple on/off toggle. But modules have fundamentally different behaviors:
- **Travel Agents**: Each stakeholder manages their own agents (scoped to their org). They need sub-account creation rights.
- **Tree Orders**: Data is shared platform-wide. Some stakeholders should only view, others should be able to edit planting status.

The system needs to distinguish between these access patterns and support granular permissions.

### Design

Two key concepts to add:

**1. Module Access Type** (stored on the `modules` table):
- `shared` -- All data visible to any stakeholder with this module (e.g., Tree Orders)
- `scoped` -- Data is filtered to the stakeholder's own organization (e.g., Travel Agents)

**2. Granular Permissions** (stored on `organization_modules.permissions`):
- The `permissions` JSONB column already exists but is unused. We populate it with: `["read", "write", "edit", "delete"]` as appropriate per assignment.
- Default permissions differ by access type: shared modules default to `["read"]`, scoped modules default to `["read", "write", "edit", "delete"]`.

### What Changes

**1. Database: Add `access_type` column to `modules` table**
- Add column `access_type TEXT NOT NULL DEFAULT 'shared'` to `modules`.
- Update existing modules: set `travel_agents` to `scoped`, `tree_orders` to `shared`.

**2. Admin UI: Enhanced StakeholderModules page**
- Replace the simple Switch toggle with a more informative control:
  - When toggling ON a module, show a small popover or inline permission selector with checkboxes for `Read`, `Write`, `Edit`, `Delete`.
  - Display a badge showing current permissions (e.g., "R" or "RWED") next to each enabled module.
  - Show the module's access type as a subtle label ("Shared data" / "Own data") in the module row.
- When toggling OFF, remove the `organization_modules` row as before.

**3. Code: Use permissions in stakeholder pages**
- Create a `useModulePermissions(moduleName)` hook that returns `{ hasRead, hasWrite, hasEdit, hasDelete, accessType, isEnabled }`.
- **StakeholderOrders.tsx**: Use the hook to conditionally show/hide edit controls (status dropdowns, update buttons) based on whether the stakeholder has `edit` permission.
- **StakeholderTravelAgents.tsx** (scoped module): Already scoped by org via RLS. Use the hook to hide "Create Agent" button if no `write` permission, hide edit actions if no `edit` permission.

**4. Database: Update RLS policies for permission-aware access**
- Create a new function `stakeholder_has_module_permission(_user_id, _module_name, _permission)` that checks both module assignment AND the specific permission in the JSONB array.
- Update the tree orders RLS policies: the existing SELECT policy stays (read), but UPDATE policy should check for `edit` permission.

### Technical Details

**Migration SQL:**
```sql
ALTER TABLE public.modules ADD COLUMN access_type TEXT NOT NULL DEFAULT 'shared';
UPDATE public.modules SET access_type = 'scoped' WHERE name = 'travel_agents';
UPDATE public.modules SET access_type = 'shared' WHERE name = 'tree_orders';

CREATE OR REPLACE FUNCTION public.stakeholder_has_module_permission(
  _user_id uuid, _module_name text, _permission text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.organization_modules om ON om.organization_id = u.organization_id
    JOIN public.modules m ON m.id = om.module_id
    WHERE u.user_id = _user_id
      AND m.name = _module_name
      AND om.is_active = true
      AND m.is_active = true
      AND om.permissions @> to_jsonb(_permission)
  )
$$;
```

**New hook** `src/hooks/useModulePermissions.ts`:
- Fetches from `organization_modules` joined with `modules` for the current user's org.
- Returns permission booleans and access type for a given module name.

**Admin UI changes** in `StakeholderModules.tsx`:
- Each cell becomes: toggle + permission checkboxes (shown when enabled).
- Module rows show access type badge.
- On toggle ON: insert with default permissions based on access type.
- On permission change: update the `permissions` JSONB column.

### Files to Create/Modify
- **New migration**: Add `access_type` column, create `stakeholder_has_module_permission` function, update RLS
- **New file**: `src/hooks/useModulePermissions.ts`
- **Modified**: `src/pages/admin/StakeholderModules.tsx` (enhanced UI with permissions)
- **Modified**: `src/pages/stakeholder/StakeholderOrders.tsx` (permission-aware controls)
- **Modified**: `src/pages/institutional/InstitutionalTravelAgents.tsx` (permission-aware controls for stakeholder usage)

