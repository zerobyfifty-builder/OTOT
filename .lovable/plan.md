
The user wants to eliminate manual unit entry ("cm", "m", "months", "years") in the Growth Metrics form to prevent typos and enable reliable downstream calculations. Best UX: split into a numeric input + a unit selector, then store a normalized canonical value.

## Approach

**Form changes** in `src/pages/stakeholder/StakeholderOrders.tsx` (Growth Metrics slider + Tree Status sheet's Growth tab):

1. **Tree Height field** → numeric input + unit dropdown (cm / m)
   - User enters number only (e.g. `150`), picks unit (`cm` or `m`)
   - On submit: convert to canonical centimeters and store in existing `tree_height` column as `"150 cm"` (display) — but also persist the normalized value for tracking.

2. **Tree Age field** → numeric input + unit dropdown (Months / Years)
   - User enters number only, picks unit
   - On submit: convert to canonical months and store.

**Storage strategy** (additive, non-breaking):
- Keep existing `tree_height` and `tree_age` text columns for display compatibility with current Previous Logs table.
- Add two new numeric columns to `tree_growth_stages` table for reliable analytics:
  - `tree_height_cm` (numeric) — canonical height in centimeters
  - `tree_age_months` (integer) — canonical age in months
- Save both: legacy formatted string (e.g. `"1.5 m"`, `"18 months"`) AND canonical numeric values.

**Previous Logs display**: Show the formatted string as today (no visual change), but data is now reliable.

**Validation**:
- Numeric input: `type="number"`, `min="0"`, `step="0.1"` for height, `step="1"` for age.
- Unit selector: shadcn `<Select>` with fixed options — no free text.
- Required: both number and unit before submit enabled.

## UI Sketch

```text
Tree Height
[  150     ] [ cm ▾ ]   ← number input + unit select side-by-side

Tree Age
[  18      ] [ Months ▾ ]
```

Layout: `grid grid-cols-[1fr_110px] gap-2` for each field.

## Files to Edit

- `src/pages/stakeholder/StakeholderOrders.tsx` — replace single text inputs with number+select pair in both Growth Metrics slider and the main Tree Status sheet's Growth tab; add conversion helpers.

## Migration

- Add columns `tree_height_cm numeric` and `tree_age_months integer` to `tree_growth_stages` (nullable, additive — existing rows unaffected).

## Out of Scope

- Backfilling old text-based entries into the new numeric columns (can be done later if needed).
- Changing the Survival Tracking form (only Growth Metrics was requested).
