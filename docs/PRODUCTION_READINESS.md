# PackFlow — Production readiness review

**Version 3.0** — full architecture review against 11 production areas.  
Artifacts: [`SCREEN_ARCHITECTURE.md`](./SCREEN_ARCHITECTURE.md) · [`database/schema.sql`](../database/schema.sql) · [`ARCHITECTURE_INDEX.md`](./ARCHITECTURE_INDEX.md)

---

## Verification summary (your 11 areas)

| # | Area | Schema | Screens | Jobs / infra | Status |
|---|------|--------|---------|--------------|--------|
| 1 | Invoice statuses (5) | ✅ | ✅ | — | **Complete** |
| 2 | Credit notes / reversal | ✅ | ✅ | PDF job | **Complete** (supplier AP credit: phase 2) |
| 3 | GST | ✅ | ✅ | PDF template | **Complete** (optional MVP) |
| 4 | PDF customization | ✅ | ✅ | Storage | **Complete** |
| 5 | Audit logs | ✅ | ✅ | — | **Complete** |
| 6 | Attachments | ✅ | ✅ | Storage | **Complete** |
| 7 | Client import CSV | ✅ | ✅ | Import worker | **Complete** |
| 8 | Product import CSV | ✅ | ✅ | Import worker | **Complete** |
| 9 | Global search | — | ✅ | — | **Complete** (palette MVP; results page optional) |
| 10 | Notifications & reminders | ✅ | ✅ | Daily cron | **Complete** |
| 11 | Supplier ledger | ✅ | ✅ | — | **Complete** |

**Verdict:** Architecture is **production-ready for broker MVP** with phased items below explicitly tagged.

---

## 1. Invoice statuses

### Required states

`draft` · `issued` · `partially_paid` · `paid` · `cancelled`

### Schema

- `invoice_status` enum (all five)
- `cancelled_at`, `cancelled_by_user_id`, `cancellation_reason`
- Constraints: non-draft requires `customer_id`; cancelled requires reason + timestamp

### Screens

| Element | Location |
|---------|----------|
| Status tabs | Invoice list (incl. **Cancelled**) |
| Badges | List, detail, dashboard recent |
| Cancel action | Invoice detail (Admin+, rules below) |

### Rules

| Status | Cancel? |
|--------|---------|
| draft | Yes |
| issued (no payments) | Yes |
| partially_paid / paid | No → credit note |
| cancelled | Terminal |

---

## 2. Credit notes / invoice reversal

### Strategy

| Case | Action |
|------|--------|
| Unpaid issued invoice | **Cancel** |
| Paid / partial / GST filed | **Credit note** `CN-0001` |
| Partial adjustment | CN for delta |

### Schema

- `credit_notes`, `credit_note_lines`, `credit_note_allocations`
- `next_credit_note_number()` · `original_invoice_id` required
- Ledger: `ledger_entry_type.credit_note`
- `invoices.credit_note_id` optional link to primary CN

### Screens

| Route | Purpose |
|-------|---------|
| `/{orgSlug}/credit-notes` | List |
| `/{orgSlug}/credit-notes/new?invoiceId=` | Create |
| `/{orgSlug}/credit-notes/[id]` | Detail, PDF, apply to invoices |

### Phase 2 (not blocking MVP)

- **Supplier credit notes** for supplier ledger “Credit” rows (`ledger_entry_type.supplier_credit` reserved in schema)
- Email CN to client

---

## 3. GST support

### Fields

| Field | Schema | UI |
|-------|--------|-----|
| GSTIN | `organizations`, `customers` | Settings, client form |
| HSN/SAC | `products`, `invoice_lines` | Product form, builder lines |
| CGST / SGST / IGST | Line bps + cents; invoice totals | `GstPanel`, `GstTaxSummary` |
| Place of supply | `invoices.place_of_supply_state` | Builder when GST on |
| Tax summary on PDF | Totals + line columns | Indian PDF template |

### MVP policy

- `gst_enabled` default **false** per org and invoice
- Issue **not blocked** by missing HSN/GSTIN
- Interstate → IGST logic in **application layer** (IGST only vs CGST+SGST split)

### PDF

When `gst_enabled`: show tax columns + footer **Tax Summary** (taxable value, CGST, SGST, IGST, round-off, grand total).

---

## 4. PDF customization

| Asset | Storage | Settings UI |
|-------|---------|-------------|
| Logo | `logo_url` + attachment `logo` | `settings/invoice` |
| Signature | attachment `signature` | Upload + preview |
| Signatory name | `authorized_signatory_name` | Text field |
| QR | `upi_id`, `payment_qr_payload` | UPI field |
| Bank details | `bank_accounts`, `bank_details` | Bank list + toggle |
| Terms | `invoice_terms` | Textarea |
| Display toggles | `pdf_show_*` on org | Checkboxes |

**Per-issue snapshot:** `invoices.pdf_settings` JSONB (copied from org at issue).

