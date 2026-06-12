## Goal

Add a Super Admin **Templates Studio** under Configuration to design, preview, version, approve, and assign templates for all customer‑facing documents and share messages. Approved templates become the runtime source of truth for generators (`certificateGenerator.tsx`, `invoiceGenerator.ts`, future ones), with **guaranteed zero regression**: the existing hard‑coded generators stay intact and continue to render unchanged until an approved template is explicitly assigned for that document.

## Non‑negotiable seamless‑integration guarantees

1. **Existing generators are not modified structurally** — only a thin "try template first, else fall back" head is added. The current `<PledgeCertificate>`, `<TreeCertificate>` components and the jsPDF agent invoice remain the default fallback path forever.
2. **No existing table, column, RLS policy, trigger, edge function, or route is altered.** All schema work is additive (new tables only).
3. **All call sites keep their current signatures** — `generatePledgeCertificate`, `generateTreeCertificate`, `generateInvoice` still accept the same params and return the same `Blob` / same download UX.
4. **Default state after migration = template system inactive.** No template is approved or assigned, so every download path produces byte‑identical output to today. Activating a template is an explicit super_admin action.
5. **Per‑category kill switch** in `wallet_settings`‑style config (`template_engine_enabled.<category_key>` bool). If any rendering issue surfaces post‑launch, flipping the switch instantly reverts that category to the hard‑coded path with no deploy.
6. **Runtime resolver is defensive**: if `resolveTemplate` throws, the template render fails, or required merge fields are missing, the generator silently falls back to the existing component. Errors are logged to `integration_logs` for visibility but never block the user's download.
7. **Sample data parity check** is baked into the approval flow — a template cannot be approved until a side‑by‑side preview against the existing hard‑coded output for that category has been generated and the approver explicitly confirms parity.

## Template categories (v1)

| Category key | Output | Used by today |
|---|---|---|
| `pledge_certificate` | PDF | `generatePledgeCertificate` |
| `tree_certificate` | PDF | `generateTreeCertificate` |
| `tourist_invoice` | PDF | (new — tourist contribution receipt) |
| `b2b_invoice` | PDF | (new — institutional contribution) |
| `agent_invoice` | PDF | `generateInvoice` (jsPDF) |
| `lodge_receipt` | PDF | (future) |
| `social_share_pledge` | text/card | Pledge share buttons |
| `social_share_contribution` | text/card | Tree purchase share |
| `social_share_generic` | text/card | Referral share |

Each category has a fixed merge‑field allow‑list derived from the actual props of the existing components and the attached PDFs:

- Pledge cert: `userName`, `date`, `certificateId`, `ototId`, `qrCodeUrl`, `ktbLogoUrl`, `partnerLogoUrl`.
- Tree cert: above + `numTrees`, `co2Offset`, `location`, `partnerName`.
- Agent invoice: `ticketNumber`, `pnr`, `lpo`, `staffName`, `origin`, `destination`, `travelClass`, `treesNeeded`, `co2Kg`, `amountKes`, `agentBusinessName`, `agentContact`, `billToBlock`.
- Social: `userName`, `numTrees`, `co2Offset`, `verificationUrl`, `hashtags`.

## 1. Database (additive only)

Four new tables, all `public` schema, with `GRANT`s, RLS via `has_role(_, 'super_admin')` for writes and `authenticated` read on approved rows, `updated_at` triggers, and `mdm_audit_log` rows on create/update/approve/archive.

- `template_categories` (seeded ref): `key` PK, `label`, `output_kind`, `merge_fields` jsonb allow‑list, `default_page_size`, `default_orientation`.
- `document_templates`: `id`, `category_key` FK, `name`, `description`, `status` enum (`draft`|`pending_approval`|`approved`|`archived`), `is_default` bool, `version` int, `current_design_id` FK, `created_by`, `approved_by`, `approved_at`, `parity_confirmed_at`.
- `template_designs` (immutable snapshots): `id`, `template_id` FK, `version` int, `design_json` jsonb, `preview_png_url`, `created_by`.
- `template_assignments`: `id`, `category_key`, `template_id` FK, `scope` enum (`global`|`partner`|`portal`), `scope_ref_id` uuid null, `is_active` bool, `priority` int. Resolution: most specific active assignment wins → global default → none.

Plus one row per category in `wallet_settings` (or a new `system_flags` table — TBD during build, additive either way) for the `template_engine_enabled.<category>` kill switch.

## 2. Super Admin UI — `/admin/config/templates`

New route added to `App.tsx` and a "Templates" entry under Configuration in `AppSidebar.tsx` (super_admin only). Both edits are pure additions.

### List view
Per‑category tabs. Columns: Name, Version, Status, Default?, Assignments, Updated, ⋯ menu (Edit, Duplicate, Submit for Approval, Approve, Archive, Set Default, Manage Assignments).

### Designer (side‑sheet, closes only via top‑right X — per project standard)

Structured block editor (not free HTML) so output stays consistent:

