# OTOT data model

Canonical schema for One Tourist One Tree (`bakend/src/db/migrations/`). The SPA talks only to the Express API (`bakend`); Postgres is owned by that service. Authorization is application-layer JWT, not Supabase RLS.

Flight CO₂ is calculated by `emission_calculator`. Tree mix, donation amount, payments, and plantation ops live in `bakend`.

## Entity diagram

```mermaid
erDiagram
  users ||--o{ trips : logs
  trips ||--o{ donations : offsets
  users ||--o{ donations : makes
  users }o--o| vendors : "partner staff"
  vendors ||--o{ vendor_agents : employs
  users ||--o{ vendor_agents : "member of"
  tree_types ||--o{ donation_trees : "used in"
  donations ||--o{ donation_trees : contains
  donations ||--o{ payments : "Afrinet checkout"
  donations ||--o| plantation_requests : "1-1 now"
  plantation_requests }o--o| vendors : assigned
  payments ||--o{ payment_allocations : "OTOT / Ministry / partner share"
  payment_allocations }o--o| vendors : "partner share"
  payment_allocations }o--o| payouts : "latest attempt"
  payouts ||--o{ payout_items : settles
  payment_allocations ||--o{ payout_items : "every attempt"
  wallets }o--o| vendors : "partner wallet"
  payouts }o--o| wallets : "sent to"
  plantation_requests ||--o| vendor_plantation_requests : "1-1 now"
  vendor_plantation_requests }o--o| users : "assigned agent"
```

## Tables

### `users`

Single account table for every portal. Ministry is a role, not a separate org. Partner staff also set `vendor_id` and a row in `vendor_agents`.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID (or seeded demo id) |
| `email` | TEXT UNIQUE | Lowercased |
| `name` | TEXT | |
| `role` | TEXT | See roles below |
| `vendor_id` | TEXT FK → vendors | Set for partner_admin / partner_agent |
| `ministry_role` | TEXT | `admin` \| `user` for ministry staff; otherwise NULL |
| `password_hash` | TEXT | bcrypt |
| `created_at` | TIMESTAMPTZ | |

**Roles:** `tourist` · `ministry_admin` · `ministry_user` · `partner_admin` · `partner_agent` · `super_admin`

Tourists self-signup. Ministry and partner accounts are provisioned (seeded in demo). JWT payload: `id`, `email`, `name`, `role`, optional `vendorId` / `ministryRole`. Default expiry 7 days. No OAuth.

| Role | Reads | Writes |
|---|---|---|
| `tourist` | Own trips / donations / payments / related requests | Signup, checkout, create/delete trips, tree-mix quote |
| `ministry_user` | Full store | None |
| `ministry_admin` | Full store | Create/assign/complete plantation requests, pay the partner share of completed requests |
| `partner_admin` | Vendor-scoped store (own partner shares and payouts only) | Create vendor plantation request, update any assignment for that vendor |
| `partner_agent` | Vendor-scoped store | PATCH own vendor plantation request |
| `super_admin` | Full store | All of the above + tree types, vendors, wallets, Ministry/partner payouts, OTOT sweep, reset-demo |

### `vendors`

Plantation partner organisation (group).

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `name` | TEXT | |
| `region` | TEXT | |
| `status` | TEXT | `active` \| `inactive` |

The partner's M-Pesa number lives in `wallets` (migration 010 moved `vendors.mpesa_phone` there). The API still returns it as `Vendor.mpesaPhone` to staff and to that partner.

### `vendor_agents`

Membership of a user in a vendor.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `user_id` | TEXT FK → users | |
| `vendor_id` | TEXT FK → vendors | |
| `role` | TEXT | `admin` \| `agent` |

Unique `(user_id, vendor_id)`.

### `tree_types`

Catalog used to turn a CO₂ volume into a donation amount.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `name` | TEXT | e.g. Acacia |
| `scientific_name` | TEXT | |
| `offset_kg` | NUMERIC(12,2) | Lifetime sequestration assumed per tree |
| `cost_per_tree` | NUMERIC(12,2) | USD plantation cost |
| `active` | BOOLEAN | Inactive types are excluded from mix quotes |

Seeded: Acacia 160 kg / $8, Croton 140 kg / $7, African Cedar 200 kg / $12.

### `trips`

