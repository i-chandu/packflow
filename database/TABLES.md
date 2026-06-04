# PackFlow — Table & column reference

Quick reference for all tables. Full DDL: [`schema.sql`](./schema.sql).

---

## `users`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | TEXT UNIQUE | |
| email_verified | TIMESTAMPTZ | |
| name | TEXT | |
| image_url | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |

**Indexes:** `users_email_idx`

---

## `accounts` / `sessions`

Auth provider linkage. FK: `user_id` → `users` CASCADE.

---

## `organizations`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Tenant root |
| name, slug | TEXT | slug UNIQUE |
| invoice_prefix | TEXT | Default `INV` |
| invoice_next_seq | INTEGER | Next seq for INV-0001 |
| invoice_pad_width | SMALLINT | Default 4 |
| default_currency | CHAR(3) | Default INR |
| timezone | TEXT | Default Asia/Kolkata |
| logo_url | TEXT | PDF |
| address_*, city, state, state_code, postal_code, country | TEXT | |
| phone, email, website | TEXT | |
| gstin, pan | TEXT | Optional GST |
| gst_enabled_default | BOOLEAN | |
| bank_details | JSONB | |
| upi_id | TEXT | QR on PDF |
| invoice_terms | TEXT | |
| stripe_customer_id, plan | TEXT | SaaS |
| settings | JSONB | |

**Indexes:** `organizations_slug_idx`

---

## `organization_members`

| Column | Type | Notes |
|--------|------|-------|
| organization_id | UUID FK | → organizations CASCADE |
| user_id | UUID FK | → users CASCADE |
| role | ENUM | owner, admin, staff, viewer |

**Unique:** `(organization_id, user_id)`  
**Indexes:** `user_id`, `(organization_id, role)`

---

## `organization_invites`

Pending team invites. FK → organizations CASCADE. Unique `token_hash`.

---

## `subscriptions`

PackFlow SaaS billing per org. UNIQUE `organization_id`.

---

## `suppliers`

Manufacturers. FK → organizations CASCADE. UNIQUE `(organization_id, code)`.

Key columns: `name`, `phone`, `email`, `gstin`, `payment_terms_days`, `is_active`.

---

## `customers`

Clients. FK → organizations CASCADE. UNIQUE `(organization_id, code)`.

Key columns: `name`, `phone`, `email`, address fields, `gstin`, `billing_state`, `place_of_supply`, `payment_terms_days`, `credit_limit_cents`, `is_active`, `created_source`, `created_by_user_id`.

**Indexes:** org+name, org+active, org+phone

---

## `products`

Box master. FK → organizations CASCADE; `supplier_id` → suppliers SET NULL.

| Column | Notes |
|--------|-------|
| name | 2 Pack Box, etc. |
| length_mm, width_mm, height_mm | |
| ply, gsm | |
| supplier_id | Manufacturer |
| purchase_rate_cents, selling_rate_cents | Current rates |
| hsn_sac, default_tax_rate_bps | Optional GST |
| status | active / inactive |
| created_source | admin, invoice_builder, import, … |
| created_by_user_id | User who quick-added from invoice |

**Indexes:** org+status, org+name, dimensions search, GIN trgm on name

---

## `product_versions`

Spec snapshots. UNIQUE `(product_id, version)`.

---

## `product_price_history`

Rate history on change. `rate_type`: purchase | selling. `valid_from` / `valid_to`.

**Indexes:** product+rate_type+valid_from; partial current (`valid_to IS NULL`)

---

## `bank_accounts`

Org bank accounts for payment recording.

---

## `invoices`

| Column | Notes |
|--------|-------|
| customer_id | FK RESTRICT; **NULL allowed in draft** |
| invoice_number | INV-0001; NULL while draft |
| include_opening_balance | Toggle for carry-forward |
| status | draft, issued, partially_paid, paid |
| invoice_date, due_date, issued_at | |
| gst_enabled, place_of_supply_state | Optional GST |
| subtotal_product_cents, subtotal_charges_cents | |
| opening_balance_cents | Carry forward |
| cgst/sgst/igst_cents, taxable_amount_cents | |
| grand_total_cents, amount_paid_cents, balance_due_cents | |
| total_profit_cents | Sum line profits |
| pdf_url, public_token_hash | |
| duplicated_from_invoice_id, duplicated_at | Quick duplicate |
| opening_balance_snapshot | JSONB snapshot (legacy/display) |
| pdf_storage_key, pdf_generated_at, pdf_settings, payment_qr_payload, amount_in_words | Indian PDF |
| last_due_reminder_at, last_overdue_reminder_at | Notification idempotency |

**Unique:** `(organization_id, invoice_number)`, `public_token_hash`  
**Indexes:** customer, status, dates, outstanding partial, overdue partial

---

## `invoice_lines`

| line_type | Purpose |
|-----------|---------|
| product | Box line; requires product_id |
| transport | Charge |
| loading_unloading | Charge |
| custom | Charge + custom_charge_label |
| opening_balance | Previous unpaid |

Frozen: `purchase_rate_cents`, `selling_rate_cents`, `line_profit_cents`, dimensions.

---

## `invoice_opening_balance_refs`

Links an `opening_balance` line to each **source** unpaid `invoice_id` and `amount_cents` (prevents double-count ambiguity).

---

## `supplier_bills` / `supplier_bill_lines`

AP documents for manufacturer payments. UNIQUE `(organization_id, bill_number)`.

---

## `payments`

Inbound (customer) or outbound (supplier). `party_type` + `customer_id` or `supplier_id`.

`allocated_cents` updated by allocations; `unallocated_cents` generated column.

**Unique:** `(organization_id, idempotency_key)` when key provided

---

## `payment_allocations`

Links payment → `invoice_id` OR `supplier_bill_id` (exclusive). FK RESTRICT on payment/invoice/bill.

---

## `ledger_entries`

Client/supplier running balance. `entry_type` (invoice, payment, supplier_bill, …); `debit_cents` / `credit_cents`; `reference_label` (e.g. INV-0001); `source_type` + `source_id`.

---

## `profit_snapshots_daily` / `profit_snapshots_monthly`

Daily and monthly rollups: revenue, COGS, gross profit. Yearly/lifetime = SQL aggregate over monthly.

---

## `ar_aging_snapshots`

Nightly AR buckets per customer: current, 1-30, 31-60, 61-90, 90+.

---

## `audit_events` / `attachments`

Audit trail and file metadata. `attachments.attachment_kind`: `invoice_pdf`, `logo`, etc.

---

## `platform_backup_runs`

Operational audit for **daily infrastructure backups** (not tenant data). Populated by cron/provider webhook.

---

## Functions

| Function | Purpose |
|----------|---------|
| `format_invoice_number(prefix, seq, pad)` | Returns `INV-0001` |
| `next_invoice_number(org_id)` | Locks org row, increments seq, returns formatted number |
