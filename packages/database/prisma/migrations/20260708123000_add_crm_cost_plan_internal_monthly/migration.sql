-- CRM cost plan internal monthly input.
-- Stores CRM-owned monthly internal cost plan/actual amounts before AMS external cost storage is introduced.

CREATE SCHEMA IF NOT EXISTS "crm";

CREATE TABLE IF NOT EXISTS "crm"."crm_cost_plan_internal_monthly_d" (
  "cost_plan_internal_monthly_id" BIGSERIAL PRIMARY KEY,
  "target_year" INTEGER NOT NULL,
  "business_type" VARCHAR(120) NOT NULL,
  "industry_line" VARCHAR(120) NOT NULL,
  "owner_name" VARCHAR(100) NOT NULL,
  "region_code" VARCHAR(30) NOT NULL DEFAULT 'domestic',
  "wbs_code" VARCHAR(80) NOT NULL DEFAULT '',
  "monthly_plan_amounts" JSONB NOT NULL,
  "monthly_actual_amounts" JSONB NOT NULL,
  "plan_amount_total" BIGINT NOT NULL DEFAULT 0,
  "actual_amount_total" BIGINT NOT NULL DEFAULT 0,
  "gap_amount_total" BIGINT NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
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

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_cost_plan_internal_monthly_d_basis"
  ON "crm"."crm_cost_plan_internal_monthly_d" (
    "target_year",
    "business_type",
    "industry_line",
    "owner_name",
    "region_code",
    "wbs_code"
  );

CREATE INDEX IF NOT EXISTS "ix_crm_cost_plan_internal_monthly_d_year_active"
  ON "crm"."crm_cost_plan_internal_monthly_d" ("target_year", "is_active");

CREATE INDEX IF NOT EXISTS "ix_crm_cost_plan_internal_monthly_d_business"
  ON "crm"."crm_cost_plan_internal_monthly_d" ("business_type", "industry_line");

COMMENT ON TABLE "crm"."crm_cost_plan_internal_monthly_d"
  IS 'CRM-owned monthly internal cost plan/actual inputs used by cost-plan preview. AMS vendor mapping and external cost storage stay in later slices.';