Tourist calculator result. Optional parent of a donation when the traveler offsets that trip.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID (or seeded demo id) |
| `user_id` | TEXT FK → users | Tourist |
| `origin_airport` | TEXT | IATA |
| `destination_airport` | TEXT | IATA |
| `travel_class` | TEXT | `economy` \| `premium_economy` \| `business` \| `first` |
| `is_return` | BOOLEAN | |
| `from_date` | DATE | |
| `to_date` | DATE | |
| `accommodation_type` | TEXT | `none` \| `hotel` \| `rental` \| `cruise` \| `service_apartment` |
| `num_travelers` | INTEGER | ≥ 1 |
| `flight_co2` | NUMERIC(12,2) | kg |
| `accommodation_co2` | NUMERIC(12,2) | kg |
| `total_co2` | NUMERIC(12,2) | kg |
| `trees_needed` | INTEGER | Suggested mix count at save time |
| `distance_km` | NUMERIC(12,2) | Optional |
| `entry_source` | TEXT | `Manual` \| `Partner` |
| `friendly_trip_id` | TEXT | Display id, e.g. `OT-1001` |
| `created_at` | TIMESTAMPTZ | |

Delete is refused when a paid donation is linked. `trees_needed` vs trees on linked paid donations drives Fully / Partially / Not Offset.

### `donations`

Tourist pledge. Starts `pending_payment` until Afrinet webhook/sync marks it `paid`.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `user_id` | TEXT FK → users | Tourist |
| `trip_id` | TEXT FK → trips | Optional; SET NULL if the trip is removed |
| `requested_carbon_offset_kg` | NUMERIC(12,2) | Target from the trip calculator (client input) |
| `carbon_offset_kg` | NUMERIC(12,2) | **Server-computed** mix offset: Σ count × `tree_types.offset_kg` |
| `amount` | NUMERIC(12,2) | **Server-computed** mix cost: Σ count × `cost_per_tree` |
| `status` | TEXT | `pending_payment` \| `paid` \| `refunded` |
| `created_at` | TIMESTAMPTZ | |

Checkout inserts `pending_payment`. `paid` is set only after Afrinet reports `COMPLETED`. `refunded` is unused.

The API still returns `trees: TreeLine[]` by joining `donation_trees`.

### `donation_trees`

Nested tree type + count. Source of truth (JSONB `donations.trees` was removed).

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `{donation_id}:{tree_type_id}` |
| `donation_id` | TEXT FK → donations | Cascade delete |
| `tree_type_id` | TEXT FK → tree_types | |
| `count` | INTEGER | `> 0` |

Unique `(donation_id, tree_type_id)`.

### `payments`

Afrinet hosted checkout. Several attempts per donation are allowed. `external_reference` is the Afrinet idempotency key (`DON-…-n`).

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `donation_id` | TEXT FK → donations | |
| `payment_mode` | TEXT | Updated from webhook: `Card` \| `M-Pesa` \| `Bank Transfer` |
| `status` | TEXT | `pending` until webhook/`sync`; then `success` or `failed` |
| `amount` | NUMERIC(12,2) | USD catalog total |
| `plantation` / `platform` / `ministry` / `processor` | NUMERIC(12,2) | USD split shown to tourists (2.9% fee, then 15/15/70) |
| `external_reference` | TEXT UNIQUE | Afrinet `reference` |
| `afrinet_transaction_code` | TEXT | Engine transaction code |
| `afrinet_status` | TEXT | Last provider status |
| `checkout_url` | TEXT | Redirect target from `charges.create` |
| `mpesa_receipt` | TEXT | From webhook if M-Pesa |
| `failure_message` | TEXT | |
| `currency` | TEXT | Charged currency (`KES` after checkout) |
| `amount_kes` | INTEGER | Whole shillings sent to Afrinet |
| `fee_kes` | INTEGER | Afrinet processing fee in KES (2.9%), set when the payment succeeds |
| `created_at` | TIMESTAMPTZ | |

Money actually moved is tracked in KES by `payment_allocations`, not by the USD split columns.

### `payment_allocations`

