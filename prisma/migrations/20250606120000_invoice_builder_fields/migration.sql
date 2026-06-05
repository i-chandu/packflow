-- Invoice builder: subtotal, duplicate tracking, cancel/issue metadata
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "subtotal_cents" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "duplicated_from_invoice_id" UUID;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "duplicated_at" TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "issued_by_user_id" UUID;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "cancelled_by_user_id" UUID;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT;

DO $$ BEGIN
  ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_duplicated_from_invoice_id_fkey"
    FOREIGN KEY ("duplicated_from_invoice_id") REFERENCES "invoices"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "invoices_organization_id_invoice_date_idx"
  ON "invoices"("organization_id", "invoice_date" DESC);
