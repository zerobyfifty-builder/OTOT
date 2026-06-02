## Goal

Replace the five per-card date pickers and the page-top year progress bar with one global filter, and consolidate the "Kenya 15B trees — OTOT contribution", the four KPI tiles, the page-top Year progress bar, and the "Year 1 target" donut card into a single hero card.

## 1. Global Date Range Filter

Sticky bar directly under the header, above the new hero card.

- Pill-shaped trigger showing active range, e.g. `Last 30 days · May 3 – Jun 2`
- Popover with preset rail (Today, Last 7d, **Last 30d (default)**, Last 90d, This quarter, YTD, All time, Custom) + dual-month `Calendar` for custom range
- Default: **Last 30 days**, persisted to `localStorage` key `owner-dashboard-range`
- Chart bodies fade/skeleton briefly on range change for visual feedback

Applies to:
- 4 KPI summary tiles (Trees Planted, CO₂ Offset, Tourist Contributors, Community Members)
- Trees Planted (renamed from "Monthly Planting")
- Trees by Status
- Forest Beat Performance
- Species Planted
- Nursery/CBO seedlings supply

Does **not** apply to (always full-period / yearly):
- Kenya 15B contribution progress
- Year 1 annual target & donut
- Year-to-date progress bar

Each affected card title gets a muted subtitle showing the active range so context is preserved.

## 2. Consolidated "National Mission" Hero Card

Replace Section 1 (KPI grid) + Section 2 (15B card + Year 1 donut card) + the top-of-page Year progress bar with **one** card laid out as:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Kenya 15 billion trees — OTOT contribution        [export]          │
│ Tracking MFC-ICLIP impact toward Kenya's national mission · 2032    │
│                                                                      │
│  ┌─ KPI tiles (filtered) ───────────────────────────┐  ┌─ Donut ─┐ │
│  │ Trees Planted │ CO₂ │ Tourists │ Community       │  │  42.1%  │ │
│  └──────────────────────────────────────────────────┘  │ of Y1   │ │
│                                                         └─────────┘ │
│  Year progress  ████████░░░░░  155 / 365 days                       │
│  OTOT → 15B     ░░░░░░░░░░░░  12,340 of 15,000,000,000              │
│  Year 1 target  ████░░░░░░░░  12,340 of 50,000 · 24.7%              │
│  MFC-ICLIP zone ██░░░░░░░░░░  12,340 of 500,000                     │
│                                                                      │
│  Y1 stats row: Planted · Target · Remaining · Days left · Need/day  │
│  [SDG 13] [SDG 15] [Baku] [15B] [Glasgow]                           │
└──────────────────────────────────────────────────────────────────────┘
```

- Year-1 donut moves into the right column of this card
- Year progress bar moves inside this card (drops from page header)
- Year-1 stats row collapses into a compact horizontal strip under the donut
- KPI tiles keep their pastel ByeWind tints

## 3. Technical Outline

- `src/components/owner/dashboard/GlobalDateRangeFilter.tsx` — new pill trigger + popover with presets and custom calendar
- `src/components/owner/dashboard/useDashboardDateRange.ts` — new hook backed by `localStorage`, exposes `{ from, to, preset, setRange }`
- `src/pages/owner/OwnerDashboard.tsx`:
  - Remove `chartRange`, `speciesRange`, `beatRange`, `nurseryRange` local state; all five cards consume the global hook
  - Remove the four `ChartDateRangePicker` instances in those cards (keep `ExportButton` next to titles)
  - Rename card title "Monthly Planting" → "Trees Planted"
  - KPI tile values (`planted`, `co2Tonnes`, `uniqueTourists`, `communityMembers`) become memos filtered by global range
  - Build new `NationalMissionHero` block that fuses current Sections 1 + 2 and absorbs the top Year progress bar
  - Delete the standalone Year progress bar block (lines ~569-576) and the two-card grid (lines ~622-706)
- Comparison mode: not implemented now

## 4. Out of scope

- Comparison ("vs previous period")
- Changes to InstitutionalDashboard or non-listed cards
- Backend / query shape changes — filtering stays client-side using existing data
