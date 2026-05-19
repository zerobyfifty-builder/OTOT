# Plan: Unified Owners Admin Page with Tabs (route-backed)

Consolidate three admin Owner pages into one tabbed UI while keeping a distinct URL for each tab. Pure UI/navigation refactor — no business logic, data, or feature changes.

## Why this structure works

- **Clutter-free UI**: one page header, one tab strip — instead of three sidebar entries.
- **Deep-linkable**: each tab has its own URL, so bookmarks, browser back/forward, and direct links keep working.
- **Expandable**: adding a future tab (e.g. "Workflow Assignment" like the reference) is one new route + one new `TabsTrigger`.
- **Zero risk to features**: existing page components are reused as-is inside `TabsContent`.

## Current state

- `/admin/owners` → `AllOwners.tsx`
- `/admin/owners/modules` → `OwnerModules.tsx`
- `/admin/owners/logs` → `OwnerLogs.tsx`
- `/admin/owners/create` → `CreateOwner.tsx` (sub-page, stays)
- Sidebar lists All Owners / Create New / Module Assignment / Activity Logs as four separate items.

## Target state

A shared layout component renders the page header ("Owners" / "Create and manage owner portals") and a `Tabs` strip with three triggers. Each route below mounts the same layout and pre-selects its tab:

| URL | Tab active | Content |
|---|---|---|
| `/admin/owners` | All Owners | `<AllOwners />` |
| `/admin/owners/modules` | Module Assignment | `<OwnerModules />` |
| `/admin/owners/logs` | Activity Log | `<OwnerLogs />` |

Clicking a tab uses `navigate(url)` so the URL stays in sync (no `?tab=` query param needed). `/admin/owners/create` remains a separate full page reached from the "Create New Owner" button.

## Changes

### New shared layout
- `src/pages/admin/owners/OwnersLayout.tsx`
  - Renders header + `Tabs` with `value` derived from `useLocation().pathname`
  - `onValueChange` calls `navigate(targetUrl)`
  - Renders `<Outlet />` inside the active `TabsContent`

### Routing (`src/App.tsx`)
- Wrap the three existing routes as nested children of a parent route using `OwnersLayout` as the element.
- All three routes preserved (no redirects removed, no new redirects added).
- `/admin/owners/create` stays outside the layout (full page).

### Existing pages
- `AllOwners.tsx`, `OwnerModules.tsx`, `OwnerLogs.tsx` keep all logic.
- Trim only their outer page-header block (title + description) since the layout now owns it. All tables, dialogs, filters, mutations untouched.

### Sidebar (`AdminSidebar.tsx`)
- Collapse the four entries under Owners into two: **Owners** (`/admin/owners`) and **Create New** (`/admin/owners/create`).
- Tab switching happens inside the page; sidebar stays clean.

## Out of scope / unchanged
- Supabase queries, mutations, RLS, edge functions
- `CreateOwner` flow
- Owner portal (`/owner/*`) routes and components
- Visual identity / branding tokens

## Verification
- Visiting each of the three URLs lands on the right tab with header visible.
- Clicking tabs updates the URL; browser back/forward moves between tabs.
- "Create New Owner" button still routes to `/admin/owners/create`.
- Module toggles + log filters behave identically.
- Sidebar "Owners" item stays highlighted on all three tab URLs.
