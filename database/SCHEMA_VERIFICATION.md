# Schema verification — production checklist

Last reviewed: architecture review **v3.0**

## 11 production areas

| # | Area | Status | Schema support |
|---|------|--------|----------------|
| 1 | Invoice statuses (draft / issued / partially_paid / paid / **cancelled**) | ✅ | `invoice_status` enum; cancel metadata on `invoices` |
| 2 | Credit notes / reversal | ✅ | `credit_notes`, `credit_note_lines`, `credit_note_allocations`, `next_credit_note_number()` |
| 3 | GST (GSTIN, CGST, SGST, IGST, HSN, tax summary) | ✅ | Org/customer/product/line/invoice tax columns; `gst_enabled` |
| 4 | PDF customization | ✅ | Org `pdf_show_*`, `invoice_terms`, `invoices.pdf_settings`, `attachments` |
| 5 | Audit logs | ✅ | `audit_events` |
| 6 | Attachments | ✅ | `attachments` + `attachment_kind` |
| 7 | Client import CSV | ✅ | `import_jobs.clients_csv` |
| 8 | Product import CSV | ✅ | `import_jobs.products_csv` |
| 9 | Global search | ✅ | Indexes: product name trgm, invoice number, client name (app search) |
| 10 | Notifications & reminders | ✅ | `notification_rules`, `notifications`, `last_*_reminder_at` on invoices |
| 11 | Supplier ledger | ✅ | `ledger_entries.supplier_id`, `supplier_bill`, `supplier_payment`, `supplier_credit` |

## Broker MVP (original 23)

| # | Requirement | Status |
|---|-------------|--------|
| 1–11 | Invoice builder, charges, carry-forward | ✅ |
| 12–13 | Client & supplier ledger | ✅ |
| 14 | Profit analytics | ✅ |
| 15–19 | Duplicate, draft→paid, PDF | ✅ |
| 20–21 | PDF, roles | ✅ |
| 22 | Daily backups | ⚠️ Infra + `platform_backup_runs` + [`BACKUP_RUNBOOK.md`](../docs/BACKUP_RUNBOOK.md) |
| 23 | INV-0001 auto increment | ✅ |

## Phase 2 schema (documented, not required for MVP)

- `supplier_credit_notes` table (supplier ledger Credit documents)
- `invoices.ship_to` JSONB (separate ship-to on PDF)
- Email delivery log table
