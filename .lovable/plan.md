

## Plan: Dynamic Module Assignment with Access Types and Granular Permissions

### Status: ✅ Implemented

### What Was Done

**1. Database: `access_type` column on `modules` table**
- Added `access_type TEXT NOT NULL DEFAULT 'shared'` column
- `travel_agents` set to `scoped`, `tree_orders` set to `shared`

**2. Database: `stakeholder_has_module_permission()` function**
- Security definer function checking module assignment + specific permission in JSONB array

**3. Database: Backfilled existing `organization_modules` permissions**
- Scoped modules → `["read", "write", "edit", "delete"]`
- Shared modules → `["read"]`

**4. New hook: `useModulePermissions(moduleName)`**
- Returns `{ isEnabled, hasRead, hasWrite, hasEdit, hasDelete, accessType, isLoading }`
- Used in stakeholder pages to conditionally show/hide controls

**5. Enhanced Admin UI: `StakeholderModules.tsx`**
- Each module row shows access type badge (Shared / Own data)
- When module is enabled, shows permission letters (R, W, E, D) with gear icon
- Clicking gear opens popover with checkboxes for Read, Write, Edit, Delete
- Default permissions applied on toggle ON based on access type

**6. Permission-aware stakeholder pages**
- `StakeholderOrders.tsx`: Bulk update bar and per-tree status dropdowns hidden without `edit` permission; read-only badge shown instead
- `InstitutionalTravelAgents.tsx`: "Add Travel Agent" button hidden without `write`; Edit/Deactivate buttons hidden without `edit`
