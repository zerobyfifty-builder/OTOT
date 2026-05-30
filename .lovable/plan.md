# Plan: Unified Travel Offsets Module

## Goal
Make the Travel Offsets module (currently "Trip Management" / `trips`) the single source of truth for every travel-related CO₂ offset on OTOT — tourist self-offsets today, travel-agent (KTB staff) offsets now, and B2B / airline offsets later — each tagged by a `source_type` and linked to its existing contribution ID, mirroring how Climate Funding and Tree Orders already unify contributions.

## Current state (verified)
- `public.trips` — tourist-entered trips. Has `friendly_trip_id` (e.g. `TRIP-0000001`), `entry_source` enum (`entry_source_type`, currently only "Manual"), CO₂ + trees_needed, linked to contributions via `contribution_tracking.trip_id`.
- `public.agent_tickets` — travel-agent (KTB) tickets. Has its own CO₂ fields, `trees_needed`, `contribution_id` (text), but is NOT represented as a row in `trips`. Owner "Trip Management" page only queries `trips`, so agent travels are invisible there.
- `contribution_tracking` already has `contribution_type` ('tourist' | 'travel_agent') and `source_table` / `source_id` — the contribution side is already unified; only the **travel/trip** side is not.

## Approach
Extend `trips` to be the canonical travel record for all sources, and backfill/sync agent tickets into it. No destructive changes to `agent_tickets` (additive-only, per project Core rules).

### 1. Schema changes (migration)
On `public.trips`:
- Add `source_type text NOT NULL DEFAULT 'tourist'` with CHECK in (`tourist`, `travel_agent`, `b2b`, `airline`) — chosen over reusing `entry_source` because that enum describes *how* a row was entered (Manual/Import), not *who* the traveller is.
- Add `source_ref_table text` and `source_ref_id uuid` (pointer back to `agent_tickets.id` etc., analogous to `contribution_tracking.source_table`/`source_id`).
- Add `agent_id uuid`, `staff_name text`, `department text`, `ticket_number text`, `pnr_number text`, `lpo_number text` — nullable; populated only for agent rows so the same table can render agent context without joins.
- Index on `source_type`, on `source_ref_id`, and unique partial index on `(source_ref_table, source_ref_id)` to prevent duplicate syncs.
- Keep `friendly_trip_id` as the universal human ID across all source types (agent rows get one too).

### 2. Backfill + ongoing sync
- One-time backfill: for every `agent_tickets` row, insert a matching `trips` row with `source_type='travel_agent'`, copying CO₂, dates, airports, traveller count, and pointing `source_ref_id` at the ticket. Reuse / generate `friendly_trip_id`.
- Trigger `agent_tickets_sync_to_trips` (AFTER INSERT/UPDATE) to upsert the mirrored `trips` row on every agent-ticket change, so the unified module stays live.
- `contribution_tracking.trip_id` for agent contributions gets set to the new trips row id (so existing climate-funding / tree-orders joins keep working unchanged).

### 3. UI — Travel Offsets module (rename of Trip Management)
`src/pages/owner/OwnerTripManagement.tsx`:
- Rename page heading + sidebar label from "Trip Management" to "Travel Offsets" (route stays for compatibility).
- New **Source** column showing a colored badge: Tourist / Travel Agent / B2B / Airline.
- New **Source filter** dropdown (All / Tourist / Travel Agent / …) next to the existing status filter, mirroring the Contri-type pattern just added on Tree Orders.
- Search expanded to also match `ticket_number`, `pnr_number`, `staff_name`, `department`.
- Expanded row: when `source_type='travel_agent'`, show ticket #, PNR, LPO, department, staff name, agent (org) name — instead of tourist name/country block.
- Summary cards (Total Trips, Total CO₂, Trees Needed, Fully/Partial/Not Offset) auto-include agent rows since they're now in `trips`. Add a small per-source breakdown strip under the cards.

### 4. Analytics / dashboards
- Owner Dashboard + Analytics tiles that read from `trips` automatically pick up agent travel.
- Add a "By source" segment to the CO₂ / trees charts (group by `trips.source_type`).
- Climate Funding & Tree Orders need no change — they already key off `contribution_type`.

### 5. Future sources (B2B, airlines)
- Adding a new source is now: insert into `trips` with the new `source_type` value (extend CHECK list) + optional mirror table & sync trigger. No UI rework required beyond adding the badge color + filter option.

## Out of scope
- No edits to `agent_tickets` schema or to the Agent / Institutional portals' write paths.
- No change to existing contribution lifecycle, planting status, or fee allocation logic.
- No rename of the underlying `trips` table or its route — UI label only, to keep all existing imports/links stable.

## Technical notes
- Migration must include GRANTs for the new columns' table (no new table created, so no new GRANT block needed — existing `trips` grants cover it).
- Sync trigger runs as `SECURITY DEFINER` with `SET search_path = public` so agent-portal inserts (which run under anon/authenticated RLS) can still write the mirrored trip row.
- `friendly_trip_id` generator already exists for tourist trips; reuse the same sequence so IDs remain globally unique across sources (per the Trip ID System memory).
- Cache safety: the new `source_type` filter state follows the existing `Map`/`Set` defensive pattern used elsewhere.

## Deliverables
1. Migration: add columns, indexes, backfill agent_tickets → trips, install sync trigger.
2. `OwnerTripManagement.tsx`: rename, Source column, Source filter, agent-context expanded row, search expansion.
3. Sidebar label update ("Trip Management" → "Travel Offsets").
4. Small "By source" breakdown on the summary strip.
