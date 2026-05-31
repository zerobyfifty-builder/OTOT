## Goal

In the Planting Overview, distinguish the two planter roles per status and make "Planted By" editable with auto-sync back to the Assigned status so data stays uniform.

## Changes

### 1. `src/pages/owner/OwnerOrders.tsx` — Planting Overview accordion (both occurrences ~L1913 and ~L2821)

- Stop hard-coding `assigned_to_name: 'Planting Team Lead'` in `friendlyLabels`. Resolve the label per status while rendering each entry:
  - status === `assigned` → "Planter"
  - status === `planting_scheduled` → "Planting Team Lead"
  - For `planter_name` shown inside `sapling_planted` → "Planted By"
- No other label changes.

### 2. `src/components/trees/StatusTransitionPanel.tsx` — Status transition form

- `case "assigned"`: rename the planter dropdown label from "Assigned to" to **"Planter"**.
- `case "planting_scheduled"`: keep **"Planting Team Lead"** (no change).
- `case "sapling_planted"` — replace the simple `renderPlanterSelect("planted_by", "Planted By")` with a new field:
  - Default value pre-filled from the existing `assignedPlanterData` query (already fetches `planterId` + `planterName` from the most recent `assigned` transition).
  - Render a read-only `Input` showing the planter name + a small pencil (`Pencil` from lucide-react) toggle button on the right.
  - Clicking the pencil flips state `editingPlantedBy` to true, swapping the read-only input for the planter `Select` dropdown (same list as `renderPlanterSelect`). Selecting a value writes to `formData.planted_by` and `formData.planted_by_name` and flips back to the read-only display.
  - Validation in `validate()` for `sapling_planted` keeps requiring `planted_by`.

### 3. Back-sync to Assigned transition on save

In `StatusTransitionPanel.handleSave` (where `fullData` is built), when `request.toStatus === "sapling_planted"`, add `fullData.planter_changed_from_assigned` boolean + `fullData.original_assigned_planter_id` so the caller can detect a change. (Keep using existing `planter_name` enrichment too.)

In `src/pages/owner/OwnerOrders.tsx` `onConfirm` (~L1818): after inserting the new transition record, when `req.toStatus === "sapling_planted"` and `transitionData.planted_by` differs from the assigned transition's `assigned_to`, update the most recent `assigned` transition row for **each** tree in `req.treeIds`:

```text
for each treeId:
  fetch latest tree_status_transitions where tree_id = treeId and to_status = 'assigned'
  if row.transition_data.assigned_to !== transitionData.planted_by:
    merge {
      assigned_to: <new planter id>,
      assigned_to_name: <new planter name>,
      planter_name: <new planter name>,
    } into transition_data and update the row
```

This keeps the Planter shown under Assigned status identical to the (possibly last-minute changed) Planted By recorded at Sapling Planted, so the data is uniform across the app.

## Out of scope

- No DB schema changes (transition data lives in existing `tree_status_transitions.transition_data` JSONB).
- No changes to other status panels, no other label tweaks.
