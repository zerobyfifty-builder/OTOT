## Goal
On the Tourist Portal → My Trees page, insert a contribution-level layer between the Trip card and individual tree rows. Each Trip card already expands into individual trees; instead, it will expand into one row per contribution, and each contribution row will itself expand to show the existing per-tree table.

## Layout (per Trip card)

```text
Trip Card (existing)
  └── Contributions table  ← NEW middle layer
        ├── Contribution row [accordion]
        │     Columns: Contribution ID | Date | Trees Planted | Amount | Location | Planting Status | Status Dt
        │     └── Expanded: existing individual-trees table (same columns & styling)
        ├── Contribution row [accordion]
        │     └── ...
        └── ...
```

The Direct Purchase group will use the same structure.

## Data model
Trees are already loaded and carry `contribution_id`, `amount_paid`, `planting_status`, `created_at`, `num_trees`, etc. Group `group.trees` by `contribution_id` (fallback to tree id when null) — same pattern already used in `TripDetailsSheet.tsx` (`buildPaymentBatches`).

For each contribution group, compute:
- **Contribution ID** — `contribution_id` (untruncated, monospace)
- **Date** — earliest `created_at` in the group, formatted `d MMM yyyy`
- **Trees Planted** — sum of `num_trees`
- **Amount** — sum of `amount_paid`, `$` with 2 decimals
- **Location** — `Mau Forest Complex` (consistent with current per-tree row)
- **Planting Status** — reuse `getGroupStatus(contributionTrees)` + `getGroupStatusColor` to render a single Badge
- **Status Dt** — most recent `transitionDates[tree.id]` across the group (fallback to latest `created_at`)

## File changes
Single file: `src/pages/MyTrees.tsx`

1. Replace the inset block at lines ~619-698 (the current "View N individual trees" accordion) with:
   - A contributions Table inside the same inset card (`mx-4 mb-4 mt-1 rounded-xl border ...`).
   - Header row: `#`, `Contribution ID`, `Date`, `Trees`, `Amount`, `Location`, `Planting Status`, `Status Dt`, plus a chevron column.
   - Each contribution rendered as an `AccordionItem` whose trigger is the row itself (or a wrapping row that toggles the item). To keep the table semantics clean, use `Accordion type="multiple"` around the `<TableBody>` rows, where each `AccordionItem` contains a header `<TableRow>` (as `AccordionTrigger` via `asChild`) and an expanded `<TableRow>` containing a single full-width `<TableCell colSpan={9}>` with the existing individual-tree table inside `AccordionContent`.
   - The nested individual-tree table is the **exact** existing table (same headers and cell rendering: No., Contribution ID, TreeTracker, Location, County, Planted By, Planting Status, Status Date, Source) but scoped to that contribution's trees.

2. Gate the entire contributions block behind the existing `showIndividualTreesAccordion` permission (same as today).

3. No changes to data fetching, summary cards, pagination, certificate logic, or the Trip header section.

## Notes
- Keep `tabular-nums` on numeric cells.
- Keep contribution IDs untruncated and in `font-mono` (per project memory on contribution grouping).
- Badge styling reuses existing `PLANTING_STATUS_COLORS` / `getGroupStatusColor` helpers — no new tokens.
- No DB, types, or backend changes.