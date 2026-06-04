# Table Redesign — Scrollable Container

Update the shared `src/components/ui/table.tsx` so every table renders inside a fixed-height container that scrolls both horizontally and vertically, matching the reference.

## Visual spec

- Wrapper: full width, `max-h-[560px]` (approx), `overflow-auto` (both axes), no outer card border, light hairline only.
- Sticky header: `thead` stays pinned on vertical scroll (`sticky top-0 z-10 bg-background`).
- Header cells: uppercase 11px, tracking-wider, muted-foreground, `h-11 px-6`, bottom border.
- Rows: `py-5 px-6`, bottom hairline `border-border/50`, hover `bg-muted/30`.
- Inner gridlines: none; only horizontal row dividers.
- Numbers/dates: keep `tabular-nums` from callers.

## Technical notes

- Only `src/components/ui/table.tsx` is touched. No feature/page logic changes.
- Use semantic Tailwind tokens only.
- Keep `border-separate border-spacing-0` so the sticky header border renders correctly.
- Preserve exports, refs, and prop signatures.

## Validation

Spot-check `/owner/financial`, `/admin/owners`, `/admin/partners`, `/owner/orders`. Confirm header stays pinned while scrolling rows, horizontal scroll works for wide tables, and no page-level vertical overflow is added.
