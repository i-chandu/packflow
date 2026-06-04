# PackFlow — Architecture index

Master map of design artifacts. **No application code** — implementation references these docs.

| Document | Contents |
|----------|----------|
| [`database/schema.sql`](../database/schema.sql) | PostgreSQL DDL, enums, indexes, functions |
| [`database/TABLES.md`](../database/TABLES.md) | Column reference |
| [`database/RELATIONSHIPS.md`](../database/RELATIONSHIPS.md) | ER diagram, FK matrix |
| [`database/SCHEMA_VERIFICATION.md`](../database/SCHEMA_VERIFICATION.md) | Broker + production requirement ↔ schema |
| [`docs/SCREEN_ARCHITECTURE.md`](./SCREEN_ARCHITECTURE.md) | Routes, layouts, components, mobile |
| [`docs/PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) | Production feature checklist (11 areas) |
| [`docs/BACKUP_RUNBOOK.md`](./BACKUP_RUNBOOK.md) | Daily backup & restore policy |

## System layers

```
Marketing / Auth (public)
    ↓
App shell (multi-tenant /{orgSlug})
    ↓
Domain: Invoices · Payments · Products · Clients · Suppliers · Credit notes
    ↓
PostgreSQL (row-level tenancy) + object storage (PDF, attachments)
    ↓
Jobs: PDF generation · notifications · import · analytics snapshots
```

## Core workflows

| Workflow | Primary screens | Schema |
|----------|-----------------|--------|
| Fast invoice | Invoice builder | `invoices`, `invoice_lines` |
| Collect payment | Payments, client ledger | `payments`, `payment_allocations` |
| Reverse / adjust | Cancel, credit notes | `credit_notes`, `invoice_status.cancelled` |
| Pay manufacturer | Supplier payment, supplier ledger | `supplier_bills`, `payments` outbound |
| GST invoice | Builder GST panel, PDF | GST columns on lines + invoice totals |
| Import masters | Settings → import | `import_jobs` |

*Last updated: architecture review v3.0*
