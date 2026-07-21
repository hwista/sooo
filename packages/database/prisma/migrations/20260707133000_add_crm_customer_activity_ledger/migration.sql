-- CRM customer/activity ledger foundation.
-- Existing opportunity rows are backfilled into customer and activity sources for AI/RAG projection.

CREATE SCHEMA IF NOT EXISTS "crm";

CREATE TABLE IF NOT EXISTS "crm"."crm_customer_m" (
  "customer_id" BIGSERIAL PRIMARY KEY,
  "customer_code" VARCHAR(80) NOT NULL,
  "customer_name" VARCHAR(200) NOT NULL,
  "customer_type_code" VARCHAR(40) NOT NULL DEFAULT 'prospect',
  "industry_line" VARCHAR(120) NOT NULL,
  "region_code" VARCHAR(30) NOT NULL DEFAULT 'domestic',
  "owner_name" VARCHAR(100) NOT NULL,
  "owner_user_id" BIGINT,
  "contact_name" VARCHAR(120),
  "contact_email" VARCHAR(200),
  "contact_phone" VARCHAR(80),
  "source_opportunity_id" BIGINT,
  "latest_opportunity_code" VARCHAR(80),
  "latest_activity_at" TIMESTAMPTZ(6),
  "last_interaction_summary" VARCHAR(1000),
  "next_action" VARCHAR(1000) NOT NULL,
  "admin_boundary_code" VARCHAR(40) NOT NULL DEFAULT 'shared-admin',
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_crm_customer_m_source_opportunity"
    FOREIGN KEY ("source_opportunity_id")
    REFERENCES "crm"."crm_opportunity_m" ("opportunity_id")
    ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_customer_m_code"
  ON "crm"."crm_customer_m" ("customer_code");
CREATE INDEX IF NOT EXISTS "ix_crm_customer_m_name"
  ON "crm"."crm_customer_m" ("customer_name");
CREATE INDEX IF NOT EXISTS "ix_crm_customer_m_type_active"
  ON "crm"."crm_customer_m" ("customer_type_code", "is_active");
CREATE INDEX IF NOT EXISTS "ix_crm_customer_m_owner_user"
  ON "crm"."crm_customer_m" ("owner_user_id");
CREATE INDEX IF NOT EXISTS "ix_crm_customer_m_source_opportunity"
  ON "crm"."crm_customer_m" ("source_opportunity_id");
CREATE INDEX IF NOT EXISTS "ix_crm_customer_m_updated"
  ON "crm"."crm_customer_m" ("updated_at");

CREATE TABLE IF NOT EXISTS "crm"."crm_customer_h" (
  "customer_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "event_by" BIGINT,
  "customer_code" VARCHAR(80) NOT NULL,
  "customer_name" VARCHAR(200) NOT NULL,
  "customer_type_code" VARCHAR(40) NOT NULL,
  "industry_line" VARCHAR(120) NOT NULL,
  "region_code" VARCHAR(30) NOT NULL,
  "owner_name" VARCHAR(100) NOT NULL,
  "owner_user_id" BIGINT,
  "contact_name" VARCHAR(120),
  "contact_email" VARCHAR(200),
  "contact_phone" VARCHAR(80),
  "source_opportunity_id" BIGINT,
  "latest_opportunity_code" VARCHAR(80),
  "latest_activity_at" TIMESTAMPTZ(6),
  "last_interaction_summary" VARCHAR(1000),
  "next_action" VARCHAR(1000) NOT NULL,
  "admin_boundary_code" VARCHAR(40) NOT NULL,
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_crm_customer_h" PRIMARY KEY ("customer_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_crm_customer_h_event_at"
  ON "crm"."crm_customer_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_crm_customer_h_tx"
  ON "crm"."crm_customer_h" ("transaction_id");

CREATE TABLE IF NOT EXISTS "crm"."crm_customer_activity_d" (
  "activity_id" BIGSERIAL PRIMARY KEY,
  "activity_code" VARCHAR(80) NOT NULL,
  "customer_id" BIGINT NOT NULL,
  "source_opportunity_id" BIGINT,
  "source_opportunity_code" VARCHAR(80),
  "activity_type_code" VARCHAR(40) NOT NULL DEFAULT 'meeting',
  "activity_status_code" VARCHAR(40) NOT NULL DEFAULT 'done',
  "subject" VARCHAR(300) NOT NULL,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "due_at" TIMESTAMPTZ(6),
  "owner_name" VARCHAR(100) NOT NULL,
  "owner_user_id" BIGINT,
  "summary" VARCHAR(1000) NOT NULL,
  "next_action" VARCHAR(1000),
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_crm_customer_activity_d_customer"
    FOREIGN KEY ("customer_id")
    REFERENCES "crm"."crm_customer_m" ("customer_id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_crm_customer_activity_d_source_opportunity"
    FOREIGN KEY ("source_opportunity_id")
    REFERENCES "crm"."crm_opportunity_m" ("opportunity_id")
    ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_customer_activity_d_code"
  ON "crm"."crm_customer_activity_d" ("activity_code");
CREATE INDEX IF NOT EXISTS "ix_crm_customer_activity_d_customer_at"
  ON "crm"."crm_customer_activity_d" ("customer_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "ix_crm_customer_activity_d_source_opportunity"
  ON "crm"."crm_customer_activity_d" ("source_opportunity_id");
CREATE INDEX IF NOT EXISTS "ix_crm_customer_activity_d_type_active"
  ON "crm"."crm_customer_activity_d" ("activity_type_code", "is_active");
CREATE INDEX IF NOT EXISTS "ix_crm_customer_activity_d_owner_user"
  ON "crm"."crm_customer_activity_d" ("owner_user_id");

CREATE TABLE IF NOT EXISTS "crm"."crm_customer_activity_h" (
  "activity_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "event_by" BIGINT,
  "activity_code" VARCHAR(80) NOT NULL,
  "customer_id" BIGINT NOT NULL,
  "source_opportunity_id" BIGINT,
  "source_opportunity_code" VARCHAR(80),
  "activity_type_code" VARCHAR(40) NOT NULL,
  "activity_status_code" VARCHAR(40) NOT NULL,
  "subject" VARCHAR(300) NOT NULL,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "due_at" TIMESTAMPTZ(6),
  "owner_name" VARCHAR(100) NOT NULL,
  "owner_user_id" BIGINT,
  "summary" VARCHAR(1000) NOT NULL,
  "next_action" VARCHAR(1000),
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_crm_customer_activity_h" PRIMARY KEY ("activity_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_crm_customer_activity_h_event_at"
  ON "crm"."crm_customer_activity_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_crm_customer_activity_h_tx"
  ON "crm"."crm_customer_activity_h" ("transaction_id");

WITH latest_opportunity AS (
  SELECT DISTINCT ON (LOWER(TRIM(customer_name)))
    opportunity_id,
    opportunity_code,
    customer_name,
    owner_name,
    owner_user_id,
    industry_line,
    region_code,
    confirmed,
    contract_created,
    admin_boundary_code,
    next_action,
    updated_by,
    updated_at
  FROM "crm"."crm_opportunity_m"
  WHERE is_active = TRUE
    AND TRIM(customer_name) <> ''
  ORDER BY LOWER(TRIM(customer_name)), updated_at DESC, opportunity_id DESC
)
INSERT INTO "crm"."crm_customer_m" (
  customer_code,
  customer_name,
  customer_type_code,
  industry_line,
  region_code,
  owner_name,
  owner_user_id,
  source_opportunity_id,
  latest_opportunity_code,
  latest_activity_at,
  last_interaction_summary,
  next_action,
  admin_boundary_code,
  updated_by,
  updated_at,
  last_source,
  last_activity
)
SELECT
  'crm-cust-' || SUBSTRING(MD5(LOWER(TRIM(customer_name))) FROM 1 FOR 12),
  customer_name,
  CASE WHEN confirmed = TRUE OR contract_created = TRUE THEN 'active' ELSE 'prospect' END,
  industry_line,
  region_code,
  owner_name,
  owner_user_id,
  opportunity_id,
  opportunity_code,
  updated_at,
  next_action,
  next_action,
  admin_boundary_code,
  updated_by,
  updated_at,
  'crm.customer.backfill',
  'opportunity-backfill'
FROM latest_opportunity
ON CONFLICT ("customer_code") DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  customer_type_code = EXCLUDED.customer_type_code,
  industry_line = EXCLUDED.industry_line,
  region_code = EXCLUDED.region_code,
  owner_name = EXCLUDED.owner_name,
  owner_user_id = EXCLUDED.owner_user_id,
  source_opportunity_id = EXCLUDED.source_opportunity_id,
  latest_opportunity_code = EXCLUDED.latest_opportunity_code,
  latest_activity_at = EXCLUDED.latest_activity_at,
  last_interaction_summary = EXCLUDED.last_interaction_summary,
  next_action = EXCLUDED.next_action,
  admin_boundary_code = EXCLUDED.admin_boundary_code,
  updated_by = EXCLUDED.updated_by,
  updated_at = EXCLUDED.updated_at,
  last_source = EXCLUDED.last_source,
  last_activity = EXCLUDED.last_activity;

INSERT INTO "crm"."crm_customer_activity_d" (
  activity_code,
  customer_id,
  source_opportunity_id,
  source_opportunity_code,
  activity_type_code,
  activity_status_code,
  subject,
  occurred_at,
  owner_name,
  owner_user_id,
  summary,
  next_action,
  updated_by,
  updated_at,
  last_source,
  last_activity
)
SELECT
  'crm-act-opp-' || o.opportunity_id::TEXT,
  c.customer_id,
  o.opportunity_id,
  o.opportunity_code,
  'opportunity-next-action',
  'done',
  o.opportunity_name,
  o.updated_at,
  o.owner_name,
  o.owner_user_id,
  o.next_action,
  o.next_action,
  o.updated_by,
  o.updated_at,
  'crm.customer.backfill',
  'opportunity-next-action-backfill'
FROM "crm"."crm_opportunity_m" o
JOIN "crm"."crm_customer_m" c
  ON c.customer_code = 'crm-cust-' || SUBSTRING(MD5(LOWER(TRIM(o.customer_name))) FROM 1 FOR 12)
WHERE o.is_active = TRUE
  AND TRIM(o.customer_name) <> ''
ON CONFLICT ("activity_code") DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  source_opportunity_id = EXCLUDED.source_opportunity_id,
  source_opportunity_code = EXCLUDED.source_opportunity_code,
  subject = EXCLUDED.subject,
  occurred_at = EXCLUDED.occurred_at,
  owner_name = EXCLUDED.owner_name,
  owner_user_id = EXCLUDED.owner_user_id,
  summary = EXCLUDED.summary,
  next_action = EXCLUDED.next_action,
  updated_by = EXCLUDED.updated_by,
  updated_at = EXCLUDED.updated_at,
  last_source = EXCLUDED.last_source,
  last_activity = EXCLUDED.last_activity;
