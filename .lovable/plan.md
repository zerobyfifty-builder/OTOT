## Goal

Let Super Admin define which contribution tiers appear on the Tourist tree-purchase page (and later B2B), with prices auto-calculated from the active planting cost configuration's per-tree cost — with an optional manual override that shows the savings vs the auto price.

**Non-negotiable guarantees**
- The two existing cards on the Tourist tree-purchase page (Flexible Tree Planting + Monthly Tree Planting) remain **always active and untouched** in behavior, layout, copy, and checkout wiring.
- No existing feature, table, column, route, hook, edge function, or trigger is modified. Implementation is strictly additive (new tables, new hooks, new components, and one localized append inside `TreePurchase.tsx`).

## 1. Database (additive only)

Two new tables. No changes to existing schemas.

### `contribution_tiers` — the catalog (full CRUD)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `key` | text unique | machine name, e.g. `grove_100` |
| `name` | text | "Grove (100 trees)" |
| `description` | text | "Sponsor a grove of 100 trees" |
| `tier_type` | enum | `fixed`, `custom_range`, `subscription`, `recurring` |
| `trees_count` | int | for `fixed` / `subscription` |
| `min_trees`, `max_trees` | int | for `custom_range` |
| `duration_months` | int | for `subscription` / `recurring` |
| `recurring_interval` | text | `monthly` \| `yearly` |
| `badge` | text | `recommended` \| `fixed` \| null |
| `sort_order` | int | display order |
| `price_override_usd` | numeric null | manual price; auto savings shown vs auto price |
| `is_active` | bool | global on/off |
| `created_at`, `updated_at` | timestamptz | |

### `contribution_tier_visibility` — per-portal toggles

| Field | Type | Notes |
|---|---|---|
| `tier_id` | uuid FK → contribution_tiers | |
| `portal` | enum | `tourist`, `b2b` |
| `is_visible` | bool | |
| PK | `(tier_id, portal)` | |

Standard `GRANT`s + RLS: read for `authenticated` + `anon`, full CRUD restricted to super_admin via `has_role`. `updated_at` trigger.

Seed the existing 8 preset tiers as `fixed` rows so the admin starts with a populated catalog. All seeded rows default to `is_visible=false` for both portals, so the Tourist page does not change visually until the admin opts a tier in.

## 2. Pricing logic (single source of truth)

Helper `useTierPrice(tier)` in `src/hooks/useTierPrice.ts`:

```text
perTree   = planting_cost_configs.donation_usd (active row)
autoPrice = perTree * trees_count               (fixed / subscription)
          = perTree * min..max                  (custom_range; display range)
finalPrice= price_override_usd ?? autoPrice
savings   = max(0, autoPrice - finalPrice)      (shown as "Save $X vs $auto")
monthly   = finalPrice / duration_months        (subscription / recurring)
```

If override > auto price, label flips to "Premium tier" with no savings badge.

## 3. Super Admin — Contribution Tier Settings page

Rewrite `src/pages/admin/ContributionTierSettings.tsx` (this page only) into a CRUD console:

- Header shows the active per-tree cost (`$X.XX from approved planting cost config`).
- Table of tiers: drag-handle (sort_order), Name, Type, Trees, Auto $, Override $, Savings, **Tourist** toggle, **B2B** toggle, Active toggle, ⋯ menu (Edit / Delete).
- "Add Tier" → side-sheet (closes only via top-right X per UI standard) with: name, key, description, tier_type, trees_count or min/max, duration_months, recurring_interval, badge, optional `price_override_usd`. Live preview of auto price + savings.
- Edit reuses the side-sheet. Delete is soft (`is_active=false`) when referenced, hard delete otherwise.
- Toggles update `contribution_tier_visibility`.
- Empty state when no active planting cost config: blocks tier creation and links to Planting Costs Config.

## 4. Tourist tree-purchase page (strictly additive)

Edit `src/pages/TreePurchase.tsx` **only** to append a new section *after* the existing "Choose Your Option" grid:

- Existing Flexible + Monthly cards: unchanged. Same JSX, same state, same handlers, same `selectedOption` keys (`custom`, `subscription`), same checkout flow.
- New section "More Ways to Contribute" renders only when at least one tier is active and visible for `portal='tourist'`. When empty (default after migration) the section is not rendered, so the page looks identical to today.
- Each tier card: badge, name, description, auto-derived price, optional crossed-out auto price + "Save $X" pill when override is lower, monthly breakdown for subscription/recurring, trees count, and a `Select` button.
- Selecting a tier sets a new local state `selectedTierId` and preloads `customTreeCount` / `subscriptionMonths` from the tier so the existing checkout (Proceed to Payment) works without modification. No changes to `tourist_purchases`, `trees`, `contribution_tracking`, or any trigger.
- `fixed` → single price; `custom_range` → in-card slider; `subscription` → months slider bounded by tier; `recurring` → recurring badge.

## 5. B2B portal

`portal='b2b'` rows created and toggleable in admin (default off). No B2B UI wiring this round.

## 6. Files touched

- New: migration creating two tables + enums + RLS + grants + seed (no edits to existing tables).
- New: `src/hooks/useTierPrice.ts`, `src/hooks/useContributionTiers.ts`.
- New: `src/components/admin/ContributionTierFormSheet.tsx`, `src/components/tourist/ContributionTierCard.tsx`.
- Edit: `src/pages/admin/ContributionTierSettings.tsx` (full rewrite of this file only).
- Edit: `src/pages/TreePurchase.tsx` — single append below the existing grid; no edits to the Flexible/Monthly cards or surrounding logic.

## 7. Regression safety

- No changes to existing tables, RLS, triggers, edge functions, or routes.
- Default seed visibility = `false` → Tourist page is byte-identical until admin enables a tier.
- `selectedOption` values `custom` and `subscription` keep their current meaning; new tiers use distinct keys.
- Manual QA before sign-off: load `/tree-purchase` with no tiers visible → identical to today; enable one tier → new card appears below; disable → reverts; checkout via Flexible and via Monthly both still work.

## Out of scope

- B2B purchase UI.
- Any change to the existing Flexible + Monthly cards.
- Changes to checkout, contribution_tracking, trees, or planting cost tables.
