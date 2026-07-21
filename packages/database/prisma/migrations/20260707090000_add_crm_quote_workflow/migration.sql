-- Add CRM quote workflow fields to opportunity ledger.

ALTER TABLE "crm"."crm_opportunity_m"
  ADD COLUMN IF NOT EXISTS "quote_status_code" VARCHAR(40) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "quote_client_contact_name" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "quote_issued_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "quote_valid_until" DATE,
  ADD COLUMN IF NOT EXISTS "quote_memo" VARCHAR(1000);

ALTER TABLE "crm"."crm_opportunity_h"
  ADD COLUMN IF NOT EXISTS "quote_status_code" VARCHAR(40) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "quote_client_contact_name" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "quote_issued_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "quote_valid_until" DATE,
  ADD COLUMN IF NOT EXISTS "quote_memo" VARCHAR(1000);

CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_m_quote_status"
  ON "crm"."crm_opportunity_m" ("quote_status_code", "is_active");
