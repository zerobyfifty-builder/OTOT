

## Implementation Plan: Engagement Actions (Revised)

### 1. View Certificate (replaces Issue Certificate)
The tourist portal already generates a certificate per contribution via `certificateGenerator.tsx` + `TreeCertificate.tsx`, displayed through `CertificatePreviewDialog` (wrapping `PdfPreviewDialog`).

- Click **View Certificate** → fetch the contribution + tourist (contributor) details using the order's `contribution_id`
- Reuse `certificateGenerator` to render the **same** certificate the tourist sees (same contribution ID, contributor name, tree count, trip)
- Open in `CertificatePreviewDialog` with Share / Open in New Tab / Download (matches uploaded screenshot exactly)
- On open → write log entry: `"Certificate viewed for {contribution_id} by {actor}"`

No new generator needed — we call the existing utility with the order's data so the output is byte-identical to the tourist-side certificate.

### 2. Send Update to Contributor
Use Lovable Email + a new edge function.

- Click → composer dialog with:
  - Subject (pre-filled: `"Update on your trees — {contribution_id}"`)
  - Body textarea (pre-filled template: tree count, current planting status, anniversary date)
  - "Include impact summary" checkbox (auto-appends planting progress + photo count)
- Submit → edge function `send-contributor-update`:
  - Looks up contributor email by `contribution_id`
  - Sends branded KTB email
  - Inserts row into `engagement_activities`
- Toast on success + appears in Log tab

*Requires email domain setup — will trigger setup dialog on first use.*

### 3. Download Report
Generate a PDF using existing `jsPDF` patterns (per `tech/pdf-formatting-standards`, `institutional/reports-module`).

Contents:
- KTB header + "Tree Order Engagement Report"
- Order Info (Contribution ID, Contributor, Trees, Amount, Trip)
- Planting status timeline (`tree_status_transitions`)
- Photos count, geotag (if mapped), anniversary date
- Activity log (all engagement actions)

Open in `PdfPreviewDialog` (project standard — never auto-download). Log: `"Report downloaded by {actor}"`.

### 4. Persistence Upgrade
Replace `localStorage` log with a real table:

```sql
create table engagement_activities (
  id uuid primary key default gen_random_uuid(),
  contribution_id text not null,
  activity_type text check (activity_type in
    ('certificate_viewed','update_sent','report_downloaded')),
  description text not null,
  metadata jsonb default '{}',
  actor_user_id uuid,
  actor_email text,
  created_at timestamptz default now()
);
-- RLS: stakeholders read/insert within their org scope
```

Log tab reads from this table via React Query.

### Files
- `src/pages/stakeholder/StakeholderOrders.tsx` — wire 3 buttons, swap localStorage for query hook
- `src/components/engagement/SendUpdateDialog.tsx` (new) — email composer
- `src/utils/engagementReportGenerator.ts` (new) — jsPDF report
- `supabase/functions/send-contributor-update/index.ts` (new)
- New migration: `engagement_activities` + RLS
- Reuse: `certificateGenerator`, `CertificatePreviewDialog`, `PdfPreviewDialog`

### Build Order
1. Migration + React Query hook for `engagement_activities`
2. **View Certificate** (fastest — pure reuse of existing generator)
3. **Download Report** (new generator, reuses PDF preview)
4. **Send Update** (last — needs email domain)

### Confirm Before Build
- **Send Update**: free-form composer or fixed template with a few editable fields?
- **Report**: include photos inline, or just counts/links?
- **Logs**: persist to DB now (recommended), or keep localStorage for v1?

