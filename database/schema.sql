-- =============================================================================
-- PackFlow — Complete PostgreSQL Database Schema
-- Packaging box broker SaaS (multi-tenant)
--
-- Conventions:
--   - All monetary amounts stored as BIGINT cents (amount_cents)
--   - All timestamps TIMESTAMPTZ UTC
--   - Primary keys: UUID v4 (gen_random_uuid())
--   - Tenant isolation: organization_id on all tenant-scoped tables
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- product name search (optional)

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE organization_member_role AS ENUM (
  'owner',
  'admin',
  'staff',
  'viewer'
);

CREATE TYPE organization_invite_status AS ENUM (
  'pending',
  'accepted',
  'expired',
  'revoked'
);

CREATE TYPE subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid'
);

CREATE TYPE product_status AS ENUM (
  'active',
  'inactive'
);

CREATE TYPE price_rate_type AS ENUM (
  'purchase',
  'selling'
);

CREATE TYPE price_change_source AS ENUM (
  'manual',
  'import',
  'quick_add',
  'system'
);

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'cancelled'
);

CREATE TYPE credit_note_status AS ENUM (
  'draft',
  'issued',
  'applied',
  'cancelled'
);

CREATE TYPE invoice_line_type AS ENUM (
  'product',
  'transport',
  'loading_unloading',
  'custom',
  'opening_balance'
);

CREATE TYPE payment_direction AS ENUM (
  'inbound',
  'outbound'
);

CREATE TYPE payment_party_type AS ENUM (
  'customer',
  'supplier'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'cleared',
  'failed',
  'reversed'
);

CREATE TYPE payment_method AS ENUM (
  'bank_transfer',
  'cheque',
  'cash',
  'upi',
  'card',
  'other'
);

CREATE TYPE audit_action AS ENUM (
  'create',
  'update',
  'delete',
  'issue',
  'cancel',
  'void',
  'allocate',
  'restore',
  'import',
  'export'
);

-- How a customer/product row was created (inline invoice vs admin)
CREATE TYPE record_created_source AS ENUM (
  'admin',
  'invoice_builder',
  'import',
  'duplicate_invoice',
  'system'
);

-- Ledger row classification for client/supplier statements
CREATE TYPE ledger_entry_type AS ENUM (
  'invoice',
  'payment',
  'opening_balance',
  'credit_note',
  'supplier_bill',
  'supplier_payment',
  'supplier_credit',
  'adjustment'
);

CREATE TYPE ledger_source_type AS ENUM (
  'invoice',
  'payment',
  'payment_allocation',
  'invoice_line',
  'credit_note',
  'credit_note_allocation',
  'supplier_bill',
  'supplier_bill_line',
  'manual_adjustment'
);

CREATE TYPE import_job_type AS ENUM (
  'clients_csv',
  'products_csv'
);

CREATE TYPE import_job_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'partial'
);

CREATE TYPE notification_channel AS ENUM (
  'in_app',
  'email'
);

CREATE TYPE notification_type AS ENUM (
  'invoice_due_soon',
  'invoice_overdue',
  'client_overdue_digest',
  'low_collection_rate',
  'payment_received',
  'credit_note_issued',
  'backup_failed'
);

CREATE TYPE supplier_bill_status AS ENUM (
  'draft',
  'open',
  'partially_paid',
  'paid',
  'void'
);

CREATE TYPE attachment_kind AS ENUM (
  'invoice_pdf',
  'logo',
  'signature',
  'other'
);

CREATE TYPE backup_run_status AS ENUM (
  'started',
  'completed',
  'failed'
);

-- =============================================================================
-- PLATFORM: USERS & AUTH (integrates with auth provider)
-- =============================================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL,
  email_verified  TIMESTAMPTZ,
  name            TEXT,
  image_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX users_email_idx ON users (email);

-- Optional: provider-linked accounts (Better Auth / similar)
CREATE TABLE accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  access_token        TEXT,
  refresh_token       TEXT,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT accounts_provider_unique UNIQUE (provider, provider_account_id)
);

CREATE INDEX accounts_user_id_idx ON accounts (user_id);

CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT sessions_token_hash_unique UNIQUE (token_hash)
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

-- =============================================================================
-- TENANT: ORGANIZATIONS
-- =============================================================================

CREATE TABLE organizations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL,
  legal_name            TEXT,
  -- Invoice numbering (INV-0001)
  invoice_prefix        TEXT NOT NULL DEFAULT 'INV',
  invoice_next_seq      INTEGER NOT NULL DEFAULT 1,
  invoice_pad_width     SMALLINT NOT NULL DEFAULT 4,
  credit_note_prefix    TEXT NOT NULL DEFAULT 'CN',
  credit_note_next_seq  INTEGER NOT NULL DEFAULT 1,
  credit_note_pad_width SMALLINT NOT NULL DEFAULT 4,
  -- Currency & locale
  default_currency      CHAR(3) NOT NULL DEFAULT 'INR',
  timezone              TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  -- Branding & PDF
  logo_url              TEXT,
  address_line1         TEXT,
  address_line2         TEXT,
  city                  TEXT,
  state                 TEXT,
  state_code            CHAR(2),
  postal_code           TEXT,
  country               TEXT NOT NULL DEFAULT 'IN',
  phone                 TEXT,
  email                 TEXT,
  website               TEXT,
  -- GST (optional — not enforced in MVP)
  gstin                 TEXT,
  pan                   TEXT,
  gst_enabled_default   BOOLEAN NOT NULL DEFAULT false,
  -- Bank / UPI for PDF & QR
  bank_details          JSONB NOT NULL DEFAULT '{}',
  upi_id                TEXT,
  invoice_terms         TEXT,
  authorized_signatory_name TEXT,
  -- PDF display toggles (all overridable per invoice at issue time)
  pdf_show_logo         BOOLEAN NOT NULL DEFAULT true,
  pdf_show_signature    BOOLEAN NOT NULL DEFAULT true,
  pdf_show_qr           BOOLEAN NOT NULL DEFAULT true,
  pdf_show_bank_details BOOLEAN NOT NULL DEFAULT true,
  pdf_settings          JSONB NOT NULL DEFAULT '{}',
  -- SaaS billing (PackFlow subscription)
  stripe_customer_id    TEXT,
  plan                  TEXT NOT NULL DEFAULT 'trial',
  settings              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT organizations_slug_unique UNIQUE (slug),
  CONSTRAINT organizations_invoice_next_seq_positive CHECK (invoice_next_seq >= 1),
  CONSTRAINT organizations_invoice_pad_width_range CHECK (invoice_pad_width BETWEEN 1 AND 10)
);

