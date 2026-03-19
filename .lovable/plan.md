

## Plan: Group Trees by Trip with Accordion on My Trees Page

### Problem
Currently, My Trees shows a flat list of individual tree rows. When a user purchases 19 trees for a trip, they see 19 separate rows — making it hard to track total plantings per trip.

### Solution
Group trees by `trip_id` and display a summary row per trip (similar to My Trips page), with an accordion that expands to reveal individual tree rows.

### Design

```text
┌─────────────────────────────────────────────────────────┐
│ Summary Stats Cards (unchanged)                         │
├─────────────────────────────────────────────────────────┤
│ ▶ Trip OT-0001 │ NBO → LHR │ 19 trees │ $285 │ Status │
│   ┌─────────────────────────────────────────────────┐   │
│   │ (hidden until clicked)                          │   │
│   │  1. OTOT-ABC  │ Mau │ Nakuru │ Status │ Date   │   │
│   │  2. OTOT-DEF  │ Mau │ Nakuru │ Status │ Date   │   │
│   │  ...                                            │   │
│   └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ ▶ Direct Purchase │ 3 trees │ $45 │ Status             │
│   (trees without a trip, grouped together)              │
└─────────────────────────────────────────────────────────┘
```

### Changes — Single file: `src/pages/MyTrees.tsx`

1. **Group trees by `trip_id`** after fetching — create an array of `{ tripId, trip, trees[], totalTrees, totalAmount }` objects. Trees with no `trip_id` grouped under a "Direct Purchase" bucket.

2. **Replace the flat table** with grouped accordion rows:
   - Each group shows a clickable summary row: Trip ID, route (origin → destination), total trees, total amount paid, planting status summary, date
   - Clicking expands an accordion to reveal the existing individual tree table rows underneath
   - Use the existing `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent` components from `src/components/ui/accordion.tsx`

3. **Pagination** shifts from per-tree to per-group (each trip group = 1 item).

4. **Keep all existing functionality** — TreeDetailPanel, TripDetailsSheet, tree click handlers all remain intact within the expanded rows.