One row per recipient for every successful payment (`{payment_id}:{recipient}`), created in the same transaction that marks the payment `success`. This is the per-donation ledger behind Financial Transactions.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `{payment_id}:otot` / `:ministry` / `:partner` |
| `payment_id` | TEXT FK → payments | Unique with `recipient_type` |
| `donation_id` | TEXT FK → donations | |
| `recipient_type` | TEXT | `otot` \| `ministry` \| `partner` |
| `partner_id` | TEXT FK → vendors | Partner share only. NULL until the Ministry assigns the request; unpaid shares follow reassignment, shares already sent block it |
| `amount_kes` | INTEGER | See split below |
| `status` | TEXT | `pending` → `initiated` → `in_progress` → `transferred` \| `failed` (follows its payout) |
| `payout_id` | TEXT FK → payouts | Latest payout attempt; NULL only while `pending` |

**Split (whole KES, `splitKes()` in `src/lib/charges.ts`):** `fee = round(gross × 2.9%)`, `net = gross − fee`, `otot = round(net × 15%)`, `ministry = round(net × 15%)`, `partner = net − otot − ministry`. The four parts always add up to `amount_kes`.

A share is payable when it is `pending` or `failed`, is above 0, and (for partners) has a `partner_id`.

### `payouts`

One M-Pesa B2C transfer through the Afrinet SDK (`payouts.create`) to one recipient, covering one or more shares.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `recipient_type` | TEXT | `otot` \| `ministry` \| `partner` |
| `partner_id` | TEXT FK → vendors | Partner payouts only |
| `wallet_id` | TEXT FK → wallets | Wallet used; the number is also copied to `mpesa_phone` |
| `recipient_name` / `mpesa_phone` | TEXT | Snapshot at send time |
| `amount_kes` | INTEGER | Σ covered shares; ≥ KES 10 (M-Pesa B2C minimum) |
| `status` | TEXT | `initiated` (reserved, before Afrinet answers) → `in_progress` (accepted) → `transferred` \| `failed` |
| `source` | TEXT | `manual` (Super Admin) \| `ministry` \| `auto_per_transaction` \| `auto_daily` \| `legacy` |
| `provider_reference` | TEXT UNIQUE | Our `PO-{OTOT\|MIN\|PTR}-…` Afrinet reference |
| `transaction_code` | TEXT | Afrinet transaction code |
| `failure_message` | TEXT | |
| `created_by` | TEXT FK → users | |
| `settled_at` | TIMESTAMPTZ | When it became `transferred` / `failed` |

Webhook `COMPLETED` → `transferred`; `FAILED` / `PROVIDER_ERROR` → `failed` (its shares become payable again); other statuses → `in_progress`. A definite 4xx rejection from the SDK fails the payout immediately. A timeout or 5xx leaves it `initiated` with a note, because Afrinet may have accepted it; Super Admin resolves it from the Payouts tab after checking the merchant portal. Payout creation takes an advisory lock and refuses to exceed the calculated merchant balance (successful `amount_kes` − `fee_kes` − payouts not `failed`). Afrinet has no balance endpoint.

### `payout_items`

`(payout_id, allocation_id, amount_kes)`. Every attempt that carried a share, including failed ones, so each donation can be traced to every transfer.

### `wallets`

M-Pesa destinations. One per owner: `wallet-otot`, `wallet-ministry`, `wallet-partner-{vendor_id}`.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Deterministic per owner |
| `owner_type` | TEXT | `otot` \| `ministry` \| `partner` |
| `partner_id` | TEXT FK → vendors | Partner wallets only |
| `label` | TEXT | |
| `mpesa_phone` | TEXT | Normalised `254XXXXXXXXX` (CHECK) |
| `updated_by` / `updated_at` | | |

### OTOT sweep (Tech Processing Fee)

The OTOT tech processing fee goes to the OTOT wallet. Super Admin picks the mode on **Wallets** (stored in `app_settings`; `OTOT_SWEEP_MODE` / `OTOT_SWEEP_HOUR_EAT` are only the defaults until then). Changes apply without a restart.

- **End of day** (`daily`, default): one transfer per day at the chosen hour (EAT) covering every pending OTOT fee. M-Pesa B2C charges a flat fee per transfer, so this pays that fee once instead of once per donation.
- **Every transaction** (`per_transaction`): transfer after each successful payment. Use this only if the per-payout fee is a pure percentage, which gives the same net result either way.
- **Manual only** (`manual`): nothing automatic.

In every mode Super Admin can transfer manually: **Transfer now** on the Financial Transactions OTOT card (all pending fees in the current date filter), **Transfer OTOT fee** for ticked donations, or **Transfer now** on Wallets (all pending). Amounts below KES 10 wait for the next transfer.