CREATE INDEX organizations_slug_idx ON organizations (slug);

-- =============================================================================
-- TENANT: MEMBERSHIP & INVITES
-- =============================================================================

CREATE TABLE organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role            organization_member_role NOT NULL DEFAULT 'staff',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT organization_members_org_user_unique UNIQUE (organization_id, user_id)
);

CREATE INDEX organization_members_user_id_idx ON organization_members (user_id);
CREATE INDEX organization_members_organization_id_role_idx
  ON organization_members (organization_id, role);

CREATE TABLE organization_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            organization_member_role NOT NULL DEFAULT 'staff',
  token_hash      TEXT NOT NULL,
  status          organization_invite_status NOT NULL DEFAULT 'pending',
  invited_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT organization_invites_token_hash_unique UNIQUE (token_hash)
);

CREATE INDEX organization_invites_organization_id_idx ON organization_invites (organization_id);
CREATE INDEX organization_invites_email_status_idx ON organization_invites (email, status);

-- =============================================================================
-- TENANT: SUBSCRIPTION (PackFlow SaaS)
-- =============================================================================

CREATE TABLE subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  status                 subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at              TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_organization_unique UNIQUE (organization_id)
);

-- =============================================================================
-- TENANT: SUPPLIERS (MANUFACTURERS)
-- =============================================================================

CREATE TABLE suppliers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  code                TEXT,
  name                TEXT NOT NULL,
  contact_person      TEXT,
  phone               TEXT,
  email               TEXT,
  address_line1       TEXT,
  address_line2       TEXT,
  city                TEXT,
  state               TEXT,
  postal_code         TEXT,
  gstin               TEXT,
  payment_terms_days  SMALLINT NOT NULL DEFAULT 0,
  default_currency    CHAR(3) NOT NULL DEFAULT 'INR',
  notes               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT suppliers_org_code_unique UNIQUE (organization_id, code)
);

CREATE INDEX suppliers_organization_id_idx ON suppliers (organization_id);
CREATE INDEX suppliers_organization_id_name_idx ON suppliers (organization_id, name);
CREATE INDEX suppliers_organization_id_active_idx ON suppliers (organization_id, is_active);

-- =============================================================================
-- TENANT: CUSTOMERS (CLIENTS)
-- =============================================================================

CREATE TABLE customers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  code                TEXT,
  name                TEXT NOT NULL,
  phone               TEXT,
  email               TEXT,
  -- Billing address
  address_line1       TEXT,
  address_line2       TEXT,
  city                TEXT,
  billing_state       TEXT,
  state_code          CHAR(2),
  postal_code         TEXT,
  -- GST (optional)
  gstin               TEXT,
  place_of_supply     TEXT,
  payment_terms_days  SMALLINT NOT NULL DEFAULT 0,
  credit_limit_cents  BIGINT,
  default_currency    CHAR(3) NOT NULL DEFAULT 'INR',
  notes               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_source      record_created_source NOT NULL DEFAULT 'admin',
  created_by_user_id  UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT customers_org_code_unique UNIQUE (organization_id, code),
  CONSTRAINT customers_credit_limit_non_negative CHECK (
    credit_limit_cents IS NULL OR credit_limit_cents >= 0
  )
);

CREATE INDEX customers_organization_id_idx ON customers (organization_id);
CREATE INDEX customers_organization_id_name_idx ON customers (organization_id, name);
CREATE INDEX customers_organization_id_active_idx ON customers (organization_id, is_active);
CREATE INDEX customers_organization_id_phone_idx ON customers (organization_id, phone);

-- =============================================================================
-- TENANT: PRODUCT MASTER (BOXES)
-- =============================================================================

CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  -- Box identity
  name                TEXT NOT NULL,
  length_mm           NUMERIC(10, 2) NOT NULL,
  width_mm            NUMERIC(10, 2) NOT NULL,
  height_mm           NUMERIC(10, 2) NOT NULL,
  ply                 TEXT,
  gsm                 NUMERIC(10, 2),
  -- Manufacturer & rates (current; history in product_price_history)
  supplier_id         UUID REFERENCES suppliers (id) ON DELETE SET NULL,
  purchase_rate_cents BIGINT NOT NULL DEFAULT 0,
  selling_rate_cents  BIGINT NOT NULL DEFAULT 0,
  currency            CHAR(3) NOT NULL DEFAULT 'INR',
  unit                TEXT NOT NULL DEFAULT 'piece',
  -- GST optional
  hsn_sac             TEXT,
  default_tax_rate_bps INTEGER,
  status              product_status NOT NULL DEFAULT 'active',
  notes               TEXT,
  created_source      record_created_source NOT NULL DEFAULT 'admin',
  created_by_user_id  UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at         TIMESTAMPTZ,

  CONSTRAINT products_purchase_rate_non_negative CHECK (purchase_rate_cents >= 0),
  CONSTRAINT products_selling_rate_non_negative CHECK (selling_rate_cents >= 0),
  CONSTRAINT products_dimensions_positive CHECK (
    length_mm > 0 AND width_mm > 0 AND height_mm > 0
  ),
  CONSTRAINT products_gsm_non_negative CHECK (gsm IS NULL OR gsm >= 0)
);

