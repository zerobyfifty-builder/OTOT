

## Impact Insights — Final Plan

A unified, story-driven dashboard aggregating **live data** from `carbon_metrics_logs`, `ecosystem_impact_logs`, `community_impact_logs`, and existing `community_impact` reports — surfaced via the Tree Orders action sliders.

### Confirmed decisions
1. **Module gating** — assignable via Admin → Module Assignment (gated by `assignedModules.includes('impact_insights')`). Seed row in `modules` table.
2. **Scope** — org-wide aggregation across all the org's contributions (no per-contribution filter in v1).
3. **Stories** — include **all** logs across the three tables (no curation filter).
4. **Export** — both **CSV** and branded **PDF** at launch.

### Page layout (`/stakeholder/impact-insights`)

```text
┌─────────────────────────────────────────────────────────────┐
│  Impact Insights                  [Period ▾] [CSV] [PDF]    │
│  "Every tree tells a story"                          [KTB]  │
├─────────────────────────────────────────────────────────────┤
│  HERO — 4 animated count-ups                                 │
│  Trees Planted │ CO₂ Offset │ Lives Touched │ Biodiversity   │
├─────────────────────────────────────────────────────────────┤
│  TABS:  Overview │ Carbon │ Ecosystem │ Community │ Stories  │
└─────────────────────────────────────────────────────────────┘
```

### Tabs
- **Overview** — 3 mini-cards (Carbon / Ecosystem / Community) with sparklines + combined logs/month trend + latest 5 highlights.
- **Carbon** — Estimated vs actual CO₂ bar, calculation-method donut, per-contribution leaderboard, photo grid.
- **Ecosystem** — Biodiversity gauge, soil/water tag cloud, log timeline, photo grid.
- **Community** — Stacked bar (jobs / families / women / youth), nursery income trend (KES), participants, plus existing periodic `community_impact` reports.
- **Stories** — Pinterest-style masonry of every log as a narrative card (photo, contribution badge, metric callout, notes, recorded_by).

### Design
- White cards, muted background (per `style/plantation-dashboard-identity`)
- `useCountUp` for KPIs, Recharts for visualisations
- `tabular-nums`; KES integers, USD 2dp
- Period pill (7d / 30d / 90d / All)
- KTB logo top-right; no decorative icons in tables

### Files
**New**
- `src/pages/stakeholder/StakeholderImpactInsights.tsx`
- `src/hooks/useImpactInsights.ts` — org-scoped aggregation
- `src/components/stakeholder/impact-insights/HeroKpis.tsx`
- `…/CarbonTab.tsx`, `…/EcosystemTab.tsx`, `…/CommunityTab.tsx`, `…/StoriesFeed.tsx`
- `src/utils/impactInsightsExport.ts` — CSV + jsPDF (KTB-branded, reuses `tech/pdf-formatting-standards`)

**Edited**
- `src/App.tsx` — route `/stakeholder/impact-insights`
- `src/components/stakeholder/StakeholderSidebar.tsx` — register `impact_insights` (icon: Sparkles)

**Migration**
- Insert `impact_insights` row into `modules` table so admins can assign it (no schema changes; reads existing log tables).

### Build order
1. Seed `impact_insights` module + sidebar/route registration (gating ready)
2. `useImpactInsights` data hook
3. Hero + Overview tab
4. Carbon / Ecosystem / Community tabs
5. Stories feed
6. CSV + branded PDF export

