## Leaf / vine hover micro-animation — tourist sidebar

Add a clearly visible teal leaf that slides in on hover for every `.glass-nav-item` in the tourist portal sidebar. Scoped under `.tourist-glass` only — no other portal affected.

### Change scope
Single file: `src/styles/glass.css` — append rules around the existing `.glass-nav-item:hover` block. No component edits, no new assets (leaf is an inline SVG data-URI).

### Behavior
- **Rest state**: leaf hidden (opacity 0, translated 14px to the right, rotated -25°, scaled 0.6).
- **Hover**: leaf fades in and springs to its anchored position at the right edge of the pill (opacity 1, rotate 0°, scale 1) using `cubic-bezier(.34,1.56,.64,1)` for a subtle pop.
- **After settle**: a gentle 1.8s `sway` keyframe (±8° rotation, 1.04 scale) loops while the cursor stays.
- **Active item**: leaf stays visible at 0.9 opacity as a permanent affordance, no sway.
- **Reduced motion**: animation disabled; only opacity fade kept.

### Visual details
- Leaf SVG: filled `#34D399` (teal-green) with a darker `#065F46` vine stroke arcing through it.
- 18×18 px, anchored 8px from the right edge, vertically centered.
- Drop-shadow `0 2px 4px hsl(142 70% 35% / 0.45)` so it reads against both dark sidebar glass and the active teal pill.

### Technical notes
- Uses the nav item's existing `::before` (currently unused; `::after` is reserved for the ripple).
- `.glass-nav-item` already has `position: relative; overflow: hidden;` — leaf will clip cleanly at the pill edge during slide-in.
- Works identically for collapsed sidebar (icon-only) and expanded states since it's positioned relative to the pill, not the label.

### Verification
- Hover each sidebar item on `/dashboard`, `/my-trips`, `/my-trees`, `/my-impact`, `/carbon-calculator` and confirm the leaf slides in + sways.
- Confirm active route shows the static leaf.
- Toggle OS "Reduce motion" → confirm sway stops, only fade remains.
- Check admin/owner/lodge/agent portals are unchanged (no `.tourist-glass` wrapper).
