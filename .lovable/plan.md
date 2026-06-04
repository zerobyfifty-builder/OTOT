# Live per-tree pricing on Tree Purchase page

Source the tourist-facing per-tree price (and the two plan calculations) from the latest **approved** Planting Costs submission in Super Admin → Configuration → Planting Costs, so admin changes flow through to `/tree-purchase` automatically.

## Source of truth

Table: `planting_cost_configs` where `is_active = true` (single row, set by `PlantingCostsConfigPanel.approveMutation`).

Fields used:
- `donation_usd` — canonical per-tree contribution amount (USD)
- (already exposed) `tier_plant_usd`, `tier_monthly_usd` — available for the two current plans, future plans can map to additional `tier_*` columns

## Changes

### 1. New hook: `src/hooks/useActivePlantingConfig.ts`
- React Query (`queryKey: ['active-planting-config']`) selects `id, donation_usd, tier_plant_usd, tier_monthly_usd, tier_adopt_usd, tier_yearly_usd, tier_recommit_usd, tier_grove_usd, tier_forest_usd` from `planting_cost_configs` where `is_active = true`.
- Returns `{ pricePerTree, tiers, configId, isLoading }`.
- `pricePerTree` falls back to `routeDonation` prop, then `4.5`.
- Reusable across Tourist portal and any future surface.

### 2. `src/pages/TreePurchase.tsx`
- Replace `const PRICE_PER_TREE = routeDonation || 4.5;` with `useActivePlantingConfig({ fallback: routeDonation })`.
- Refactor plan options to render from a `plans` array driven by config, not hard-coded:
  ```
  plans = [
    { id: 'custom',       label: 'Flexible Tree Planting', pricePerTree, ... },
    { id: 'subscription', label: 'Monthly Tree Planting',  pricePerTree, ... },
    // future: { id: 'adopt', label: 'Adopt a tree (3 yr)', pricePerTree: tier_adopt_usd, ... }
  ]
  ```
  Render with `plans.map(...)` so adding a tier later is a one-line addition.
- All price math (`calculatePrice`, `calculateMonthlyPrice`, `customTreeCount * PRICE_PER_TREE`, etc.) reads from the live `pricePerTree`.
- Insert `price_per_tree_usd: pricePerTree` and the resolved `configId` (new optional column not required — the contribution row already snapshots price) so each purchase records the rate it was sold at.

### 3. "Why $X per tree?" panel (lines 727–737)
- Already binds to `PRICE_PER_TREE.toFixed(2)` — once the variable is sourced from the active config it updates automatically.
- Update the supporting copy to: "Your contribution covers seedling, planting labour, 3 years of aftercare, MRV/GPS geotagging and program overhead — the per-tree rate is set by KTB administrators and updated whenever planting costs are re-approved." (no number hard-coded).

### 4. Realtime/live refresh
- React Query `staleTime: 30_000` and invalidate `['active-planting-config']` in `PlantingCostsConfigPanel.approveMutation.onSuccess` (already invalidates a similar key — extend to the shared key).
- Optional follow-up: subscribe to `planting_cost_configs` via Supabase realtime for instant updates without refresh. Will include this in the hook (lightweight channel that invalidates on `UPDATE`/`INSERT`).

## Out of scope
- No DB schema changes.
- No new admin UI; admins continue to publish prices from the existing Planting Costs panel.
- No change to contribution split logic (tech/KTB/MoE) — already handled server-side by `calculate_wallet_allocation`.

## Files touched
- `src/hooks/useActivePlantingConfig.ts` (new)
- `src/pages/TreePurchase.tsx`
- `src/components/admin/PlantingCostsConfigPanel.tsx` (invalidate shared query key)