CREATE INDEX products_organization_id_idx ON products (organization_id);
CREATE INDEX products_organization_id_status_idx ON products (organization_id, status);
CREATE INDEX products_organization_id_supplier_id_idx ON products (organization_id, supplier_id);
CREATE INDEX products_organization_id_name_idx ON products (organization_id, name);
CREATE INDEX products_search_dimensions_idx ON products (
  organization_id,
  status,
  length_mm,
  width_mm,
  height_mm,
  gsm
);
CREATE INDEX products_name_trgm_idx ON products USING gin (name gin_trgm_ops);

-- Immutable spec snapshot when referenced on issued invoices (optional versioning)
CREATE TABLE product_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  spec_snapshot   JSONB NOT NULL,
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT product_versions_product_version_unique UNIQUE (product_id, version)
);

CREATE INDEX product_versions_organization_id_product_id_idx
  ON product_versions (organization_id, product_id);

-- =============================================================================
-- TENANT: PRODUCT PRICE HISTORY
-- =============================================================================

CREATE TABLE product_price_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  rate_type           price_rate_type NOT NULL,
  amount_cents        BIGINT NOT NULL,
  currency            CHAR(3) NOT NULL DEFAULT 'INR',
  valid_from          TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to            TIMESTAMPTZ,
  changed_by_user_id  UUID REFERENCES users (id) ON DELETE SET NULL,
  change_source       price_change_source NOT NULL DEFAULT 'manual',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT product_price_history_amount_non_negative CHECK (amount_cents >= 0),
  CONSTRAINT product_price_history_valid_range CHECK (
    valid_to IS NULL OR valid_to > valid_from
  )
);

CREATE INDEX product_price_history_product_id_rate_type_idx
  ON product_price_history (product_id, rate_type, valid_from DESC);
CREATE INDEX product_price_history_organization_id_idx
  ON product_price_history (organization_id);
CREATE INDEX product_price_history_current_idx
  ON product_price_history (product_id, rate_type)
  WHERE valid_to IS NULL;

-- =============================================================================
-- TENANT: BANK ACCOUNTS (ORG)
-- =============================================================================

CREATE TABLE bank_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  bank_name       TEXT,
  account_number  TEXT,
  ifsc            TEXT,
  branch          TEXT,
  currency        CHAR(3) NOT NULL DEFAULT 'INR',
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bank_accounts_organization_id_idx ON bank_accounts (organization_id);

-- =============================================================================
-- TENANT: INVOICES
-- =============================================================================

CREATE TABLE invoices (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  -- Nullable while draft so invoice builder can start before client is chosen
  customer_id             UUID REFERENCES customers (id) ON DELETE RESTRICT,
  -- Numbering: INV-0001 assigned on issue
  invoice_number          TEXT,
  status                  invoice_status NOT NULL DEFAULT 'draft',
  -- Dates
  invoice_date            DATE,
  due_date                DATE,
  issued_at               TIMESTAMPTZ,
  -- GST (optional per invoice)
  gst_enabled             BOOLEAN NOT NULL DEFAULT false,
  place_of_supply_state   TEXT,
  reverse_charge          BOOLEAN NOT NULL DEFAULT false,
  -- Amounts (cents) — denormalized for queries; source of truth = lines + allocations
  subtotal_product_cents  BIGINT NOT NULL DEFAULT 0,
  subtotal_charges_cents  BIGINT NOT NULL DEFAULT 0,
  opening_balance_cents   BIGINT NOT NULL DEFAULT 0,
  discount_cents          BIGINT NOT NULL DEFAULT 0,
  taxable_amount_cents    BIGINT NOT NULL DEFAULT 0,
  cgst_cents              BIGINT NOT NULL DEFAULT 0,
  sgst_cents              BIGINT NOT NULL DEFAULT 0,
  igst_cents              BIGINT NOT NULL DEFAULT 0,
  round_off_cents         BIGINT NOT NULL DEFAULT 0,
  grand_total_cents       BIGINT NOT NULL DEFAULT 0,
  amount_paid_cents       BIGINT NOT NULL DEFAULT 0,
  balance_due_cents       BIGINT NOT NULL DEFAULT 0,
  currency                CHAR(3) NOT NULL DEFAULT 'INR',
  -- Profit snapshot (sum of line margins at issue)
  total_profit_cents      BIGINT NOT NULL DEFAULT 0,
  -- PDF & public access (Indian invoice PDF)
  pdf_url                 TEXT,
  pdf_storage_key         TEXT,
  pdf_generated_at        TIMESTAMPTZ,
  pdf_template_version    SMALLINT NOT NULL DEFAULT 1,
  pdf_settings            JSONB NOT NULL DEFAULT '{}',
  payment_qr_payload      TEXT,
  amount_in_words         TEXT,
  public_token_hash       TEXT,
  -- Notification job idempotency (due/overdue reminders)
  last_due_reminder_at      TIMESTAMPTZ,
  last_overdue_reminder_at  TIMESTAMPTZ,
  -- Carry forward previous client outstanding (invoice builder toggle)
  include_opening_balance   BOOLEAN NOT NULL DEFAULT false,
  -- Duplicate / carry-forward metadata
  duplicated_from_invoice_id UUID REFERENCES invoices (id) ON DELETE SET NULL,
  duplicated_at             TIMESTAMPTZ,
  opening_balance_snapshot   JSONB,
  notes                   TEXT,
  internal_notes          TEXT,
  created_by_user_id      UUID REFERENCES users (id) ON DELETE SET NULL,
  issued_by_user_id       UUID REFERENCES users (id) ON DELETE SET NULL,
  cancelled_at            TIMESTAMPTZ,
  cancelled_by_user_id    UUID REFERENCES users (id) ON DELETE SET NULL,
  cancellation_reason     TEXT,
  -- Set when a credit note fully reverses or adjusts this invoice
  credit_note_id          UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT invoices_org_invoice_number_unique UNIQUE (organization_id, invoice_number),
  CONSTRAINT invoices_public_token_hash_unique UNIQUE (public_token_hash),
  CONSTRAINT invoices_amounts_non_negative CHECK (
    subtotal_product_cents >= 0
    AND subtotal_charges_cents >= 0
    AND opening_balance_cents >= 0
    AND grand_total_cents >= 0
    AND amount_paid_cents >= 0
    AND balance_due_cents >= 0
  ),
  CONSTRAINT invoices_draft_no_number CHECK (
    status = 'draft' OR invoice_number IS NOT NULL
  ),
  CONSTRAINT invoices_issued_has_date CHECK (
    status = 'draft' OR (invoice_date IS NOT NULL AND issued_at IS NOT NULL)
  ),
  CONSTRAINT invoices_non_draft_requires_customer CHECK (
    status = 'draft' OR customer_id IS NOT NULL
  ),
  CONSTRAINT invoices_cancelled_metadata CHECK (
    status <> 'cancelled'
    OR (cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL)
  )
);

