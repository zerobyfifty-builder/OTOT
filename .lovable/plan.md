# Tourist Portal — Liquid Glass Redesign

Apply an AgrixAI-style liquid glass aesthetic across the tourist portal only. Strictly additive: new tokens, new utility classes, new background components, restyled wrappers. No data, route, or business-logic changes.

## Scope

In: `/dashboard`, `/my-trips`, `/my-trees`, `/my-impact`, `/tree-purchase`, `/pledge`, `/pledge-b`, `/pledge-c`, `/profile`, tourist `AppSidebar` / top nav, dialogs/sheets rendered inside these routes.

Out: admin, owner, institutional, lodge, agent, plantation, auth screens, landing, certificate PDF output (PDF generators stay untouched).

## Step 1 — Design tokens (`src/index.css`)

Add a new `[data-theme="tourist-glass"]` scope (applied via a wrapper on the tourist layout root, not the global `:root`) so other portals are unaffected:

```css
[data-theme="tourist-glass"] {
  --forest-deep: 150 50% 8%;
  --evergreen: 150 42% 14%;
  --moss: 122 39% 49%;
  --sage: 122 36% 74%;
  --lime: 75 100% 65%;       /* #C6FF4D accent */

  --glass-bg: 150 30% 12% / 0.55;
  --glass-bg-strong: 150 35% 10% / 0.72;
  --glass-bg-nested: 150 25% 16% / 0.45;
  --glass-border: 140 30% 85% / 0.18;
  --glass-highlight: 140 40% 95% / 0.08;
  --glass-shadow: 150 60% 4% / 0.45;

  /* re-map semantic tokens so existing shadcn components inherit the theme */
  --background: var(--forest-deep);
  --foreground: 0 0% 98%;
  --card: var(--glass-bg);
  --card-foreground: 0 0% 98%;
  --popover: var(--glass-bg-strong);
  --primary: var(--lime);
  --primary-foreground: 150 60% 8%;
  --muted: 150 20% 20% / 0.4;
  --muted-foreground: 140 15% 75%;
  --accent: var(--moss);
  --border: var(--glass-border);
  --input: 150 25% 18% / 0.5;
  --ring: var(--lime);
}
```

## Step 2 — Utility classes (`src/index.css` `@layer components`)

```css
.glass-panel        /* primary card: bg-[hsl(var(--glass-bg))] backdrop-blur-xl border border-[hsl(var(--glass-border))] rounded-3xl shadow-[0_8px_32px_hsl(var(--glass-shadow))] relative; with ::before inner highlight */
.glass-panel-strong /* modal/sheet variant, blur-2xl, stronger bg */
.glass-panel-nested /* inner panel, lower opacity */
.glass-pill         /* nav pill / tab pill */
.glass-chip         /* small icon chip circle */
.accent-glow        /* lime drop-shadow + ring for FAB / active */
.text-lime          /* hsl(var(--lime)) */
.bg-tourist-scene   /* fixed full-bleed image + dark green gradient overlay */
```

## Step 3 — Background scene component

New file `src/components/tourist/GlassBackdrop.tsx`:
- `position: fixed inset-0 -z-10`
- Forest/Mau-Forest hero image (generate one via imagegen, store at `src/assets/tourist-bg-forest.jpg`)
- Layered: image (blur-sm) → dark green gradient overlay → subtle radial lime glow top-right
- Mounted once at the tourist layout root

## Step 4 — Tourist layout wrapper

New file `src/components/tourist/TouristShell.tsx`:
- Applies `data-theme="tourist-glass"` to its root div
- Renders `<GlassBackdrop />` + children
- Wrap the tourist routes (in `App.tsx` route group) — existing pages stay as-is inside

## Step 5 — Component re-skin order

Each step is a small, isolated edit. After each, verify visually via `browser--view_preview`.

1. **Top nav / `AppSidebar` (tourist variant)** — wrap nav in `glass-pill` floating bar, lime accent on active route, glowing "+" FAB. Sidebar gets `glass-panel-strong` surface.
2. **`StatsCard`** — apply `glass-panel`, lime numerals, thin ring.
3. **`Dashboard.tsx`** — section headers w/ `glass-chip` icons, hero meta block (title + lat/long + location + datetime).
4. **`MyTrees.tsx`** — re-skin trip group cards + contributions accordion (keep collapsed default, lime left-accent already in place).
5. **`MyTrips.tsx`** — trip cards as `glass-panel`.
6. **`MyImpact.tsx`** — gauges/rings on glass, lime highlights, vertical bar-array chart styling via Recharts color overrides.
7. **`TreePurchase.tsx`** — stepper + pricing breakdown nested glass tiers.
8. **`Pledge.tsx` / `PledgeB.tsx` / `PledgeC.tsx`** — cinematic glass card.
9. **`Profile.tsx`** — settings sections as glass panels.
10. **Dialogs/Sheets used in tourist routes** — wrapper class adds `glass-panel-strong`; keep top-right X close.

## Step 6 — Preserved rules (verify after each step)

- KTB logo placement, "Contribution" terminology, two-line dates, KES integer / USD 2-dp, dialog X-close, tabular-nums, accordion default-collapsed, status progression.
- No `text-white` / `bg-black` / raw hex in components — all via tokens.
- Other portals untouched (verify by spot-checking admin & owner routes).

## Technical Details

- Theming via `data-theme` attribute selector keeps Tailwind class names identical; `--background`, `--card`, `--primary` etc. are overridden only inside the tourist subtree.
- Light-mode: defer for now (reference is dark); existing global `.dark` still works elsewhere.
- Background image: 1 generated forest hero (`fast` model, 1536×1024, jpg) — single asset reused; lazy `<img>` with `loading="eager"` on first paint.
- Recharts color: pass `hsl(var(--lime))` via existing chart config — no library changes.
- No new dependencies.

## Verification

After Step 4: load `/dashboard` — backdrop + theme active, no other portal affected.
After each component step: `browser--view_preview` at the relevant route, confirm legibility, contrast, and that preserved rules still hold.
