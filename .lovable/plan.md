## Problem

In Tree Orders → Action menu → Planting Overview → Planting tab, the lifecycle status list uses `<Accordion type="single" collapsible>`. This means only one status (the current one) can be opened at a time — opening a completed status auto-closes the previously open one. Users can't keep multiple completed statuses expanded to compare details.

## Fix

Change the two Planting-tab accordions in `src/pages/owner/OwnerOrders.tsx` from `type="single" collapsible` to `type="multiple"` so any/all completed statuses can be expanded independently. The current status will be open by default; users can toggle others freely.

### Files changed
- `src/pages/owner/OwnerOrders.tsx`
  - Line ~1971: Planting-tab accordion → `type="multiple"`, set `defaultValue={[currentStatus]}` so the active status stays open initially.
  - Line ~2877: second Planting-tab accordion (other view path) → same change.

No other behavior changes — disabled triggers for statuses with no transition record remain disabled; future statuses keep their dimmed styling.