CREATE INDEX invoices_organization_id_idx ON invoices (organization_id);
CREATE INDEX invoices_organization_id_customer_id_idx ON invoices (organization_id, customer_id);
CREATE INDEX invoices_organization_id_status_idx ON invoices (organization_id, status);
CREATE INDEX invoices_organization_id_invoice_date_idx ON invoices (organization_id, invoice_date DESC);
CREATE INDEX invoices_organization_id_due_date_idx ON invoices (organization_id, due_date);
CREATE INDEX invoices_outstanding_idx ON invoices (organization_id, customer_id, balance_due_cents)
  WHERE status IN ('issued', 'partially_paid');
CREATE INDEX invoices_overdue_idx ON invoices (organization_id, due_date, balance_due_cents)
  WHERE status IN ('issued', 'partially_paid') AND balance_due_cents > 0;
CREATE INDEX invoices_duplicated_from_idx ON invoices (duplicated_from_invoice_id);
CREATE INDEX invoices_cancelled_idx ON invoices (organization_id, cancelled_at)
  WHERE status = 'cancelled';

-- =============================================================================
-- TENANT: CREDIT NOTES (invoice reversal / GST adjustment)
-- =============================================================================

CREATE TABLE credit_notes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  customer_id             UUID NOT NULL REFERENCES customers (id) ON DELETE RESTRICT,
  original_invoice_id     UUID NOT NULL REFERENCES invoices (id) ON DELETE RESTRICT,
  credit_note_number      TEXT,
  status                  credit_note_status NOT NULL DEFAULT 'draft',
  credit_note_date        DATE,
  issued_at               TIMESTAMPTZ,
  reason                  TEXT NOT NULL,
  gst_enabled             BOOLEAN NOT NULL DEFAULT false,
  taxable_amount_cents    BIGINT NOT NULL DEFAULT 0,
  cgst_cents              BIGINT NOT NULL DEFAULT 0,
  sgst_cents              BIGINT NOT NULL DEFAULT 0,
  igst_cents              BIGINT NOT NULL DEFAULT 0,
  round_off_cents         BIGINT NOT NULL DEFAULT 0,
  grand_total_cents       BIGINT NOT NULL DEFAULT 0,
  amount_applied_cents    BIGINT NOT NULL DEFAULT 0,
  balance_remaining_cents BIGINT NOT NULL DEFAULT 0,
  currency                CHAR(3) NOT NULL DEFAULT 'INR',
  pdf_url                 TEXT,
  pdf_storage_key         TEXT,
  pdf_generated_at        TIMESTAMPTZ,
  issued_by_user_id       UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT credit_notes_org_number_unique UNIQUE (organization_id, credit_note_number),
  CONSTRAINT credit_notes_amounts_non_negative CHECK (
    grand_total_cents >= 0 AND amount_applied_cents >= 0 AND balance_remaining_cents >= 0
  ),
  CONSTRAINT credit_notes_issued_has_number CHECK (
    status = 'draft' OR credit_note_number IS NOT NULL
  )
);

CREATE INDEX credit_notes_organization_id_idx ON credit_notes (organization_id);
CREATE INDEX credit_notes_original_invoice_id_idx ON credit_notes (original_invoice_id);
CREATE INDEX credit_notes_customer_id_idx ON credit_notes (organization_id, customer_id);

-- FK from invoices.credit_note_id added after credit_notes exists
ALTER TABLE invoices
  ADD CONSTRAINT invoices_credit_note_id_fkey
  FOREIGN KEY (credit_note_id) REFERENCES credit_notes (id) ON DELETE SET NULL;

