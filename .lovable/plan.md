# Dashboard Glassmorphism — Tourist Portal Only

Apply the four glassmorphism principles (subtle transparency, contrasting colors, layering, shadows/highlights) to `src/pages/Dashboard.tsx` only — keeping the existing tourist palette (white / grey / black / teal-green), not the dark-blue/cyan from the reference screenshot. Strictly additive: no existing component is rewritten.

## What changes visually

- Soft aurora backdrop behind the dashboard: large, blurred teal + emerald + soft-grey radial blobs that drift slowly, plus the existing faint leaf silhouette pattern from `glass.css`. Solid card surfaces around the page sit on top of this layer.
- Stats cards, Climate Action cards, Pledge card, Recent Trips card and the featured "Plant Your First Tree" panel adopt a frosted surface: ~78–88% white, `backdrop-filter: blur(16–20px) saturate(170%)`, 1px hairline border (`hsl(220 13% 88% / 0.7)`), inner top highlight (`inset 0 1px 0 hsl(0 0% 100% / 0.7)`), soft drop shadow.
- Layering depth: cards get a subtle hover lift (translateY -2px, shadow deepens) and a thin teal ring on hover/focus to echo the sidebar accent. The featured CTA section gets a second, stronger glass layer with a teal→emerald gradient sheen.
- Contrast preserved: text continues to use `--foreground` / `--muted-foreground` tokens. Card opacity stays ≥0.78 so AA contrast holds; numbers retain `tabular-nums`.
- KTB logo header and existing layout untouched (Branding rule).

## How it's implemented (additive)

1. **New CSS file** `src/styles/glass-dashboard.css`, imported once from `src/index.css`. All rules scoped under `.tourist-dashboard-glass` so no other page is affected. Contains:
   - `.tourist-dashboard-glass` aurora backdrop (three fixed, blurred radial gradients in teal/emerald/cool-grey at low opacity), behind everything via `::before` / `::after` pseudo-elements with `z-index: 0`.
   - `.tourist-dashboard-glass .glass-card` — frosted surface tokens, hover lift, focus ring.
   - `.tourist-dashboard-glass .glass-card--featured` — slightly stronger blur + teal gradient sheen for the hero CTA section.
   - `prefers-reduced-motion`: disables blob drift; `@supports not (backdrop-filter)` fallback bumps card opacity to 0.96 so it stays legible.

2. **`src/pages/Dashboard.tsx`** — minimal class additions only:
   - Add `tourist-dashboard-glass` to the existing outer wrapper `div` (line 335).
   - Add `glass-card` to the existing `<Card>` elements already on the page (Pledge card, Recent Trips, etc.) without changing their props or children.
   - Add `glass-card--featured` to the featured "Plant Your First Tree" `<section>`.
   - No changes to `StatsCard` / `ClimateActionCard` components themselves — they already pick up the `.tourist-glass [class*="bg-card"]` rule from `glass.css`, and the new wrapper just adds the aurora behind them.

3. **No changes** to: routing, data fetching, business logic, other pages, sidebar, header, or any shared component. `glass.css` is not modified.

## Technical notes

- Performance: backdrop-filter on ~8 cards is within typical budget; blobs are 3 fixed elements, GPU-composited, `will-change: transform`.
- Accessibility: contrast verified against existing `--foreground` token (≥4.5:1 on 0.82-alpha white over the aurora). All interactive elements keep their existing focus styles.
- Scope guard: every selector in the new CSS file is prefixed with `.tourist-dashboard-glass`, so admin/owner/lodge/agent/institutional dashboards are untouched.

```text
src/
├─ index.css                       (+1 line: @import glass-dashboard.css)
├─ styles/
│  └─ glass-dashboard.css          (NEW)
└─ pages/
   └─ Dashboard.tsx                (className additions only)
```
