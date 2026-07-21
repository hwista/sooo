-- CRM quote seller profile.
-- Stores the seller-side company display block used by quote previews.

CREATE SCHEMA IF NOT EXISTS "crm";

CREATE TABLE IF NOT EXISTS "crm"."crm_quote_seller_profile_m" (
  "seller_profile_id" BIGSERIAL PRIMARY KEY,
  "profile_code" VARCHAR(80) NOT NULL,
  "company_name" VARCHAR(200) NOT NULL,
  "ceo_name" VARCHAR(120),
  "business_registration_no" VARCHAR(80),
  "address" VARCHAR(500),
  "tel" VARCHAR(80),
  "fax" VARCHAR(80),
  "website" VARCHAR(200),
  "email" VARCHAR(200),
  "ci_status_code" VARCHAR(40) NOT NULL DEFAULT 'dms-planned',
  "ci_storage_ref" VARCHAR(300),
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_quote_seller_profile_m_code"
  ON "crm"."crm_quote_seller_profile_m" ("profile_code");
CREATE INDEX IF NOT EXISTS "ix_crm_quote_seller_profile_m_active"
  ON "crm"."crm_quote_seller_profile_m" ("is_active");

CREATE TABLE IF NOT EXISTS "crm"."crm_quote_seller_profile_h" (
  "seller_profile_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "event_by" BIGINT,
  "profile_code" VARCHAR(80) NOT NULL,
  "company_name" VARCHAR(200) NOT NULL,
  "ceo_name" VARCHAR(120),
  "business_registration_no" VARCHAR(80),
  "address" VARCHAR(500),
  "tel" VARCHAR(80),
  "fax" VARCHAR(80),
  "website" VARCHAR(200),
  "email" VARCHAR(200),
  "ci_status_code" VARCHAR(40) NOT NULL,
  "ci_storage_ref" VARCHAR(300),
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_crm_quote_seller_profile_h" PRIMARY KEY ("seller_profile_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_crm_quote_seller_profile_h_event_at"
  ON "crm"."crm_quote_seller_profile_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_crm_quote_seller_profile_h_tx"
  ON "crm"."crm_quote_seller_profile_h" ("transaction_id");