CREATE TABLE credit_note_lines (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  credit_note_id          UUID NOT NULL REFERENCES credit_notes (id) ON DELETE CASCADE,
  invoice_line_id         UUID REFERENCES invoice_lines (id) ON DELETE SET NULL,
  description             TEXT NOT NULL,
  quantity                NUMERIC(14, 4) NOT NULL DEFAULT 1,
  unit                    TEXT NOT NULL DEFAULT 'piece',
  rate_cents              BIGINT NOT NULL DEFAULT 0,
  line_amount_cents       BIGINT NOT NULL DEFAULT 0,
  hsn_sac                 TEXT,
  tax_rate_bps            INTEGER,
  cgst_cents              BIGINT NOT NULL DEFAULT 0,
  sgst_cents              BIGINT NOT NULL DEFAULT 0,
  igst_cents              BIGINT NOT NULL DEFAULT 0,
  sort_order              SMALLINT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX credit_note_lines_credit_note_id_idx ON credit_note_lines (credit_note_id, sort_order);

CREATE TABLE credit_note_allocations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  credit_note_id      UUID NOT NULL REFERENCES credit_notes (id) ON DELETE RESTRICT,
  invoice_id          UUID NOT NULL REFERENCES invoices (id) ON DELETE RESTRICT,
  amount_cents        BIGINT NOT NULL,
  allocated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id  UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT credit_note_allocations_amount_positive CHECK (amount_cents > 0)
);

CREATE INDEX credit_note_allocations_credit_note_id_idx ON credit_note_allocations (credit_note_id);
CREATE INDEX credit_note_allocations_invoice_id_idx ON credit_note_allocations (invoice_id);

-- =============================================================================
-- TENANT: INVOICE LINES
-- =============================================================================

CREATE TABLE invoice_lines (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  invoice_id              UUID NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
  line_type               invoice_line_type NOT NULL,
  sort_order              SMALLINT NOT NULL DEFAULT 0,
  -- Product reference (nullable for charge lines)
  product_id              UUID REFERENCES products (id) ON DELETE SET NULL,
  product_version_id      UUID REFERENCES product_versions (id) ON DELETE SET NULL,
  -- Display
  description             TEXT NOT NULL,
  box_name                TEXT,
  length_mm               NUMERIC(10, 2),
  width_mm                NUMERIC(10, 2),
  height_mm               NUMERIC(10, 2),
  ply                     TEXT,
  gsm                     NUMERIC(10, 2),
  -- Quantities & rates (frozen at issue for product lines)
  quantity                NUMERIC(14, 4) NOT NULL DEFAULT 1,
  unit                    TEXT NOT NULL DEFAULT 'piece',
  purchase_rate_cents     BIGINT NOT NULL DEFAULT 0,
  selling_rate_cents      BIGINT NOT NULL DEFAULT 0,
  line_amount_cents       BIGINT NOT NULL DEFAULT 0,
  line_profit_cents       BIGINT NOT NULL DEFAULT 0,
  -- Custom charge label
  custom_charge_label     TEXT,
  -- GST optional per line
  hsn_sac                 TEXT,
  tax_rate_bps            INTEGER,
  cgst_bps                INTEGER,
  sgst_bps                INTEGER,
  igst_bps                INTEGER,
  cgst_cents              BIGINT NOT NULL DEFAULT 0,
  sgst_cents              BIGINT NOT NULL DEFAULT 0,
  igst_cents              BIGINT NOT NULL DEFAULT 0,
  taxable_amount_cents    BIGINT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT invoice_lines_quantity_positive CHECK (
    quantity > 0 OR line_type = 'opening_balance'
  ),
  CONSTRAINT invoice_lines_product_requires_product_id CHECK (
    line_type <> 'product' OR product_id IS NOT NULL
  ),
  CONSTRAINT invoice_lines_custom_requires_label CHECK (
    line_type <> 'custom' OR custom_charge_label IS NOT NULL
  ),
  CONSTRAINT invoice_lines_opening_balance_amount CHECK (
    line_type <> 'opening_balance' OR line_amount_cents <> 0
  ),
  CONSTRAINT invoice_lines_charge_flat_amount CHECK (
    line_type NOT IN ('transport', 'loading_unloading', 'custom', 'opening_balance')
    OR line_amount_cents >= 0
  )
);

CREATE INDEX invoice_lines_invoice_id_sort_idx ON invoice_lines (invoice_id, sort_order);
CREATE INDEX invoice_lines_organization_id_idx ON invoice_lines (organization_id);
CREATE INDEX invoice_lines_product_id_idx ON invoice_lines (organization_id, product_id)
  WHERE product_id IS NOT NULL;

-- Links opening-balance carry-forward on a new invoice to source unpaid invoices
CREATE TABLE invoice_opening_balance_refs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  invoice_id              UUID NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
  opening_balance_line_id UUID NOT NULL REFERENCES invoice_lines (id) ON DELETE CASCADE,
  source_invoice_id       UUID NOT NULL REFERENCES invoices (id) ON DELETE RESTRICT,
  amount_cents            BIGINT NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT invoice_opening_balance_refs_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT invoice_opening_balance_refs_unique_source
    UNIQUE (invoice_id, source_invoice_id)
);

CREATE INDEX invoice_opening_balance_refs_invoice_id_idx
  ON invoice_opening_balance_refs (invoice_id);
CREATE INDEX invoice_opening_balance_refs_source_invoice_id_idx
  ON invoice_opening_balance_refs (source_invoice_id);

