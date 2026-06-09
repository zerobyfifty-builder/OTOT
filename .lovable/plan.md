
# Liquid Glass — Tourist Portal

Goal: introduce a cohesive glassmorphism layer across the tourist-facing screens only (Dashboard, My Trips, My Trees, My Impact, Carbon Calculator, Pledge pages, Profile). Other portals (admin, owner, institutional, lodge, agent, plantation) stay untouched.

## Palette & tokens

Reuse the existing tourist palette — no recoloring of the brand:

- Teal-green accent: existing `--primary` (soft green) and `--accent` (forest green) — replaces the prompt's `#4CAF50 / #2E7D32`.
- Neutrals: white, slate-grey, near-black — already present in `index.css`.
- Sidebar stays dark (existing `--sidebar-background` near-black).
- Page content stays light (white/grey).

New semantic tokens added to `src/index.css` (tourist-scoped via a `.tourist-glass` wrapper class so other portals are unaffected):

```
--glass-bg-light:        hsl(0 0% 100% / 0.55)
--glass-bg-light-strong: hsl(0 0% 100% / 0.72)
--glass-bg-dark:         hsl(0 0% 9% / 0.55)
--glass-border:          hsl(0 0% 100% / 0.18)
--glass-border-dark:     hsl(0 0% 100% / 0.08)
--glass-highlight:       hsl(142 70% 70% / 0.35)   /* teal-green glow */
--glass-shadow:          0 8px 32px hsl(0 0% 0% / 0.12)
--glass-shadow-dark:     0 8px 32px hsl(0 0% 0% / 0.45)
--glass-blur:            16px
```

Plus utility classes in `@layer components`:
- `.glass-surface` — light frosted card (bg + blur + border + shadow)
- `.glass-surface-strong` — for modals/sheets (less translucency for readability)
- `.glass-surface-dark` — for sidebar
- `.glass-pill-active` — active nav item highlight
- `.glass-ripple` — click ripple animation
- `.leaf-bg` — fixed faint leaf silhouette SVG background

## Scope (tourist portal only)

Sidebar dark, pages light — applied to these surfaces:

1. **Sidebar** (`src/components/AppSidebar.tsx`)
   - Dark translucent background with backdrop-blur over a subtle gradient.
   - Active item: glass pill with teal-green glow.
   - Hover: soft green glow + slight scale (1.02) + subtle inner highlight; no vines/leaves on hover (moderate option).
   - Click ripple on menu buttons.
   - Footer profile section keeps existing layout, gets a glass divider.

2. **Top header bar** — tourist pages currently use page-level headers (no shared topbar component). Plan: keep per-page headers but apply `.glass-surface` + `sticky top-0` on the header rows of `Dashboard.tsx`, `MyTrips.tsx`, `MyTrees.tsx`, `MyImpact.tsx`, `CarbonCalculator.tsx`, `Profile.tsx`. KTB logo placement preserved.

3. **Page cards & panels**
   - `StatsCard`, `ActionCard`, `ClimateActionCard`, `EducationalCard`, `RecentTrips`, `RecentContributions`, `PledgeCarousel`, `FAQAccordion` — swap `bg-card`/`bg-white` for `.glass-surface` while keeping current borders/radii.
   - `MyTrees` contribution accordion rows: apply `.glass-surface` to the outer container (replaces current `bg-muted/50`), keep the existing left accent bar.

4. **Dialogs & sheets**
   - Extend the shadcn `dialog.tsx`, `sheet.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `popover.tsx` content classes with a `.glass-surface-strong` variant. Apply only inside the tourist `.tourist-glass` wrapper so admin/owner/etc. dialogs are unaffected.
   - Overlay darkening reduced slightly to let the blur show through.

5. **Background depth**
   - Add `.leaf-bg` fixed layer (very low opacity, ~6%) behind the main tourist content area — faint leaf silhouettes SVG, no animation, purely decorative.

## Nature animations (moderate set)

Enabled:
- Soft teal-green glow on hover (box-shadow transition, 200ms).
- Slight scale (1.01–1.02) + opacity lift on interactive glass surfaces.
- Water-like ripple on click for sidebar nav + primary buttons (`::after` pseudo-element, expanding radial gradient, 500ms).
- Faint leaf silhouette background behind page content.

Skipped (per the chosen option):
- Growing/sliding leaves on hover.
- Vines wrapping buttons.
- Floating particle background.

## Wrapper strategy (isolation)

Add a `tourist-glass` class on the tourist layout root so glass styles never leak into other portals:

- Wrap the tourist route shell (the layout used by `/dashboard`, `/my-trips`, `/my-trees`, `/my-impact`, `/carbon-calculator`, `/profile`, `/pledge*`, `/tree-purchase`) with `<div className="tourist-glass min-h-screen">…</div>`.
- All new utility classes are written as `.tourist-glass .glass-surface { … }` so admin/owner/institutional/lodge/agent/plantation portals render unchanged.

## File changes

New:
- `src/styles/glass.css` — tokens + `.glass-*` utilities + `.leaf-bg` + ripple keyframes (imported from `index.css`).
- `src/assets/leaf-silhouette.svg` — faint decorative pattern.

Edited:
- `src/index.css` — import `glass.css`, add tourist-scoped tokens.
- `src/components/AppSidebar.tsx` — apply dark glass classes, active pill, hover glow, ripple.
- Tourist layout root in `src/App.tsx` (or wherever tourist routes are grouped) — add `tourist-glass` wrapper. If routes aren't grouped under one layout, add the class on each tourist page's outermost div.
- Tourist page files (`Dashboard.tsx`, `MyTrips.tsx`, `MyTrees.tsx`, `MyImpact.tsx`, `CarbonCalculator.tsx`, `Profile.tsx`, `Pledge.tsx`, `PledgeB.tsx`, `PledgeC.tsx`, `TreePurchase.tsx`) — swap solid card backgrounds for `glass-surface`, make headers sticky-glass.
- Tourist dashboard subcomponents listed above — same swap.

Not touched:
- Admin sidebar, owner sidebar, agent sidebar, lodge sidebar, institutional sidebar, plantation pages.
- Tailwind config (we lean on CSS variables + utility classes; no token renames).
- shadcn primitives' base files — we layer overrides via the `.tourist-glass` scope rather than editing `dialog.tsx` etc. directly (keeps the additive-development rule intact).

## Accessibility & performance

- Maintain WCAG AA contrast: text on light glass uses existing `foreground`, on dark glass uses `sidebar-foreground`. Strong surfaces (≥0.7 opacity) used wherever long-form text appears (dialogs, sheets, modals).
- `prefers-reduced-motion`: disables ripple, scale, and glow transitions.
- `backdrop-filter` has a solid fallback color for browsers without support (`@supports not (backdrop-filter: blur())`).
- Apply blur only on fixed/sticky surfaces and cards-above-fold to limit GPU cost; large list rows keep solid `glass-surface` without per-row blur.

## Out of scope

- Functional changes to any tourist flow.
- Restyling buttons globally (Button variants stay as-is; glass affects containers, not individual buttons).
- Dark mode of the tourist portal (current portal is light-only; this plan preserves that).