**Screens:** PDF preview in settings; regenerate on invoice/CN detail (Admin+).

---

## 5. Audit logs

### Schema

`audit_events` — actions: create, update, issue, **cancel**, allocate, import, …

### Screen

`/{orgSlug}/settings/audit-log` (Admin+)

- Filters: date, user, entity type, action
- Immutable list + JSON diff viewer
- Drill to entity (invoice, payment, etc.)

### Mobile

Event cards; tap for detail sheet.

---

## 6. Attachments

### Schema

`attachments` — kinds: `invoice_pdf`, `logo`, `signature`, `other`

### Screens

| Route | Scope |
|-------|--------|
| `/{orgSlug}/settings/attachments` | Org logo & signature |
| Invoice / CN detail → **Files** | Invoice PDFs, uploads |

**Actions:** Upload, replace primary, download, delete (Admin+).

---

## 7. Client import CSV

### Schema

`import_jobs` — `import_type = clients_csv`

### Screens

`/{orgSlug}/settings/import/clients` — upload, map columns, preview, run, `import/[jobId]` results

**Role:** Admin+ · Template CSV downloadable from hub

---

## 8. Product import CSV

### Schema

`import_jobs` — `import_type = products_csv`

### Screens

`/{orgSlug}/settings/import/products` — same flow as clients

**On success:** writes `products` + initial `product_price_history` rows

---

## 9. Global search

### MVP (primary)

**Command palette** `Cmd+K` / `Ctrl+K` in app shell:

| Search | Targets |
|--------|---------|
| Clients | name, phone |
| Products | name, L×W×H, GSM |
| Invoices | `INV-####`, client name |
| Suppliers | name |
| Navigation | all main routes |
| Actions | new invoice, record payment (role-gated) |

### Optional (phase 2)

`/{orgSlug}/search?q=` — dedicated results page with grouped hits and filters (linked from palette “See all results”).

**Schema:** existing indexes (`pg_trgm` on product name, invoice number unique, client name).

---

## 10. Notifications and reminders

### Types (`notification_type`)

| Type | Trigger |
|------|---------|
| `invoice_due_soon` | `due_date` within N days (rule config) |
| `invoice_overdue` | `due_date` passed & `balance_due > 0` |
| `client_overdue_digest` | Weekly summary |
| `low_collection_rate` | MTD collections &lt; threshold % |
| `payment_received` | Optional |
| `credit_note_issued` | Optional |
| `backup_failed` | Ops |

### Schema

- `notification_rules` — per org, channel (`in_app`, `email`)
- `notifications` — inbox per user
- `invoices.last_due_reminder_at`, `last_overdue_reminder_at` — idempotency

### Screens

- Bell → drawer / `/{orgSlug}/notifications`
- `/{orgSlug}/settings/notifications` — enable rules, thresholds

### Jobs

Daily evaluator (Inngest): rules → insert notifications → Resend email

### Phase 2

- Supplier bill due / overdue
- SMS / WhatsApp channel

---

## 11. Supplier ledger

### Route

`/{orgSlug}/suppliers/[id]/ledger`

### Purpose

AP statement: bills, payments, credits; **outstanding payable**; running balance.

### Columns

Date · Type (Bill / Payment / Credit) · Reference · Debit · Credit · Balance

### Features

Running balance · date filters · supplier summary · outstanding payable · export CSV (phase 2)

### Actions

Record supplier payment · view bill · drill transaction

### Mobile

Card entries · sticky **Record payment**

### Schema

`ledger_entries.supplier_id` · types `supplier_bill`, `supplier_payment`, `supplier_credit`

---

## Remaining gaps (explicitly out of MVP)

| Feature | Why deferred | Track |
|---------|--------------|-------|
| Supplier AP credit note documents | Ledger `Credit` via adjustment until CN table | Phase 2 |
| Dedicated `/search` page | Palette sufficient for MVP | Phase 2 |
| Email invoice / CN to client | Resend integration | Phase 2 |
| GSTR-1 / e-invoice IRN | Regulatory scope | Phase 3 |
| Self-serve DB restore | Risk | Support + [`BACKUP_RUNBOOK.md`](./BACKUP_RUNBOOK.md) |
| 2FA / SSO | Enterprise | Phase 2 |
| API & webhooks | Integrations | Phase 2 |

---

## Implementation phasing (updated)

| Phase | Deliverables |
|-------|----------------|
| **MVP** | 5 statuses, cancel, GST optional, PDF settings, invoice builder, payments, client ledger, **supplier ledger**, dashboard |
| **MVP+1** | Credit notes, command palette, notifications, CSV import, audit UI, attachments manager |
| **MVP+2** | Dedicated search page, supplier credits, email invoice, export CSV on ledgers, collection digest email |

---

*Cross-check: [`database/SCHEMA_VERIFICATION.md`](../database/SCHEMA_VERIFICATION.md) · Screen spec v2.0+ in `SCREEN_ARCHITECTURE.md`*
