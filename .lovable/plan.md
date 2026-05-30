## North-star architecture: two-layer contribution model

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1 — Source-of-truth per channel (domain tables)      │
│  agent_tickets   tourist_purchases*  lodge_plantings*  …    │
│  Rich, channel-specific fields: PNR/LPO, trip, lodge, etc.  │
│  Owns: validation, RLS for that channel, operational data   │
└──────────────┬──────────────────────────────────────────────┘
               │  ONE-WAY sync via SECURITY DEFINER triggers
               ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2 — Unified ledger (single source of truth)          │
│  contribution_tracking  ──<  trees                          │
│  CTR-NNNNN  +  contribution_type ∈ {tourist, travel_agent,  │
│                                     lodge, corporate, …}    │
│  All Owner modules read ONLY from here                      │
└─────────────────────────────────────────────────────────────┘
(* = future domain tables; tourist purchases currently write the ledger directly)
```

### Invariants (apply to every channel, present and future)

1. Domain tables write to the ledger via trigger/edge function — **never** the other way around.
2. The ledger issues the canonical `CTR-NNNNN` (existing `generate_contribution_id` trigger). Domain row stores it back as `contribution_id` for two-way lookup.
3. Trees always belong to the ledger row (`trees.contribution_id`), never to the domain row.
4. Owner / Admin modules render `contribution_type` as a badge and never branch on source.
5. Sync functions are idempotent: skip if the domain row already has a `contribution_id`.

## Incremental rollout

### Phase 1 (NOW) — Travel-agent channel projects into the ledger

Unblocks the immediate need: travel-agent orders appearing in Owner Tree Orders, Climate Funding, Tree Operations, Impact.

**DB migration**
- Add `agent_tickets.contribution_id text` (nullable, indexed).
- Create `public.sync_agent_ticket_to_contribution()` (SECURITY DEFINER, search_path=public):
  - Skip if `NEW.contribution_id IS NOT NULL`.
  - Insert one row into `contribution_tracking`:
    - `contribution_type = 'travel_agent'`
    - `num_trees = trees_needed`
    - `amount_paid = offset_amount_paid`, `currency = 'KES'`
    - `tourist_name = staff_name`
    - `country` from joined travel_agent / org
    - `payment_date`, `payment_method = 'Agent Offset'`, `transaction_reference = ticket_number`
    - `plantation_partner_id` = first active `organizations.category='owner'` (matches `auto_allocate_tree`)
    - `status = 'contribution_confirmed'` (or `_received` when paid)
  - Capture the new `contribution_id`.
  - Insert `trees_needed` rows into `trees` with that `contribution_id`, `owner_org_id = plantation_partner_id`, status `Planted` if ticket paid else `Waiting to be Assigned`.
  - `UPDATE agent_tickets SET contribution_id = ... WHERE id = NEW.id`.
- Triggers:
  - `trg_agent_ticket_to_contribution_ins` AFTER INSERT.
  - `trg_agent_ticket_to_contribution_upd` AFTER UPDATE OF `tree_status`, `offset_amount_paid`, `trees_planted` (only when the row crosses into a paid/planted state).
- Backfill: one-shot block at the end of the migration loops existing `agent_tickets` where `offset_amount_paid > 0 OR tree_status = 'Planted'` and have no `contribution_id`.

**Frontend (light)**
- `AgentCalculateOffset.tsx` — no logic change. Optionally re-read `contribution_id` from `agent_tickets` after insert and show it in the success toast.
- `AgentTickets`, `InstitutionalAgentTickets` — add a read-only "Contribution ID" column linking to `CTR-XXXXX`.
- Owner / Admin tables (`OwnerOrders`, `OwnerFinancial`, `AdminContributionTracking`, `TreesAll`) already group by `contribution_id` and render the `travel_agent` badge — verify KES currency formatting (integers with commas, no `$`) on rows where `currency = 'KES'`.

**Acceptance**
- A new paid agent ticket appears in Owner Tree Orders and Climate Funding within one request, with a fresh `CTR-NNNNN`, correct tree count, and KES amount.
- Fee allocation (`calculate_wallet_allocation`, `auto_populate_receipt_fields`) runs automatically on the new ledger row.
- Existing UI for tourist purchases is unchanged.

### Phase 2 (NEXT) — Backfill + reconciliation guardrails

- Add `contribution_tracking.source_table text` and `source_id uuid` (nullable for historical rows). New sync functions populate both.
- Reconciliation view `v_contribution_source_drift` flags ledger rows whose key projected fields (num_trees, amount_paid) diverge from the domain row.
- Nightly (or on-demand) job logs drift to `mdm_audit_log`.

### Phase 3 (LATER, optional refactor) — Tourists become a real domain table

Today `TreePurchase.tsx` writes `contribution_tracking` directly. To bring tourists under the same invariant:

- Create `public.tourist_purchases` (id, user_id, trip_id, num_trees, total_cost_usd, payment_method, payment_reference, dedication_name, contribution_id back-ref, timestamps). RLS: tourist can insert/read own rows; admin/owner read all.
- Create `public.sync_tourist_purchase_to_contribution()` mirroring the agent sync.
- Refactor `TreePurchase.tsx` to insert into `tourist_purchases` only; remove the direct `contribution_tracking` and per-tree inserts.
- One-shot backfill: synthesize `tourist_purchases` rows from existing ledger rows where `contribution_type IN (NULL, 'tourist')`, linking by `contribution_id`.

Defer until Phase 1 + 2 are stable. The ledger already contains the data, so this is purely a hygiene refactor.

### Phase 4 (AS NEEDED) — New channels

For each new source (lodge plantings, corporate sponsors, partner API, mobile app):

1. Create a domain table with channel-specific columns + `contribution_id` back-ref.
2. Create `sync_<channel>_to_contribution()` following the same recipe.
3. Add new value to `contribution_type` taxonomy.
4. **Zero changes** in Owner / Admin / Climate Funding UIs.

## Technical details

- Sync functions all SECURITY DEFINER, `SET search_path = public`. They bypass INSERT RLS so domain RLS (open insert for agents, authenticated for tourists) is unchanged.
- `contribution_tracking.currency` already exists; populate `'KES'` for agent flows, `'USD'` for tourist flows. UI formatters (per memory: KES integer/commas, USD two decimals/`$`) branch on `currency`.
- `auto_populate_receipt_fields` and `calculate_wallet_allocation` triggers continue to fire on the ledger — no change.
- New back-ref columns are nullable + indexed. No constraint that would block legacy rows.
- No edits to `src/integrations/supabase/types.ts` (regenerated post-migration).

## Out of scope (call-outs)

- Refunds / cancellations of agent tickets — separate workstream (would need a `voided_at` projection on the ledger).
- Per-channel fee % overrides — current global `wallet_settings` apply uniformly; revisit when channel-specific economics emerge.
- Splitting one agent ticket across multiple plantation partners.