-- =============================================================================
-- TENANT: SUPPLIER BILLS (AP — optional but supported)
-- =============================================================================

CREATE TABLE supplier_bills (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  supplier_id         UUID NOT NULL REFERENCES suppliers (id) ON DELETE RESTRICT,
  bill_number         TEXT NOT NULL,
  reference           TEXT,
  bill_date           DATE NOT NULL,
  due_date            DATE,
  status              supplier_bill_status NOT NULL DEFAULT 'open',
  subtotal_cents      BIGINT NOT NULL DEFAULT 0,
  tax_cents           BIGINT NOT NULL DEFAULT 0,
  grand_total_cents   BIGINT NOT NULL DEFAULT 0,
  amount_paid_cents   BIGINT NOT NULL DEFAULT 0,
  balance_due_cents   BIGINT NOT NULL DEFAULT 0,
  currency            CHAR(3) NOT NULL DEFAULT 'INR',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT supplier_bills_org_bill_number_unique UNIQUE (organization_id, bill_number),
  CONSTRAINT supplier_bills_amounts_non_negative CHECK (
    grand_total_cents >= 0 AND amount_paid_cents >= 0 AND balance_due_cents >= 0
  )
);

CREATE INDEX supplier_bills_organization_id_supplier_id_idx
  ON supplier_bills (organization_id, supplier_id);
CREATE INDEX supplier_bills_outstanding_idx ON supplier_bills (organization_id, balance_due_cents)
  WHERE balance_due_cents > 0;

