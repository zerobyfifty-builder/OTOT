## Goal

Remove the Planting Costs tab from owner settings (both Plantation partner and KTB views) and let the Super Admin create new planting cost submissions directly from the existing Planting Costs Configuration page. The rest of the approval/configure/publish flow stays as-is.

## Changes

### 1. Owner Settings — remove Planting Costs tab
File: `src/pages/owner/OwnerSettings.tsx`
- Remove the `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` wrapper and drop the `planting-costs` tab entirely. Render the account content directly.
- Remove imports of `PlantingCostsTab`, `PlantingCostsKTBTab`, and the `Tabs` components.
- Drop the `ownerType` detection logic that was only used to switch between the two planting-costs variants.
- Leave the existing tab files (`PlantingCostsTab.tsx`, `PlantingCostsKTBTab.tsx`) in place but unused — they're not referenced elsewhere and can be cleaned up later.

### 2. Super Admin — add "New Planting Costs" entry point
File: `src/pages/admin/PlantingCostsConfig.tsx`
- Add an "Add new planting costs" button in the page header (right side, next to the title).
- Clicking it opens a new `AddPlantingCostsSheet` component (slider sheet on the right).

### 3. New component: `AddPlantingCostsSheet`
New file: `src/components/admin/AddPlantingCostsSheet.tsx`
- Replicates the cost-input slider sheet from `PlantingCostsTab` (the 7 `COST_FIELDS` inputs, KES → USD helper, total, Submit button).
- On submit, inserts a row into `planting_cost_submissions`:
  - `submitted_by`: current super admin user id
  - `owner_org`: `'KTB Admin'` (single value used for all admin-created submissions; this keeps history filtering simple in the review panel)
  - `status`: `'pending_review'` (the admin can immediately select it in the left review panel and run through the existing approve/configure/publish steps)
  - cost fields + `total_cost_kes`
- After insert, invalidate `['all-planting-submissions']` so the review panel shows the new entry, close the sheet, and toast success.
- No notification rows are created (no plantation/KTB partner is involved anymore).

### 4. Review panel — auto-select new submission (small polish)
File: `src/components/admin/PlantingCostsReviewPanel.tsx`
- After a new submission is created, the admin should still click it manually; no changes required unless we want to auto-select. Skip for now to keep scope tight.

## Out of scope
- No database schema changes — existing `planting_cost_submissions` / `planting_cost_configs` tables are reused.
- No removal of the `PlantingCostsTab`/`PlantingCostsKTBTab` files (kept dormant in case rollback is needed).
- No change to the approval, species selection, fee finalization, or publish flow on the admin side.

## Technical notes
- The existing review-panel query filters by status across all `owner_org` values, so admin-created rows will appear naturally.
- Using a fixed `owner_org = 'KTB Admin'` avoids null-handling and keeps the history list label meaningful in the review panel.
