-- CRM opportunity ledger baseline.
-- CRM domain rows stay in crm schema and are projected into common.cm_ai_* only through adapters.

CREATE SCHEMA IF NOT EXISTS "crm";

CREATE TABLE IF NOT EXISTS "crm"."crm_opportunity_m" (
  "opportunity_id" BIGSERIAL PRIMARY KEY,
  "opportunity_code" VARCHAR(80) NOT NULL,
  "opportunity_group_code" VARCHAR(80) NOT NULL,
  "customer_name" VARCHAR(200) NOT NULL,
  "opportunity_name" VARCHAR(300) NOT NULL,
  "owner_name" VARCHAR(100) NOT NULL,
  "business_type" VARCHAR(120) NOT NULL,
  "industry_line" VARCHAR(120) NOT NULL,
  "region_code" VARCHAR(30) NOT NULL DEFAULT 'domestic',
  "status_code" VARCHAR(40) NOT NULL DEFAULT 'draft',
  "priority_code" VARCHAR(40) NOT NULL DEFAULT 'medium',
  "version_no" INTEGER NOT NULL DEFAULT 1,
  "confirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  "contract_created" BOOLEAN NOT NULL DEFAULT FALSE,
  "contract_created_at" TIMESTAMPTZ(6),
  "contract_code" VARCHAR(80),
  "expected_start_date" DATE,
  "expected_end_date" DATE,
  "payment_term_code" VARCHAR(80),
  "revenue_subtotal" BIGINT NOT NULL DEFAULT 0,
  "special_discount_type_code" VARCHAR(30) NOT NULL DEFAULT 'amount',
  "special_discount_value" DECIMAL(12,2),
  "special_discount_amount" BIGINT NOT NULL DEFAULT 0,
  "revenue_total" BIGINT NOT NULL DEFAULT 0,
  "cost_total" BIGINT NOT NULL DEFAULT 0,
  "pms_handoff_status_code" VARCHAR(40) NOT NULL DEFAULT 'planned',
  "dms_link_status_code" VARCHAR(40) NOT NULL DEFAULT 'planned',
  "admin_boundary_code" VARCHAR(40) NOT NULL DEFAULT 'shared-admin',
  "next_action" VARCHAR(1000) NOT NULL,
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

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_opportunity_m_code"
  ON "crm"."crm_opportunity_m" ("opportunity_code");
CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_m_status_active"
  ON "crm"."crm_opportunity_m" ("status_code", "is_active");
CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_m_customer"
  ON "crm"."crm_opportunity_m" ("customer_name");
CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_m_updated"
  ON "crm"."crm_opportunity_m" ("updated_at");

CREATE TABLE IF NOT EXISTS "crm"."crm_opportunity_h" (
  "opportunity_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "event_by" BIGINT,
  "opportunity_code" VARCHAR(80) NOT NULL,
  "opportunity_group_code" VARCHAR(80) NOT NULL,
  "customer_name" VARCHAR(200) NOT NULL,
  "opportunity_name" VARCHAR(300) NOT NULL,
  "owner_name" VARCHAR(100) NOT NULL,
  "business_type" VARCHAR(120) NOT NULL,
  "industry_line" VARCHAR(120) NOT NULL,
  "region_code" VARCHAR(30) NOT NULL,
  "status_code" VARCHAR(40) NOT NULL,
  "priority_code" VARCHAR(40) NOT NULL,
  "version_no" INTEGER NOT NULL,
  "confirmed" BOOLEAN NOT NULL,
  "contract_created" BOOLEAN NOT NULL,
  "contract_created_at" TIMESTAMPTZ(6),
  "contract_code" VARCHAR(80),
  "expected_start_date" DATE,
  "expected_end_date" DATE,
  "payment_term_code" VARCHAR(80),
  "revenue_subtotal" BIGINT NOT NULL,
  "special_discount_type_code" VARCHAR(30) NOT NULL,
  "special_discount_value" DECIMAL(12,2),
  "special_discount_amount" BIGINT NOT NULL,
  "revenue_total" BIGINT NOT NULL,
  "cost_total" BIGINT NOT NULL,
  "pms_handoff_status_code" VARCHAR(40) NOT NULL,
  "dms_link_status_code" VARCHAR(40) NOT NULL,
  "admin_boundary_code" VARCHAR(40) NOT NULL,
  "next_action" VARCHAR(1000) NOT NULL,
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_crm_opportunity_h" PRIMARY KEY ("opportunity_id", "history_seq")
);

ALTER TABLE "crm"."crm_opportunity_m"
  ADD COLUMN IF NOT EXISTS "opportunity_group_code" VARCHAR(80);
UPDATE "crm"."crm_opportunity_m"
SET "opportunity_group_code" = "opportunity_code"
WHERE "opportunity_group_code" IS NULL;
ALTER TABLE "crm"."crm_opportunity_m"
  ALTER COLUMN "opportunity_group_code" SET NOT NULL;

ALTER TABLE "crm"."crm_opportunity_h"
  ADD COLUMN IF NOT EXISTS "opportunity_group_code" VARCHAR(80);
UPDATE "crm"."crm_opportunity_h"
SET "opportunity_group_code" = "opportunity_code"
WHERE "opportunity_group_code" IS NULL;
ALTER TABLE "crm"."crm_opportunity_h"
  ALTER COLUMN "opportunity_group_code" SET NOT NULL;

ALTER TABLE "crm"."crm_opportunity_m"
  ADD COLUMN IF NOT EXISTS "contract_created" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "contract_created_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "contract_code" VARCHAR(80);
UPDATE "crm"."crm_opportunity_m"
SET "contract_created" = FALSE
WHERE "contract_created" IS NULL;
ALTER TABLE "crm"."crm_opportunity_m"
  ALTER COLUMN "contract_created" SET DEFAULT FALSE,
  ALTER COLUMN "contract_created" SET NOT NULL;

ALTER TABLE "crm"."crm_opportunity_h"
  ADD COLUMN IF NOT EXISTS "contract_created" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "contract_created_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "contract_code" VARCHAR(80);
UPDATE "crm"."crm_opportunity_h"
SET "contract_created" = FALSE
WHERE "contract_created" IS NULL;
ALTER TABLE "crm"."crm_opportunity_h"
  ALTER COLUMN "contract_created" SET DEFAULT FALSE,
  ALTER COLUMN "contract_created" SET NOT NULL;

ALTER TABLE "crm"."crm_opportunity_m"
  ADD COLUMN IF NOT EXISTS "payment_term_code" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "revenue_subtotal" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "special_discount_type_code" VARCHAR(30) NOT NULL DEFAULT 'amount',
  ADD COLUMN IF NOT EXISTS "special_discount_value" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "special_discount_amount" BIGINT NOT NULL DEFAULT 0;
UPDATE "crm"."crm_opportunity_m"
SET "revenue_subtotal" = "revenue_total"
WHERE "revenue_subtotal" = 0 AND "revenue_total" > 0;

ALTER TABLE "crm"."crm_opportunity_h"
  ADD COLUMN IF NOT EXISTS "payment_term_code" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "revenue_subtotal" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "special_discount_type_code" VARCHAR(30) NOT NULL DEFAULT 'amount',
  ADD COLUMN IF NOT EXISTS "special_discount_value" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "special_discount_amount" BIGINT NOT NULL DEFAULT 0;
UPDATE "crm"."crm_opportunity_h"
SET "revenue_subtotal" = "revenue_total"
WHERE "revenue_subtotal" = 0 AND "revenue_total" > 0;

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_opportunity_m_group_version"
  ON "crm"."crm_opportunity_m" ("opportunity_group_code", "version_no");
CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_m_group_version"
  ON "crm"."crm_opportunity_m" ("opportunity_group_code", "version_no");
CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_m_contract_code"
  ON "crm"."crm_opportunity_m" ("contract_code");

CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_h_event_at"
  ON "crm"."crm_opportunity_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_h_tx"
  ON "crm"."crm_opportunity_h" ("transaction_id");

CREATE TABLE IF NOT EXISTS "crm"."crm_opportunity_line_d" (
  "opportunity_line_id" BIGSERIAL PRIMARY KEY,
  "opportunity_id" BIGINT NOT NULL,
  "line_code" VARCHAR(80) NOT NULL,
  "line_kind_code" VARCHAR(30) NOT NULL,
  "category_code" VARCHAR(60) NOT NULL,
  "line_label" VARCHAR(300) NOT NULL,
  "quantity" DECIMAL(12,2),
  "unit_price" BIGINT,
  "amount" BIGINT NOT NULL DEFAULT 0,
  "margin_rate" DECIMAL(7,2),
  "trunc_unit" BIGINT,
  "department" VARCHAR(120),
  "member_name" VARCHAR(120),
  "grade" VARCHAR(80),
  "service_type_code" VARCHAR(30),
  "revenue_linked" BOOLEAN NOT NULL DEFAULT FALSE,
  "linked_cost_line_code" VARCHAR(80),
  "revenue_unit_price" BIGINT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_crm_opportunity_line_d_opportunity"
    FOREIGN KEY ("opportunity_id")
    REFERENCES "crm"."crm_opportunity_m" ("opportunity_id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_opportunity_line_d_opportunity_code"
  ON "crm"."crm_opportunity_line_d" ("opportunity_id", "line_code");
CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_line_d_kind"
  ON "crm"."crm_opportunity_line_d" ("opportunity_id", "line_kind_code");

CREATE TABLE IF NOT EXISTS "crm"."crm_opportunity_line_h" (
  "opportunity_line_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "event_by" BIGINT,
  "opportunity_id" BIGINT NOT NULL,
  "line_code" VARCHAR(80) NOT NULL,
  "line_kind_code" VARCHAR(30) NOT NULL,
  "category_code" VARCHAR(60) NOT NULL,
  "line_label" VARCHAR(300) NOT NULL,
  "quantity" DECIMAL(12,2),
  "unit_price" BIGINT,
  "amount" BIGINT NOT NULL,
  "margin_rate" DECIMAL(7,2),
  "trunc_unit" BIGINT,
  "department" VARCHAR(120),
  "member_name" VARCHAR(120),
  "grade" VARCHAR(80),
  "service_type_code" VARCHAR(30),
  "revenue_linked" BOOLEAN NOT NULL DEFAULT FALSE,
  "linked_cost_line_code" VARCHAR(80),
  "revenue_unit_price" BIGINT,
  "sort_order" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_crm_opportunity_line_h" PRIMARY KEY ("opportunity_line_id", "history_seq")
);

ALTER TABLE "crm"."crm_opportunity_line_d"
  ADD COLUMN IF NOT EXISTS "quantity" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "unit_price" BIGINT,
  ADD COLUMN IF NOT EXISTS "margin_rate" DECIMAL(7,2),
  ADD COLUMN IF NOT EXISTS "trunc_unit" BIGINT,
  ADD COLUMN IF NOT EXISTS "department" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "member_name" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "grade" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "service_type_code" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "revenue_linked" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "linked_cost_line_code" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "revenue_unit_price" BIGINT;

ALTER TABLE "crm"."crm_opportunity_line_h"
  ADD COLUMN IF NOT EXISTS "quantity" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "unit_price" BIGINT,
  ADD COLUMN IF NOT EXISTS "margin_rate" DECIMAL(7,2),
  ADD COLUMN IF NOT EXISTS "trunc_unit" BIGINT,
  ADD COLUMN IF NOT EXISTS "department" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "member_name" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "grade" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "service_type_code" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "revenue_linked" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "linked_cost_line_code" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "revenue_unit_price" BIGINT;

CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_line_h_event_at"
  ON "crm"."crm_opportunity_line_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_line_h_tx"
  ON "crm"."crm_opportunity_line_h" ("transaction_id");
