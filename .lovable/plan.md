

## Plan: Add "Institutional Partner" Stakeholder Type and Travel Agent Module for Stakeholders

### Summary
Add a new stakeholder type called "Institutional Partner" so that entities like KTB can be onboarded as stakeholders. Make the "Travel Agents" module available for assignment to any stakeholder via the existing Module Assignment page. Keep the current KTB institutional partner portal untouched.

### What Changes

**1. Database: Add "Institutional Partner" partner type for stakeholders**
- Insert a new row into `partner_types` with `category: 'stakeholder'`, `name: 'Institutional Partner'`, `description: 'Institutional oversight and regulatory partner'`.

**2. Database: Add "Travel Agents" module to the modules table**
- Insert a new module row: `name: 'travel_agents'`, `display_name: 'Travel Agents'`, `category: 'operations'`, `route: '/travel-agents'`, `is_active: true`.
- This makes it available in the StakeholderModules page for toggle-based assignment to any stakeholder.

**3. Fix StakeholderModules page cache invalidation**
- Currently the `toggleModule` function does not invalidate the React Query cache after toggling, so switches don't reflect changes until page reload. Add `queryClient.invalidateQueries({ queryKey: ["orgModules"] })` after each toggle.

**4. No changes to the Partners module or KTB institutional portal**
- The existing KTB setup under Partners remains untouched as requested.

### Technical Details

- **Migration 1**: `INSERT INTO partner_types` for the new "Institutional Partner" stakeholder type.
- **Migration 2**: `INSERT INTO modules` for the "Travel Agents" module.
- **Code change**: `src/pages/admin/StakeholderModules.tsx` -- add `useQueryClient` and call `invalidateQueries` in `toggleModule` to fix the switch reactivity.

The StakeholderModules page already shows ALL modules from the `modules` table with toggles per stakeholder. Once the "Travel Agents" module is inserted, it will automatically appear on that page for assignment. The new "Institutional Partner" type will appear in the Create Stakeholder wizard's type dropdown.

