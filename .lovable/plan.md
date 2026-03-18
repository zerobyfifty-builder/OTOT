

# End-to-End Tree Planting Data Flow & Impact Measurement

## Current State Analysis

Today, the three portals operate largely in isolation:

- **Tourist Portal**: Purchases trees (inserted into `trees` table with status "Waiting to be Assigned"), sees status badges, views CO2 stats. No visibility into planting progress or community impact.
- **KTB (Institutional) Portal**: Views aggregate stats (total trees, revenue, CO2), trips, and tree records. Has a "Plantation Partners" page showing business partners only. No disbursement tracking or planting progress visibility.
- **Plantation Partner (Stakeholder) Portal**: Records planting, monitoring, and financial disbursements independently. No link between tourist-purchased trees and their planting records. Disbursements are manually entered with no connection to KTB payments.

**Key Gap**: There is no automated data pipeline connecting a tourist's tree purchase to KTB's financial processing to the plantation partner's planting execution.

## Proposed Data Flow

```text
TOURIST pays $4.50/tree
       |
       v
trees table (status: "Waiting to be Assigned")
       |
       v  [New: Admin/system assigns stakeholder_org_id to tree]
       |
KTB PORTAL sees:
  - Tree purchase + payment (from trees table)
  - Pending disbursement to plantation partner
  - Creates disbursement record (stakeholder_disbursements)
       |
       v
PLANTATION PARTNER PORTAL sees:
  - Incoming tree allocation (new "Tree Orders" view)
  - Pending funds from KTB
  - Records planting against allocated trees
  - Records monitoring data
       |
       v  [Planting/monitoring data flows back]
       |
KTB PORTAL sees: planting status, survival rates, impact metrics
TOURIST PORTAL sees: tree status updates, community impact summary
```

## Implementation Plan

### Phase 1: Database Schema Changes

**1a. Link trees to plantation partners**

Add `stakeholder_org_id` column to the `trees` table so each purchased tree can be assigned to a specific plantation partner. This is the critical missing link.

Migration:
- `ALTER TABLE trees ADD COLUMN stakeholder_org_id UUID REFERENCES organizations(id);`
- Add RLS policy: stakeholders can SELECT trees where `stakeholder_org_id` matches their org.

**1b. Add disbursement linkage fields**

Add `related_tree_count` and `stakeholder_org_id` reference to `stakeholder_disbursements` (stakeholder_org_id already exists). Add `ktb_transfer_date`, `ktb_reference` to make reconciliation traceable.

Migration:
- `ALTER TABLE stakeholder_disbursements ADD COLUMN tree_count INTEGER DEFAULT 0;`
- `ALTER TABLE stakeholder_disbursements ADD COLUMN ktb_transfer_reference TEXT;`

**1c. Add planting_status to trees**

Add `planting_status` column to track the plantation partner's progress separately from the existing `status` field (which tracks the tourist-facing lifecycle):
- Values: `pending_allocation`, `allocated`, `funds_pending`, `funds_received`, `planting_in_progress`, `planted`, `monitored`

Migration:
- Create enum `planting_progress_type` with the above values.
- `ALTER TABLE trees ADD COLUMN planting_status planting_progress_type DEFAULT 'pending_allocation';`

**1d. Community impact tracking table**

Create `community_impact` table for plantation partners to record community-level outcomes:
- `id`, `stakeholder_org_id`, `reporting_period` (date), `families_supported` (int), `jobs_created` (int), `women_employed` (int), `youth_employed` (int), `nursery_income_kes` (numeric), `notes`, `created_at`
- RLS: stakeholders can manage their own, super_admins can manage all, authenticated can SELECT.

### Phase 2: Stakeholder (Plantation Partner) Portal Changes

**2a. New "Tree Orders" page** (`/stakeholder/orders`)

A new page showing trees allocated to this plantation partner (from the `trees` table where `stakeholder_org_id` = their org). Displays:
- Tourist name/email (anonymized), tree count, payment date, amount
- Planting status (editable dropdown)
- Linked planting record (if any)
- Fund status indicator (based on matching disbursements)

**2b. Update Planting Records**

Modify `StakeholderPlanting.tsx` to optionally link planting records to specific tree orders. Add a `tree_id` foreign key to `planting_records` (nullable) so a planting record can reference the original tourist tree purchase.

**2c. New "Community Impact" page** (`/stakeholder/impact`)

Form to record per-period community impact: families supported, jobs created, gender breakdown, nursery income. This data feeds up to KTB and tourist dashboards.

**2d. Financial page enhancements**

Update `StakeholderFinancial.tsx` to show:
- "Expected funds" (sum of allocated trees x rate) vs "Received funds"
- Auto-calculate reconciliation status when disbursement matches tree allocation

