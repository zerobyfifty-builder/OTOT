
## Goal
Visually redesign `/owner/dashboard` to match the ByeWind reference (pastel KPI tiles, soft rounded cards, refined typography, light/dark parity, subtle animations) while keeping every existing metric, data source, and interaction intact.

## Scope
- Single page: `src/pages/owner/OwnerDashboard.tsx` (Plantation Owner org)
- No data/query/business-logic changes — purely presentational
- Keep all current sections (KPIs, charts, alerts, status breakdowns, recent activity, etc.) — just re-skin and re-layout into the ByeWind language

## Design language to apply
- **KPI tiles** (top row): four pastel-tinted rounded cards (≈`rounded-2xl`), large tabular-num value, small label above, delta chip with up/down arrow inline. Rotating pastel tints (lilac, sky, lavender, mint) — mapped to existing semantic tokens, not raw hex.
- **Main chart card**: soft white/elevated surface, segmented tabs (`Total Trees / Planted / Verified`), inline legend dots, smooth area+dashed comparison line, hover crosshair with a value bubble (like the `11,598` tooltip in the reference).
- **Side panel** next to chart: compact list with label + thin progress bar pairs (mirrors "Traffic by Website").
- **Bottom row**: bar chart card + donut card with right-aligned legend and percentages (mirrors "Traffic by Device" and "Traffic by Location").
- **Typography**: tighter weights, uppercase muted micro-labels, larger numeric display.
- **Motion**: staggered fade+rise on mount for cards, count-up on numbers (already have `useCountUp`), animated bar/area draw-in, crosshair tooltip on hover.
- **Dark mode**: full parity using existing `dark:` tokens — deep neutral surfaces with same pastel accents at reduced saturation.

## Implementation approach
1. Introduce a small set of presentational subcomponents under `src/components/owner/dashboard/`:
   - `KpiTile.tsx` (pastel variant prop)
   - `DashboardCard.tsx` (shared rounded surface + header)
   - `TrendChartCard.tsx` (tabs + area chart + crosshair tooltip)
   - `BreakdownList.tsx` (label + thin bar rows)
   - `DonutCard.tsx` (donut + right legend with percentages)
2. Refactor `OwnerDashboard.tsx` to compose these — existing data hooks/queries stay untouched, only the JSX layer changes.
3. Add semantic tokens for the four pastel tints in `index.css` + `tailwind.config.ts` (HSL only) so colors are themeable.
4. Add mount stagger via simple CSS `animate-fade-in` utility classes (already in project) with incremental delays.

## Out of scope
- Sidebar redesign, notifications panel, contacts panel from the reference (the reference has 3-column shell; project already has its own sidebar — keep it). Only the **main content area** is redesigned.
- Other org dashboards (Institutional, Lodge, Admin) — only Plantation Owner.
- Data model, queries, RLS, routes.

## Acceptance
- Every metric/section present today is still present
- Light + dark both polished
- Numbers count up, cards stagger in, chart line draws in
- No console errors, no query changes
