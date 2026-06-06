-- Organization settings & PDF fields (Priority 2)
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "address_line1" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "address_line2" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "upi_id" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "bank_name" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "bank_account_name" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "bank_account_no" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "bank_ifsc" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "invoice_terms" TEXT;