- **Header block**: left logo slot (default KTB locked), right logo slot (token `{{partnerLogoUrl}}` with KFS fallback), title, subtitle.
- **Body blocks** (reorderable): "Awarded to" line, big name, paragraph with merge‑field chips, stats row, signature row, QR + ID block.
- **Footer block**: small print, verification URL.
- **Style panel**: primary color, accent color, font pair (preset list), page size, orientation, margins.
- **Merge‑field inserter**: dropdown filtered to the category's allow‑list; inserts a chip into the focused text block.

Social categories collapse the designer to: message template with token chips, optional background image slot, hashtag list, character counter, per‑network preview.

### Preview & approve

- Live preview pane renders via the same `@react-pdf/renderer` pipeline used today, fed by sample data from the category's allow‑list.
- "Generate parity preview" button renders both the new template and the current hard‑coded component side by side. Approver must tick **"Output parity confirmed"** before the Approve action enables. This sets `parity_confirmed_at`.
- Approved templates are immutable; edits create a new draft version.

### Assignments
Side panel on each approved template: global default toggle (one per category), per plantation partner override (picker over `organizations` where `category='owner'`), per portal override (`tourist`|`b2b`|`agent`|`lodge`).

## 3. Runtime integration (minimal, defensive, additive)

New, isolated files — no rewrites:

- `src/lib/templates/resolveTemplate.ts` — pure function. Returns the approved template best matching `(categoryKey, { partnerOrgId, portal })`, or `null`. Wrapped in try/catch; on any error returns `null`.
- `src/lib/templates/renderTemplate.tsx` — walks `design_json`, produces a `@react-pdf/renderer` `<Document>` for PDF categories or `{ text, hashtags, imageUrl }` for social. Validates all required merge fields are present; if any are missing, throws so the caller falls back.
- `src/lib/templates/flags.ts` — reads the `template_engine_enabled.<category>` kill switch (cached for the session).

Existing generators get a thin head only:

```ts
// certificateGenerator.tsx (pledge)
if (await isTemplateEngineEnabled('pledge_certificate')) {
  try {
    const tpl = await resolveTemplate('pledge_certificate', { partnerOrgId });
    if (tpl) {
      const doc = renderTemplate(tpl, { userName, date, certificateId, ototId, qrCodeDataUrl, ktbLogoDataUrl, kfsLogoDataUrl });
      return await pdf(doc).toBlob();
    }
  } catch (e) {
    logIntegrationError('pledge_certificate', e);
    // fall through to existing path
  }
}
// existing hard-coded path — UNCHANGED
return await pdf(<PledgeCertificate {...props} />).toBlob();
```

Same shape for tree certificate and agent invoice. The fallback path is byte‑identical to today.

A new helper `getShareMessage(categoryKey, context)` is added for social categories. Existing share components don't have to adopt it immediately; they can opt in one at a time.

## 4. Logos & partner branding

- KTB logo: left slot, locked, sourced from `src/assets/ktb-dual-logo.png` (already used).
- Right slot: bound to `{{partnerLogoUrl}}`. At render time, resolved from the tree/contribution's `owner_org_id` → `organizations.logo_url`. Falls back to KFS (`src/assets/kfs-logo-2.png`) if null. No schema change required.

## 5. Regression safety checklist (run before each merge)

- Download a pledge cert with no templates seeded → file hash matches today.
- Same for tree cert and agent invoice.
- Approve a template that intentionally omits a required field → user download still succeeds via fallback, error is logged.
- Toggle the per‑category kill switch off → behavior reverts immediately, no deploy.
- Run the Supabase linter after the migration; resolve any new findings on the four new tables before sign‑off.

## 6. Files touched

- New migration: 4 tables + enums + RLS + grants + seed of `template_categories` + kill‑switch rows. No edits to existing tables.
- New: `src/pages/admin/config/Templates.tsx`, `TemplateDesigner.tsx`, `TemplateAssignments.tsx`.
- New: `src/components/admin/templates/*` (BlockEditor, StylePanel, MergeFieldChip, PreviewPane, ParityPreview, SocialPreview).
- New: `src/hooks/useTemplates.ts`, `useTemplateAssignments.ts`.
- New: `src/lib/templates/resolveTemplate.ts`, `renderTemplate.tsx`, `flags.ts`, `sampleData.ts`.
- Edit (thin head only, behind kill switch, fallback preserved): `src/utils/certificateGenerator.tsx`, `src/utils/invoiceGenerator.ts`.
- Edit (additive): `src/components/AppSidebar.tsx`, `src/App.tsx` route registration.

## 7. Out of scope (v1)

- WYSIWYG free HTML editing — blocks only.
- Custom font uploads.
- Email body templates.
- Multi‑language variants (structure leaves room via `design_json.locale`).
- Auto‑posting to social networks.

## 8. Acceptance

- Super admin can design, preview, parity‑confirm, approve, and assign a Tree Certificate template; next tourist tree download renders from the template with the partner's logo on the right.
- Same loop verified for pledge cert and agent invoice against the attached PDFs.
- With no approved template / kill switch off, every existing download path produces byte‑identical output to today.
- Toggling the kill switch instantly reverts any category to the hard‑coded path.