CREATE TABLE supplier_bill_lines (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  supplier_bill_id    UUID NOT NULL REFERENCES supplier_bills (id) ON DELETE CASCADE,
  product_id          UUID REFERENCES products (id) ON DELETE SET NULL,
  description         TEXT NOT NULL,
  quantity            NUMERIC(14, 4) NOT NULL DEFAULT 1,
  unit_cost_cents     BIGINT NOT NULL DEFAULT 0,
  line_amount_cents   BIGINT NOT NULL DEFAULT 0,
  sort_order          SMALLINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT supplier_bill_lines_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX supplier_bill_lines_supplier_bill_id_idx ON supplier_bill_lines (supplier_bill_id);

-- =============================================================================
-- TENANT: PAYMENTS
-- =============================================================================

CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  direction           payment_direction NOT NULL,
  party_type          payment_party_type NOT NULL,
  customer_id         UUID REFERENCES customers (id) ON DELETE RESTRICT,
  supplier_id         UUID REFERENCES suppliers (id) ON DELETE RESTRICT,
  bank_account_id     UUID REFERENCES bank_accounts (id) ON DELETE SET NULL,
  payment_date        DATE NOT NULL,
  amount_cents        BIGINT NOT NULL,
  allocated_cents     BIGINT NOT NULL DEFAULT 0,
  unallocated_cents   BIGINT GENERATED ALWAYS AS (amount_cents - allocated_cents) STORED,
  currency            CHAR(3) NOT NULL DEFAULT 'INR',
  method              payment_method NOT NULL DEFAULT 'bank_transfer',
  reference           TEXT,
  status              payment_status NOT NULL DEFAULT 'cleared',
  notes               TEXT,
  idempotency_key     TEXT,
  recorded_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  reversed_by_payment_id UUID REFERENCES payments (id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT payments_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT payments_allocated_within_amount CHECK (
    allocated_cents >= 0 AND allocated_cents <= amount_cents
  ),
  CONSTRAINT payments_party_customer_fk CHECK (
    party_type <> 'customer' OR customer_id IS NOT NULL
  ),
  CONSTRAINT payments_party_supplier_fk CHECK (
    party_type <> 'supplier' OR supplier_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX payments_idempotency_unique_idx ON payments (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX payments_organization_id_idx ON payments (organization_id);
CREATE INDEX payments_organization_id_payment_date_idx ON payments (organization_id, payment_date DESC);
CREATE INDEX payments_customer_id_idx ON payments (organization_id, customer_id)
  WHERE customer_id IS NOT NULL;
CREATE INDEX payments_supplier_id_idx ON payments (organization_id, supplier_id)
  WHERE supplier_id IS NOT NULL;
CREATE INDEX payments_direction_status_idx ON payments (organization_id, direction, status);

-- =============================================================================
-- TENANT: PAYMENT ALLOCATIONS
-- =============================================================================

CREATE TABLE payment_allocations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  payment_id          UUID NOT NULL REFERENCES payments (id) ON DELETE RESTRICT,
  invoice_id          UUID REFERENCES invoices (id) ON DELETE RESTRICT,
  supplier_bill_id    UUID REFERENCES supplier_bills (id) ON DELETE RESTRICT,
  amount_cents        BIGINT NOT NULL,
  allocated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes               TEXT,
  created_by_user_id  UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT payment_allocations_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT payment_allocations_target_exclusive CHECK (
    (invoice_id IS NOT NULL AND supplier_bill_id IS NULL)
    OR (invoice_id IS NULL AND supplier_bill_id IS NOT NULL)
  )
);

CREATE INDEX payment_allocations_payment_id_idx ON payment_allocations (payment_id);
CREATE INDEX payment_allocations_invoice_id_idx ON payment_allocations (invoice_id)
  WHERE invoice_id IS NOT NULL;
CREATE INDEX payment_allocations_supplier_bill_id_idx ON payment_allocations (supplier_bill_id)
  WHERE supplier_bill_id IS NOT NULL;
CREATE INDEX payment_allocations_organization_id_idx ON payment_allocations (organization_id);

-- =============================================================================
-- TENANT: LEDGER (CLIENT / SUPPLIER RUNNING BALANCE)
-- =============================================================================

CREATE TABLE ledger_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  entry_date      DATE NOT NULL,
  entry_type      ledger_entry_type NOT NULL,
  -- Party (client ledger OR supplier ledger)
  customer_id     UUID REFERENCES customers (id) ON DELETE RESTRICT,
  supplier_id     UUID REFERENCES suppliers (id) ON DELETE RESTRICT,
  -- Double-entry style (one side non-zero)
  debit_cents     BIGINT NOT NULL DEFAULT 0,
  credit_cents    BIGINT NOT NULL DEFAULT 0,
  currency        CHAR(3) NOT NULL DEFAULT 'INR',
  running_balance_cents BIGINT,
  reference_label TEXT,
  memo            TEXT,
  -- Source document
  source_type     ledger_source_type NOT NULL,
  source_id       UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ledger_entries_one_party CHECK (
    (customer_id IS NOT NULL AND supplier_id IS NULL)
    OR (customer_id IS NULL AND supplier_id IS NOT NULL)
  ),
  CONSTRAINT ledger_entries_debit_xor_credit CHECK (
    (debit_cents > 0 AND credit_cents = 0) OR (credit_cents > 0 AND debit_cents = 0)
  )
);

CREATE INDEX ledger_entries_customer_chronological_idx
  ON ledger_entries (organization_id, customer_id, entry_date, created_at);
CREATE INDEX ledger_entries_supplier_chronological_idx
  ON ledger_entries (organization_id, supplier_id, entry_date, created_at);
CREATE INDEX ledger_entries_source_idx ON ledger_entries (source_type, source_id);

-- =============================================================================
-- ANALYTICS: MATERIALIZED SNAPSHOTS
-- =============================================================================

CREATE TABLE profit_snapshots_daily (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  snapshot_date       DATE NOT NULL,
  customer_id         UUID REFERENCES customers (id) ON DELETE CASCADE,
  product_id          UUID REFERENCES products (id) ON DELETE CASCADE,
  revenue_cents       BIGINT NOT NULL DEFAULT 0,
  cogs_cents          BIGINT NOT NULL DEFAULT 0,
  gross_profit_cents  BIGINT NOT NULL DEFAULT 0,
  invoice_count       INTEGER NOT NULL DEFAULT 0,
  line_count          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX profit_snapshots_daily_unique_idx ON profit_snapshots_daily (
  organization_id,
  snapshot_date,
  COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

CREATE INDEX profit_snapshots_daily_org_date_idx
  ON profit_snapshots_daily (organization_id, snapshot_date DESC);

-- Monthly profit rollups (yearly/lifetime = aggregate in app or SQL)
CREATE TABLE profit_snapshots_monthly (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  year_month          DATE NOT NULL,
  customer_id         UUID REFERENCES customers (id) ON DELETE CASCADE,
  product_id          UUID REFERENCES products (id) ON DELETE CASCADE,
  revenue_cents       BIGINT NOT NULL DEFAULT 0,
  cogs_cents          BIGINT NOT NULL DEFAULT 0,
  gross_profit_cents  BIGINT NOT NULL DEFAULT 0,
  invoice_count       INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX profit_snapshots_monthly_unique_idx ON profit_snapshots_monthly (
  organization_id,
  year_month,
  COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

CREATE INDEX profit_snapshots_monthly_org_month_idx
  ON profit_snapshots_monthly (organization_id, year_month DESC);

CREATE TABLE ar_aging_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  as_of_date          DATE NOT NULL,
  customer_id         UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  total_outstanding_cents   BIGINT NOT NULL DEFAULT 0,
  overdue_outstanding_cents BIGINT NOT NULL DEFAULT 0,
  current_cents       BIGINT NOT NULL DEFAULT 0,
  days_1_30_cents     BIGINT NOT NULL DEFAULT 0,
  days_31_60_cents    BIGINT NOT NULL DEFAULT 0,
  days_61_90_cents    BIGINT NOT NULL DEFAULT 0,
  days_90_plus_cents  BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ar_aging_snapshots_unique UNIQUE (organization_id, as_of_date, customer_id)
);

CREATE INDEX ar_aging_snapshots_org_date_idx
  ON ar_aging_snapshots (organization_id, as_of_date DESC);

-- =============================================================================
-- AUDIT & ATTACHMENTS
-- =============================================================================

CREATE TABLE audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
  actor_user_id   UUID REFERENCES users (id) ON DELETE SET NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  action          audit_action NOT NULL,
  before_data     JSONB,
  after_data      JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_organization_id_created_at_idx
  ON audit_events (organization_id, created_at DESC);
CREATE INDEX audit_events_entity_idx ON audit_events (entity_type, entity_id);

CREATE TABLE attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  attachment_kind attachment_kind NOT NULL DEFAULT 'other',
  file_name       TEXT NOT NULL,
  storage_key     TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  byte_size       BIGINT,
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  uploaded_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- PLATFORM: BACKUP AUDIT (daily backups run at infrastructure layer)
-- =============================================================================

CREATE TABLE platform_backup_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT NOT NULL,
  backup_type     TEXT NOT NULL DEFAULT 'daily_full',
  status          backup_run_status NOT NULL DEFAULT 'started',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  storage_location TEXT,
  byte_size       BIGINT,
  error_message   TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX platform_backup_runs_started_at_idx ON platform_backup_runs (started_at DESC);
CREATE INDEX platform_backup_runs_status_idx ON platform_backup_runs (status);

-- Tenant-initiated export snapshots (full restore remains infra/support procedure)
CREATE TABLE organization_export_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  status          import_job_status NOT NULL DEFAULT 'pending',
  storage_key     TEXT,
  requested_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX organization_export_jobs_organization_id_idx
  ON organization_export_jobs (organization_id, created_at DESC);

-- =============================================================================
-- DATA IMPORT (CSV)
-- =============================================================================

CREATE TABLE import_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  import_type         import_job_type NOT NULL,
  status              import_job_status NOT NULL DEFAULT 'pending',
  file_name           TEXT NOT NULL,
  storage_key         TEXT NOT NULL,
  total_rows          INTEGER NOT NULL DEFAULT 0,
  success_rows        INTEGER NOT NULL DEFAULT 0,
  failed_rows         INTEGER NOT NULL DEFAULT 0,
  error_report        JSONB NOT NULL DEFAULT '[]',
  created_by_user_id  UUID REFERENCES users (id) ON DELETE SET NULL,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX import_jobs_organization_id_idx ON import_jobs (organization_id, created_at DESC);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

CREATE TABLE notification_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  channel         notification_channel NOT NULL DEFAULT 'in_app',
  is_enabled      BOOLEAN NOT NULL DEFAULT true,
  -- e.g. days before due for invoice_due_soon; threshold % for low_collection_rate
  config          JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT notification_rules_org_type_channel_unique
    UNIQUE (organization_id, notification_type, channel)
);

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users (id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  entity_type     TEXT,
  entity_id       UUID,
  read_at         TIMESTAMPTZ,
  emailed_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread_idx ON notifications (organization_id, user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX attachments_entity_idx ON attachments (organization_id, entity_type, entity_id);

-- =============================================================================
-- ROW-LEVEL SECURITY (optional defense-in-depth — enable in app migration)
-- =============================================================================
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY invoices_tenant_isolation ON invoices
--   USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Format invoice number: INV-0001
CREATE OR REPLACE FUNCTION format_invoice_number(
  p_prefix TEXT,
  p_seq INTEGER,
  p_pad SMALLINT
) RETURNS TEXT AS $$
BEGIN
  RETURN p_prefix || '-' || lpad(p_seq::TEXT, p_pad, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Allocate next invoice number atomically (call inside issue transaction)
CREATE OR REPLACE FUNCTION next_invoice_number(p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_seq INTEGER;
  v_pad SMALLINT;
  v_formatted TEXT;
BEGIN
  SELECT invoice_prefix, invoice_next_seq, invoice_pad_width
  INTO v_prefix, v_seq, v_pad
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE;

  v_formatted := format_invoice_number(v_prefix, v_seq, v_pad);

  UPDATE organizations
  SET invoice_next_seq = invoice_next_seq + 1,
      updated_at = now()
  WHERE id = p_org_id;

  RETURN v_formatted;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION next_credit_note_number(p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_seq INTEGER;
  v_pad SMALLINT;
BEGIN
  SELECT credit_note_prefix, credit_note_next_seq, credit_note_pad_width
  INTO v_prefix, v_seq, v_pad
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE;

  UPDATE organizations
  SET credit_note_next_seq = credit_note_next_seq + 1,
      updated_at = now()
  WHERE id = p_org_id;

  RETURN format_invoice_number(v_prefix, v_seq, v_pad);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS (documentation)
-- =============================================================================

COMMENT ON TABLE products IS 'Box product master: name, dimensions, ply, GSM, manufacturer, rates';
COMMENT ON TABLE product_price_history IS 'Historical purchase/selling rates; new row on each rate change';
COMMENT ON TABLE invoices IS 'Customer invoices; INV-####; statuses draft→issued→partially_paid→paid→cancelled';
COMMENT ON TABLE credit_notes IS 'CN-#### credit notes linked to original_invoice_id; primary GST-safe reversal path';
COMMENT ON TABLE credit_note_allocations IS 'Apply credit note balance against open invoices (reduces AR)';
COMMENT ON TABLE invoice_lines IS 'Product lines + transport/loading/custom/opening_balance charges';
COMMENT ON TABLE payment_allocations IS 'Links payments to invoices or supplier bills; drives partial payment status';
COMMENT ON TABLE ledger_entries IS 'Client/supplier ledger for running balance views';
COMMENT ON COLUMN invoices.opening_balance_snapshot IS 'JSON snapshot of carried-forward invoice refs when opening balance line used';
COMMENT ON COLUMN invoice_lines.line_profit_cents IS '(selling_rate - purchase_rate) * quantity for product lines; 0 for charges';
COMMENT ON TABLE invoice_opening_balance_refs IS 'Traceability: which prior invoices are rolled into opening_balance carry-forward';
COMMENT ON TABLE platform_backup_runs IS 'Audit log for daily DB backups executed by host (Neon/Supabase/RDS); not app data';
COMMENT ON COLUMN invoices.customer_id IS 'NULL allowed only for draft invoices started in invoice builder before client selection';
COMMENT ON COLUMN invoices.include_opening_balance IS 'UI flag: user requested previous unpaid balance on this invoice';
COMMENT ON TABLE profit_snapshots_monthly IS 'Aggregated profit for monthly/yearly/lifetime reporting';
COMMENT ON COLUMN invoices.pdf_settings IS 'Snapshot at issue: PDF toggles + GST display flags; falls back to org defaults';
COMMENT ON COLUMN invoices.last_due_reminder_at IS 'Last invoice_due_soon notification sent; prevents duplicate emails';
