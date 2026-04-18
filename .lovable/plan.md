
## Goal
Add a Geotag section to the **Location** tab in the Tree Status & Info slider showing exact GPS coordinates, with a Google Map embed that loads only on demand (Refresh button) and supports an expand-to-fullscreen view.

## Why on-demand loading
Auto-embedding a Google Map iframe on every slider open would:
- Block the slider open animation (300–800ms iframe init)
- Trigger Google Maps API quota usage on every view
- Slow the entire orders page when multiple sliders are opened in sequence

Lazy-loading via a "Load Map" button keeps the slider snappy and only spends quota when the user actually wants to see location.

## Approach

### 1. Geotag accordion (collapsible, closed by default)
Add inside the existing `Location` TabsContent in `src/pages/stakeholder/StakeholderOrders.tsx`, using the existing `Accordion` shadcn component.

```text
▾ Geotag & Map
  ┌─────────────────────────────────────────────┐
  │  Latitude:  -0.5234   Longitude:  35.7891   │
  │  Captured:  2026-04-12 10:23                │
  │  [ Copy coords ]  [ Open in Google Maps ↗ ] │
  ├─────────────────────────────────────────────┤
  │   Map preview                  [ ⛶ Expand ] │
  │  ┌─────────────────────────────────────┐   │
  │  │                                     │   │
  │  │   [ 🔄 Load Map ]                   │   │ ← placeholder until clicked
  │  │   Click to fetch location           │   │
  │  │                                     │   │
  │  └─────────────────────────────────────┘   │
  └─────────────────────────────────────────────┘
```

After clicking **Load Map**, the placeholder is replaced by an `<iframe>` Google Maps embed (~280px tall). A **Refresh** button reloads it (forces re-fetch with a cache-buster param).

### 2. Map embed strategy (no API key required)
Use Google Maps' free embed URL — no key, no quota worries:
```
https://www.google.com/maps?q=<lat>,<lng>&z=16&output=embed
```
This works for any public coordinate. If the project later adds a Google Maps API key, we can swap to the official Embed API for better styling — same iframe pattern.

### 3. Expand to fullscreen
Clicking the **Expand** icon opens a shadcn `<Dialog>` containing a larger iframe (`h-[70vh]`) of the same coordinates. Close via the standard top-right X (per project's dialog-closing standard).

### 4. Coordinate source
Pull `latitude` / `longitude` from the existing tree row already loaded in the slider (the same data that powers the Location tab today). If coordinates are missing, show:
```
No geotag captured for this tree yet.
```
and hide the map controls.

## Files to Edit
- `src/pages/stakeholder/StakeholderOrders.tsx` — add Accordion + lazy iframe + expand Dialog inside the `Location` TabsContent. Add small local state `mapLoaded` and `mapKey` (for refresh cache-busting) and `mapExpanded`.

## Component / State Sketch
```tsx
const [mapLoaded, setMapLoaded] = useState(false);
const [mapKey, setMapKey] = useState(0);          // bump to force iframe reload
const [mapExpanded, setMapExpanded] = useState(false);

const mapSrc = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed&t=${mapKey}`;
```

## Out of Scope
- Editing/saving new geotag coordinates (read-only display only).
- Adding a Google Maps API key or using the JS SDK (free embed is sufficient).
- Showing multiple trees on one map.

## UX Notes
- Accordion **closed by default** so the Location tab stays light.
- Map area reserves its height (placeholder same size as iframe) → no layout shift when loaded.
- Refresh button only visible after first load; before that only "Load Map" shows.
- Open-in-Google-Maps link always available even without loading the embed (zero cost, opens new tab).