### Phase 3: KTB (Institutional) Portal Changes

**3a. Rename "Plantation Partners" and show stakeholders**

Change the existing `PlantationPartners.tsx` to query `organizations` with `category = 'stakeholder'` instead of `'business'`. Show planting progress, survival rates, and fund disbursement status per partner.

**3b. New "Disbursements" page** (`/institutional/disbursements`)

KTB-facing page to:
- View all pending tree allocations grouped by plantation partner
- Create disbursement records (inserts into `stakeholder_disbursements`)
- Mark disbursements as sent/confirmed
- See reconciliation status

**3c. New "Impact Dashboard" section on InstitutionalDashboard**

Add cards to the existing dashboard:
- Trees allocated vs planted (from `trees.planting_status`)
- Average survival rate (from `monitoring_records`)
- Community impact summary (from `community_impact` table)
- Funds disbursed vs pending

**3d. Update sidebar navigation**

Add "Disbursements" and "Impact" menu items to `InstitutionalSidebar.tsx`.

### Phase 4: Tourist Portal Changes

**4a. Enhanced "My Trees" page**

Update `MyTrees.tsx` to show real planting progress:
- Replace hardcoded "Mau" / "Nakuru" / "Kenya Forest Service" with actual data from the linked plantation partner (`stakeholder_org_id → organizations.name`)
- Show `planting_status` as a secondary badge
- Show planting date from linked `planting_records`

**4b. Enhanced "My Impact" page**

Update `MyImpact.tsx` to show community benefit data:
- "Your trees supported X families" (derived from community_impact pro-rated by tree count)
- "X jobs created in the Mau Forest" 
- Survival rate of your trees
- Keep existing CO2 and SDG sections

### Phase 5: Admin Portal Changes

**5a. Tree allocation workflow**

Update `TreesAll.tsx` to allow admins to assign `stakeholder_org_id` to trees (dropdown of stakeholder organizations). Bulk-assign capability.

**5b. Disbursement management**

Add admin visibility into disbursements across all stakeholders. Admin can create/approve disbursements on behalf of KTB.

### Phase 6: Automated Triggers

**6a. Auto-allocate trees**

Create a database trigger: when a tree is inserted, if there's a default/active plantation partner, auto-set `stakeholder_org_id` and `planting_status = 'allocated'`.

**6b. Notification on allocation**

Extend `notify_unassigned_tree` trigger to also notify the plantation partner when trees are allocated to them.

## Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL (schema changes) | Create |
| `src/pages/stakeholder/StakeholderOrders.tsx` | Create |
| `src/pages/stakeholder/StakeholderImpact.tsx` | Create |
| `src/pages/stakeholder/StakeholderPlanting.tsx` | Modify (link to tree orders) |
| `src/pages/stakeholder/StakeholderFinancial.tsx` | Modify (expected vs received) |
| `src/pages/stakeholder/StakeholderDashboard.tsx` | Modify (add order/fund KPIs) |
| `src/components/stakeholder/StakeholderSidebar.tsx` | Modify (add Orders, Impact) |
| `src/pages/institutional/PlantationPartners.tsx` | Modify (show stakeholders + progress) |
| `src/pages/institutional/InstitutionalDisbursements.tsx` | Create |
| `src/pages/institutional/InstitutionalDashboard.tsx` | Modify (add impact section) |
| `src/components/institutional/InstitutionalSidebar.tsx` | Modify (add Disbursements) |
| `src/pages/MyTrees.tsx` | Modify (real partner data) |
| `src/pages/MyImpact.tsx` | Modify (community impact) |
| `src/pages/admin/TreesAll.tsx` | Modify (allocation dropdown) |
| `src/App.tsx` | Modify (new routes) |

## What Will NOT Break

- Existing tree purchase flow (additive column, default value handles existing rows)
- Existing planting/monitoring/nursery workflows (no changes to core tables)
- Existing auth/role-based routing (no changes)
- Existing admin functionality (additive only)
- All existing RLS policies remain intact; new policies are additive

## Recommended Build Order

1. Database migrations (schema + community_impact table)
2. Admin tree allocation (so we can assign trees to test)
3. Stakeholder Orders page (to see allocated trees)
4. KTB Disbursements page (to send funds)
5. Stakeholder Financial enhancements (to see received funds)
6. Community Impact pages (stakeholder input, KTB + tourist output)
7. Tourist portal enhancements (real data in My Trees + My Impact)
8. Automated triggers (auto-allocation, notifications)

This is a large body of work. I recommend implementing it in the order above, one phase at a time, testing each phase before moving to the next.

