
# WYSIWYG Templates Studio — Rewrite Plan

## Goal
Replace the current block-list designer in **Templates Studio (super admin)** with a TipTap-based WYSIWYG editor. Users pick a document type → pick a pre-designed starter → edit visually with live preview → save / approve / assign. List view (name, type, status, version, updated, actions) stays as-is. PDF output continues to go through `@react-pdf/renderer`; emails/social use plain HTML/text.

## Scope

### In scope
- New "New template" flow: category picker → starter gallery → editor.
- New WYSIWYG editor sheet using TipTap, replacing `TemplateDesignerSheet.tsx`.
- Category-specific canvases (certificate, invoice, email, social) with KTB-branded starters (2–3 per category).
- Live HTML preview pane + "Preview PDF" using existing react-pdf renderer.
- Merge-field chips (insert `{{userName}}`, `{{numTrees}}`, etc. as inline nodes).
- Logo upload / token slots (KTB left, partner right).
- Backwards compatibility: existing `design_json` rows continue to render and open in a read-only legacy view; new edits save in the new schema.

### Out of scope (unchanged)
- Templates list table, status workflow (draft → pending → approved → archived), versioning, engine flags, assignments sheet.
- Resolver (`resolveTemplate.ts`), category metadata, certificate/invoice/email consumers downstream.

## User flow

```text
Templates Studio
  └─ [New template]
       └─ Step 1: Choose category   (Pledge cert / Tree cert / Invoice (3) / Receipt / Email / Social (3))
       └─ Step 2: Choose starter    (2–3 thumbnails per category, e.g. Classic / Modern / Minimal)
       └─ Step 3: Editor opens
            ├─ Top bar: name, category badge, Save draft, Preview PDF, Submit for approval, X
            ├─ Left:  Toolbar (B I U • headings • align • color • image • merge-field chip • undo/redo)
            ├─ Center: WYSIWYG canvas (page-sized, paginated visual frame)
            └─ Right: Inspector (logos, primary/accent color, page size/orientation, merge-field palette)
List view unchanged. Row actions: View (PDF), Edit (reopens editor), Approve, Assign, Archive, Delete.
```

## Design data model

Keep tables (`document_templates`, `template_designs`, `template_assignments`, `template_engine_flags`, `template_categories`). Evolve `template_designs.design_json` shape:

```ts
// src/lib/templates/types.ts (extended)
type TemplateDesignV2 = {
  version: 2;
  starterKey: string;          // e.g. 'tree_certificate.classic'
  style: { primaryColor; accentColor; fontFamily; pageSize; orientation; margin };
  logos: { left?: string; right?: string };     // tokens or data-URLs
  // TipTap JSON for each named zone the starter exposes
  zones: Record<string, TipTapJSON>;            // e.g. { header, body, footer, signature }
  // For social/email categories
  subject?: TipTapJSON;        // email subject (plain text node)
  hashtags?: string[];         // social
};
```

`version: 1` rows keep working via the existing renderer; new editor only writes `version: 2`. A small adapter `migrateDesignV1toV2(d)` provides a one-shot import path so a legacy template opened in the new editor offers "Convert to WYSIWYG" instead of silent rewrite.

## File plan

New
- `src/components/admin/templates/wysiwyg/NewTemplateDialog.tsx` — 2-step picker (category → starter).
- `src/components/admin/templates/wysiwyg/StarterGallery.tsx` — thumbnail grid per category.
- `src/components/admin/templates/wysiwyg/TemplateEditor.tsx` — full-screen sheet hosting toolbar + canvas + inspector.
- `src/components/admin/templates/wysiwyg/EditorToolbar.tsx` — TipTap toolbar (formatting, image, merge-field, undo/redo).
- `src/components/admin/templates/wysiwyg/MergeFieldExtension.ts` — TipTap node for `{{field}}` chips.
- `src/components/admin/templates/wysiwyg/Inspector.tsx` — logos, colors, page settings.
- `src/components/admin/templates/wysiwyg/canvases/CertificateCanvas.tsx`
- `src/components/admin/templates/wysiwyg/canvases/InvoiceCanvas.tsx`
- `src/components/admin/templates/wysiwyg/canvases/EmailCanvas.tsx`
- `src/components/admin/templates/wysiwyg/canvases/SocialCanvas.tsx`
- `src/lib/templates/starters/index.ts` — registry of starters keyed by `CategoryKey`.
- `src/lib/templates/starters/<category>/*.ts` — KTB-branded preset JSON (2–3 per category).
- `src/lib/templates/htmlToPdf.tsx` — maps TipTap JSON per zone into `@react-pdf/renderer` primitives (Text / View / Image / list).
- `src/lib/templates/migrateDesign.ts` — V1→V2 adapter.

