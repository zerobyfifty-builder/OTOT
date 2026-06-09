
# Re-tint tourist liquid-glass to warm soft-grey

Goal: keep the existing tourist palette (teal/green accents, dark sidebar, white text on dark) but swap the page tint and card frost from the current teal-aqua wash to the soft neutral grey used in the EMITRA reference. That grey is what makes the frosted cards "float" in the screenshot — currently our teal wash competes with the green accents instead of letting them sit on top.

## Reference colors picked from the screenshot

- Page background base: ~`hsl(220 14% 96%)` — a very light cool-warm grey, near `#F4F5F7`
- Card frost (resting): white at ~92% over that grey, with a faint inner highlight
- Card border: `hsl(220 13% 88%)` at ~55% alpha
- Soft drop shadow: `0 1px 2px hsl(220 15% 25% / 0.04), 0 12px 28px -14px hsl(220 15% 25% / 0.12)`
- Sidebar card (light surface inside dark? — N/A, our sidebar stays dark)
- Subtle radial light from top-left (very faint white bloom) and bottom-right (faint cool grey)

Greens and teals stay exactly as they are (charts, accent buttons, active nav pill).

## Changes — `src/styles/glass.css` only

1. **Page tint** (`.tourist-glass .tourist-glass-main`)
   - Base color: `hsl(220 14% 96%)` (was `hsl(165 30% 98%)`)
   - Radial gradients: replace the teal/aqua radial washes with two neutral ones:
     - top-left: `radial-gradient(1200px 600px at 0% -10%, hsl(0 0% 100% / 0.6), transparent 60%)` (soft white bloom)
     - bottom-right: `radial-gradient(900px 600px at 100% 110%, hsl(220 12% 90% / 0.5), transparent 60%)` (cool grey drift)
   - Drop the third teal radial entirely.

2. **Glass tokens** (light surfaces)
   - `--glass-bg-light`: `hsl(0 0% 100% / 0.82)` → `hsl(0 0% 100% / 0.86)` (slightly more opaque so it reads as white-on-grey, not white-on-teal)
   - `--glass-bg-light-strong`: keep `0.92`
   - `--glass-border`: switch hue from pure white to neutral — `hsl(220 13% 88% / 0.7)`
   - `--glass-shadow`: re-tint from teal-grey to neutral cool grey
     ```
     0 1px 2px hsl(220 15% 25% / 0.05),
     0 12px 28px -14px hsl(220 15% 25% / 0.14),
     inset 0 1px 0 hsl(0 0% 100% / 0.7)
     ```
   - `--glass-glow`: keep teal (this is the accent — green focus/hover ring is intentional)

3. **Mobile override** (`@media (max-width: 768px)`)
   - Replace teal-tinted flatter radials with neutral ones matching the new palette:
     - `radial-gradient(800px 400px at 0% -10%, hsl(0 0% 100% / 0.5), transparent 60%)`
     - `radial-gradient(600px 400px at 100% 110%, hsl(220 12% 92% / 0.35), transparent 60%)`

4. **Leaf backdrop** (`.tourist-glass::before`)
   - Drop opacity from `0.06` → `0.04` and shift SVG fill from forest green `#2E7D32` to neutral `#94A3B8` so the silhouettes read as texture, not green confetti against a neutral page. (Mobile already at 0.04 → 0.03.)

## Out of scope

- Sidebar (stays dark glass, unchanged).
- Active nav pill, buttons, charts, badges — all green/teal accents preserved.
- Other portals (admin/owner/institutional/lodge/agent/plantation) — untouched, scope still gated by `.tourist-glass`.
- No component-level edits; pure token/CSS change in `src/styles/glass.css`.

## Verification

- Build passes.
- Browse `/dashboard`, `/my-trees`, `/my-trips` in the preview — page is now neutral soft grey, cards visibly lift, green accent elements pop more (not less).
- WCAG: `--foreground` (`hsl(0 0% 9%)`) on `hsl(220 14% 96%)` ≈ 19:1 contrast — well above AA.
