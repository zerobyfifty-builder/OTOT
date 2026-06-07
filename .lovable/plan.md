# Add NGO as a Third Partner Category

## 1. Database migration
Extend the `category` allow-list on `organizations` and `partner_types` to include `'ngo'`.

```sql
ALTER TABLE public.organizations DROP CONSTRAINT organizations_category_check;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_category_check
  CHECK (category = ANY (ARRAY['government','business','ngo','owner']));

-- same for partner_types (its check constraint will be updated identically,
-- minus 'owner' which isn't a partner_types value)
```
No data migration needed — existing rows remain valid.

## 2. Type updates
- `src/types/partner.ts`: `PartnerCategory = 'government' | 'business' | 'ngo'`.

## 3. Create Partner wizard
- `CreatePartnerSheet.tsx`: add `<SelectItem value="ngo">NGO</SelectItem>` to the category dropdown. NGO follows the same form path as government (no bank/business-reg fields). Update the `form.category` union type and the ministry-gated branches so NGO doesn't require ministry.
- `create-partner-user` edge function: map `category === 'ngo'` to a role. Reuse `government_partner` role for now (least-disruption); flag this as a follow-up if a dedicated `ngo_partner` role is needed.

## 4. All Partners — tabbed view
Refactor `src/pages/admin/AllPartners.tsx`:
- Replace the "Filter by category" dropdown with three shadcn `Tabs`: **Government**, **Business**, **NGO**.
- Each tab renders the same table/search/pagination, scoped by `.eq('category', activeTab)`.
- Remove the "All Categories" option (tabs supersede it).
- Per-tab empty state copy ("No NGO partners yet", etc.).
- Counts shown on each tab trigger (badge with row count for that category).

## 5. Filter cleanup
- `PartnersInstitutional.tsx` / `PartnersBusiness.tsx` remain unchanged (still filter by their fixed category). No new dedicated NGO page is added — the All Partners tab is the entry point per the request.
- Admin sidebar: no new link required.

## Files touched
- `supabase/migrations/<new>.sql` (constraint update)
- `src/types/partner.ts`
- `src/components/admin/partners/CreatePartnerSheet.tsx`
- `src/pages/admin/AllPartners.tsx`
- `supabase/functions/create-partner-user/index.ts`

## Open question
The role mapping for NGO: reuse `government_partner` (default), or should I add a new `ngo_partner` role + RLS in the same migration? I'll default to **reusing `government_partner`** unless you say otherwise.