### `app_settings`

`key` TEXT PK, `value` TEXT, `updated_by`, `updated_at`. Keys: `otot_sweep_mode`, `otot_sweep_hour_eat`.

### Legacy tables

Migration 010 copied `plantation_payouts` and `admin_disbursements` into `payouts` (as `legacy` / `manual`), linked them to shares, and renamed the originals to `legacy_plantation_payouts` / `legacy_admin_disbursements` for audit. Per-request payouts cover every partner share of that request. Lump-sum disbursements cover the oldest shares they fully pay. Any remainder is listed on the Wallets screen as "not matched to donations".

### `webhook_events`

Audit log of Afrinet callbacks (`POST /webhooks/afrinet`). Idempotent settle uses `reference` / `transaction_code` on payments and payouts.

### `plantation_requests`

Ministry work order. **1:1 with donation today** (`donation_id` UNIQUE). Paid checkout (Afrinet `COMPLETED`) auto-creates a row with status `unassigned`. Ministry assigns a vendor. Manual `POST /v1/plantation-requests` is idempotent (returns the existing row) and requires a paid donation.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `donation_id` | TEXT UNIQUE FK → donations | Future: many donations may combine into one request |
| `status` | TEXT | See status machine |
| `assigned_to` | TEXT FK → users | Partner admin contact when assigned |
| `partner_id` | TEXT FK → vendors | Assigned organisation |
| `amount` | NUMERIC(12,2) | Donation gross amount |
| `created_at` | TIMESTAMPTZ | |

**Status:** `unassigned` → `assigned` → `in_progress` → `ready_for_review` → `completed`

`in_progress` is set when a vendor plantation request is created. `ready_for_review` is set when every mapped vendor request is `completed`. Ministry can mark `completed` only then.

### `vendor_plantation_requests`

Vendor-side job. **1:1 with plantation_request today** (`plantation_request_id` UNIQUE). Partner admin assigns an agent in that vendor.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `plantation_request_id` | TEXT UNIQUE FK | Future: several vendor jobs per ministry request |
| `vendor_id` | TEXT FK → vendors | |
| `assigned_agent_id` | TEXT FK → users | Must be `partner_agent` of `vendor_id` |
| `status` | TEXT | `assigned` → `in_progress` → `completed` |
| `created_at` | TIMESTAMPTZ | |

Agents may only PATCH their own row. Partner admins may PATCH any row for their vendor.

## Carbon offset → donation amount

1. Tourist calculates trip CO₂ via `emission_calculator` (`POST /api/v1/carbon-calculator/calculate`). That service’s generic `$10` / 840 kg tree estimate is **not** used.
2. Frontend (and `POST /v1/tree-mix/quote`) picks up to three active species and sets `count = ceil((target / n) / offset_kg)` per species (minimum 1).
3. `amount = Σ count × cost_per_tree`. `carbon_offset_kg = Σ count × offset_kg`.
4. Checkout persists the client target as `requested_carbon_offset_kg` and the mix totals as `amount` / `carbon_offset_kg`. Tree lines go to `donation_trees`.

## Live flow

1. Tourist picks Card or M-Pesa.
   - M-Pesa: STK prompt, then `/donate/awaiting/:paymentId`.
   - Card: redirect to Afrinet `HOSTED_CHECKOUT`; `returnUrl` / `cancelUrl` land back on awaiting.
2. Webhook `POST /webhooks/afrinet` (and optional `/v1/payments/:id/sync`) settles `COMPLETED` → donation `paid` + unassigned `plantation_requests` + three `payment_allocations`. The OTOT share is swept to the OTOT wallet (see OTOT sweep).
3. Ministry admin assigns a vendor (`assigned_to` = that vendor’s partner admin). This sets `partner_id` on the partner shares and makes them payable.
4. Partner admin creates `vendor_plantation_requests` for an agent → parent status `in_progress`.
5. Agent (or vendor admin) moves vendor status to `completed`. When all sibling vendor jobs are complete, parent becomes `ready_for_review`.
6. Ministry admin marks the plantation request `completed`, then may pay that request's partner share (`POST /v1/payouts`).
7. Super Admin selects donations on Financial Transactions and pays Ministry fees or vendor payouts (one transfer per recipient). Vendors can be paid once assigned, even before completion.

