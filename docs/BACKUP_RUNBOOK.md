# PackFlow — Backup & restore runbook

Operational policy (not application code). Complements `platform_backup_runs` in the database.

## Daily backup

| Item | Policy |
|------|--------|
| **Frequency** | Full backup every 24 hours |
| **Provider** | Neon / Supabase / RDS (PITR enabled) |
| **Retention** | 30 daily + 12 monthly (configure on provider) |
| **Encryption** | At rest (provider default + SSE for export files) |
| **Audit** | Insert row into `platform_backup_runs` via ops webhook or cron |

## Targets

| Metric | Target |
|--------|--------|
| **RPO** | 24 hours |
| **RTO** | 4 hours |

## Tenant data export

- **Who:** Organization Owner  
- **UI:** `/{orgSlug}/settings/security` → Export my data  
- **Table:** `organization_export_jobs`  
- **Contents:** Clients, products, invoices, payments CSV/JSON bundle (implementation-defined)

## Restore procedure (support-only)

1. Confirm incident scope (full region vs single tenant).  
2. Use provider PITR to new branch/instance at `T-Δ` before corruption.  
3. Validate row counts and `organizations` sample.  
4. Repoint application `DATABASE_URL` (maintenance window).  
5. Post-mortem + update `platform_backup_runs` metadata.

**No self-serve restore in MVP** — avoids accidental data loss.

## Failure alerting

- `notification_type.backup_failed` → Owner + platform ops email.  
- Dashboard: `settings/security` shows last failed run.

## Quarterly drill

- Restore to staging from latest backup.  
- Run smoke tests: login, list invoices, generate PDF.  
- Document date and outcome in internal ops log.