Edit (small, surgical)
- `src/pages/admin/config/Templates.tsx` — "New template" button opens `NewTemplateDialog`; edit row opens `TemplateEditor` for V2 designs, falls back to the legacy `TemplateDesignerSheet` only when `design.version !== 2`. Add a "Delete" action (soft delete via existing `archived` status, plus a hard-delete confirm for drafts).
- `src/lib/templates/renderTemplate.tsx` — add `renderTemplateDocumentV2(design, vars)` branch that walks zones and delegates to `htmlToPdf.tsx`. V1 path untouched.
- `src/lib/templates/types.ts` — add V2 types alongside V1.
- `src/hooks/useTemplates.ts` — `useCreateTemplate` accepts the V2 design shape (already generic over `design`).

Delete
- None. `TemplateDesignerSheet.tsx` stays as a fallback for V1 rows until they are converted.

## Editor specifics

- TipTap extensions: `StarterKit`, `Underline`, `TextAlign`, `Color`, `TextStyle`, `Image`, `Link`, `Placeholder`, custom `MergeField` (atom inline node rendering as a styled chip).
- The canvas wraps each zone in a fixed-width page frame (`A4` or `LETTER`, portrait/landscape) so what you see ≈ output.
- Inspector edits write straight to `design.style` / `design.logos`; zones update via `editor.getJSON()` on blur and on save.
- Live HTML preview is the canvas itself; "Preview PDF" reuses `pdf(renderTemplateDocumentV2(...))` with `getSampleData(category.key)` and the same logo injection already in `TemplateDesignerSheet.preview()`.

## Starters (initial set)

- `pledge_certificate`: Classic (current locked layout, ported), Modern minimal.
- `tree_certificate`: Classic landscape, Portrait modern, Compact.
- `tourist_invoice` / `b2b_invoice` / `agent_invoice`: Standard, Compact.
- `lodge_receipt`: Standard.
- `social_share_*`: Short, Long, Hashtag-heavy.
- Email categories (if `output_kind === 'email'` exists; otherwise add later): Newsletter, Transactional, Announcement.

## TipTap → react-pdf mapping

`htmlToPdf.tsx` walks TipTap JSON nodes and emits react-pdf primitives:

```text
doc/paragraph      -> <Text>
heading            -> <Text style={h1|h2|h3}>
bulletList/orderedList/listItem -> <View> + <Text>•</Text> rows
image              -> <Image src=... />
mergeField (atom)  -> substitute(vars[name])
hardBreak          -> "\n"
marks: bold/italic/underline/color/textAlign -> style props
```

Unknown nodes fall back to plain text so future extensions can't break rendering.

## Risks & mitigations

- **Visual parity for approved pledge certificate**: keep the locked `pledge_default` V1 renderer; the WYSIWYG pledge starter writes V2 but the resolver's "approved+assigned" template wins, so existing assignments stay pixel-identical until an admin promotes a V2 design.
- **react-pdf style gaps** (no flex gap, limited fonts): constrain toolbar to supported marks; pre-register fonts already used in the project.
- **Pagination differences** between HTML preview and PDF: the page frame uses the same margin/orientation, with a warning banner when content overflows one page.
- **Migrations not required**: schema unchanged; only `design_json` shape evolves.

## Testing

- Manually create a draft in each category, verify save → reopen → preview → approve → assign → resolve → download.
- Open an existing V1 approved template: confirm it still resolves and downloads identically (legacy renderer path).
- Run the existing tourist/agent certificate download paths to confirm no regression.

## Out-of-scope confirmations

- No DB migration.
- No changes to certificate / invoice / receipt generators on the consumer side.
- No new dependencies beyond TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-*`).
