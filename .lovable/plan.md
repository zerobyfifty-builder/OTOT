
# Tourist Portal — Glassmorphism Redo (AgrixAI Reference)

Scrap the current dark-forest glass theme and rebuild to **exactly match the AgrixAI reference**: soft teal-green atmospheric background, large rounded glass cards with thin bright borders, lime-green primary accent, amber/yellow secondary accent, generous spacing, oversized rounded corners.

## 1. Reset the design tokens (`src/index.css`)

Replace the entire `[data-theme="tourist-glass"]` block. New palette extracted from reference:

- `--bg-teal-deep: 165 35% 18%` — deep teal base (bottom of background gradient)
- `--bg-teal-mid: 160 28% 32%` — mid teal (middle of gradient, foggy)
- `--bg-teal-soft: 155 25% 48%` — soft hazy teal (top of gradient, light fog)
- `--accent-lime: 78 95% 62%` — bright lime (primary highlight, buttons, active tab pill, chart bars)
- `--accent-amber: 38 92% 62%` — warm amber (timeline pills, secondary highlight)
- `--text-primary: 0 0% 100%` — pure white headings
- `--text-secondary: 150 15% 82%` — soft warm white body
- `--text-muted: 150 12% 65%` — muted captions
- `--glass-card: 160 25% 35% / 0.28` — translucent card fill (much lighter than current)
- `--glass-card-strong: 160 22% 38% / 0.42`
- `--glass-border: 0 0% 100% / 0.22` — bright white-ish hairline border (key reference detail)
- `--glass-border-strong: 0 0% 100% / 0.35`
- `--glass-inner-highlight: 0 0% 100% / 0.12`

Semantic remap: `--background` → atmospheric gradient, `--card` → `--glass-card`, `--primary` → `--accent-lime`, `--border` → `--glass-border`, `--ring` → `--accent-lime`. Sidebar tokens use same translucent fill.

Remove the old dark-forest values entirely. No `--forest-deep`, `--evergreen`, `--moss`, `--sage` references remain.

## 2. New backdrop (`GlassBackdrop.tsx`)

Drop the photo-blur approach (too dark / too literal). Replace with a **pure CSS atmospheric scene** matching the reference:

- Base: vertical gradient `from hsl(155 25% 48%)` (top, foggy light teal) → `hsl(165 35% 18%)` (bottom, deep teal)
- Layer 2: subtle radial fog blobs in soft white/teal at top-left and top-right (mimics distant haze)
- Layer 3: very faint diagonal "sun-ray" streaks via low-opacity linear gradient (matches the light-shaft feel in reference)
- No image file needed — delete usage of `tourist-bg-forest.jpg` (keep file in repo, just unreferenced).

## 3. Utility classes (`src/index.css` `@layer components`)

Rebuild from scratch. Reference cards have: ~28-32px radius, 1px bright border, soft inner top highlight, heavy backdrop blur, no heavy shadows.

- `.glass-card` — `rounded-[28px]`, `border border-[hsl(var(--glass-border))]`, `bg-[hsl(var(--glass-card))]`, `backdrop-blur-2xl`, inner top highlight via `box-shadow inset 0 1px 0 hsl(var(--glass-inner-highlight))`, soft outer shadow `0 20px 60px -20px hsl(0 0% 0% / 0.35)`
- `.glass-card-nested` — smaller `rounded-2xl`, lighter fill, lighter border (for inner tiles like "Today's Tasks" sub-cards)
- `.glass-pill` — `rounded-full`, white border, translucent fill (for nav tabs, date pickers)
- `.glass-pill-active` — lime fill `bg-[hsl(var(--accent-lime))]` with dark text, used for active tab (matches "Dashboard" tab in reference)
- `.glass-chip-amber` — small rounded-full amber pill (timeline rows)
- `.glass-chip-lime` — small rounded-full lime pill
- `.accent-glow-lime` — outer + inner lime glow for "+" FAB and emphasis elements
- `.text-display` — large white tracking-tight (for "Daily Tasks" style headings)

## 4. Component re-skin order

Same set as before, but visuals now driven by new tokens. Order:

1. **`TouristShell.tsx`** — verify wrapper still applies `data-theme="tourist-glass"`. No structural change.
2. **`DashboardLayout` top nav (within tourist scope)** — convert top nav into a single floating glass pill row: rounded-full container, inner tab pills, active tab = lime fill with dark text. Search icon, notification bell, "+" FAB all become circular glass buttons; "+" gets `accent-glow-lime`.
3. **`StatsCard.tsx`** — rebuild: `.glass-card`, oversized number in white with `tabular-nums`, label in muted text, optional lime accent ring on icon. No dark forest greens.
4. **`Dashboard.tsx`** — page hero matches reference: large display heading + meta row (location pin, date, time) in muted text. Cards laid out in the same 2-col + right calendar-style rail where possible; if not, stack as glass cards.
5. **`MyTrees.tsx`** — contributions accordion: glass card container, lime left-accent bar (preserve existing memory), amber/lime status chips, smooth expand animation preserved.
6. **`MyTrips.tsx`** — table/list rendered inside glass card; row dividers `border-white/10`; trip status chips amber/lime.
7. **`MyImpact.tsx`** — charts re-themed: Recharts bars/lines use lime + amber; gridlines `white/10`; tooltip = glass-card-nested.
8. **`TreePurchase.tsx`** — pricing breakdown card uses glass-card with nested glass-card-nested rows; CTA button = lime fill, dark text, rounded-full.
9. **`Pledge.tsx` / `PledgeB.tsx` / `PledgeC.tsx`** — celebration surfaces on glass-card with lime accents.
10. **`Profile.tsx`** — form fields: translucent input bg, white border, lime focus ring.
11. **Dialogs / Sheets** — already inherit via `--popover` and `--card` remap; verify X-close button visible on glass.

## 5. Preserved rules (unchanged)

- KTB logo top-right (excluding trips/trees views)
- "Contribution" terminology, two-line dates, KES integer / USD 2-dp with `$`
- Dialogs close only via top-right X
- `tabular-nums` on all numerics
- Accordion default-collapsed, status progression rules
- No `text-white` / `bg-black` / raw hex in components — everything via tokens
- Other portals (admin, owner, lodge, institutional, agent) untouched (theme is scoped via `data-theme`)

## 6. Scope guardrails

- No new dependencies
- No backend/data changes
- Light mode deferred (reference is dark)
- Mobile responsiveness preserved via existing Tailwind breakpoints
- Each numbered component step is isolated; after each I'll re-check with `browser--view_preview`

## Technical details (for review)

```text
Token swap path:
  index.css [data-theme="tourist-glass"]  →  new HSL values
  GlassBackdrop.tsx                       →  pure CSS gradient + blobs (no img)
  index.css @layer components             →  rewritten .glass-* utilities
  components re-skinned                   →  apply .glass-card / .glass-pill / etc.

No component imports change.
No routing changes.
No Supabase / RLS changes.
```

## Deliverable

A tourist portal that, side-by-side with the AgrixAI reference, reads as the same visual family: soft teal atmospheric backdrop, floating bright-bordered glass cards, oversized rounded corners, lime primary + amber secondary, generous whitespace, white display type.