## API (authenticated unless noted)

| Method | Path | Who |
|---|---|---|
| `GET` | `/health` | public |
| `GET` | `/ready` | public |
| `POST` | `/v1/auth/login` | public |
| `POST` | `/v1/auth/signup` | public (tourist) |
| `GET` | `/v1/auth/me` | any signed-in user |
| `POST` | `/v1/auth/logout` | client-side; server no-op |
| `GET` | `/v1/store` | signed-in; role-scoped snapshot |
| `POST` | `/v1/tree-mix/quote` | signed-in |
| `POST` | `/v1/trips` | tourist |
| `DELETE` | `/v1/trips/:id` | tourist (own trip; blocked if paid trees exist) |
| `POST` | `/v1/donations/checkout` | tourist — pending donation, returns `checkoutUrl` |
| `GET` | `/v1/payments/:id` | owner / staff |
| `POST` | `/v1/payments/:id/sync` | tourist — local mock completes when Afrinet is off; live waits on webhook |
| `POST` | `/v1/donations/:id/retry` | tourist — new pending payment + checkout URL |
| `POST` | `/webhooks/afrinet` | public, HMAC |
| `POST` | `/v1/plantation-requests` | ministry admin (idempotent) |
| `POST` | `/v1/plantation-requests/:id/assign` | ministry admin |
| `POST` | `/v1/plantation-requests/:id/complete` | ministry admin |
| `POST` | `/v1/payouts` | ministry admin — partner share of a completed request |
| `POST` | `/v1/payouts/:id/simulate-success` | ministry admin (non-production) |
| `GET` | `/v1/admin/wallets` | super admin — wallets, calculated balance, amounts owed, sweep status |
| `PUT` | `/v1/admin/wallets` | super admin — `{ ownerType, partnerId?, mpesaPhone }` |
| `POST` | `/v1/admin/wallets/otot/sweep` | super admin — transfer pending OTOT fee now; optional `{ donationIds }` |
| `PUT` | `/v1/admin/wallets/otot/sweep-settings` | super admin — `{ mode: daily \| per_transaction \| manual, hourEat }` |
| `POST` | `/v1/admin/payouts` | super admin — `{ recipientType, donationIds? }`; partner shares grouped per vendor |
| `POST` | `/v1/admin/payouts/:id/resolve` | super admin — `{ status: transferred \| failed, transactionCode?, note? }` for stuck payouts |
| `POST` | `/v1/vendor-plantation-requests` | partner admin |
| `PATCH` | `/v1/vendor-plantation-requests/:id` | partner admin / assigned agent |
| `PUT` | `/v1/tree-types` | super admin |
| `PUT` | `/v1/vendors` | super admin |
| `POST` | `/v1/admin/reset-demo` | super admin |

## Intentionally not built yet

- OAuth / SSO
- Combining several donations into one plantation request (drop `plantation_requests.donation_id` UNIQUE and add a join table)
- Several vendor jobs per ministry request (drop `vendor_plantation_requests.plantation_request_id` UNIQUE)
- Ministry / vendor user-invite CRUD
- Proof-of-planting uploads

## Afrinet ops

- Portal callback is `https://onetouristonetree.com/webhooks/afrinet` (this API). Must return 2xx.
- M-Pesa: SDK `charges.create` with `paymentType: "mpesa"` C2B STK.
- Card: SDK `charges.create` with `paymentType: "card"`, `mode: "HOSTED_CHECKOUT"`, `returnUrl` / `cancelUrl`.
- Sandbox card may still fail with `CARD_PROVIDER_ERROR`; tourists can switch to M-Pesa.
- Use sandbox until live `api.afrinet.global` accepts the merchant key.
- Fund the merchant wallet before B2C payouts (`INSUFFICIENT_FUNDS` otherwise).
- Charges accept an optional `transfer[]` split to Afrinet settlement account numbers (`accountNo`, not M-Pesa numbers). If OTOT gets its own Afrinet settlement account, the OTOT share could be split at charge time instead of swept.
- Secrets on the API service only. Never `VITE_*`.

## Demo accounts

Password `Test1234!` for all seeded users: `tourist@demo.otot.app`, `ministry@demo.otot.app`, `ministryuser@demo.otot.app`, `partner@demo.otot.app`, `partneragent@demo.otot.app`, `superadmin@demo.otot.app`.
