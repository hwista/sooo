-- CRM business plan performance direct actual input.
-- Keeps manual monthly revenue/cost actual adjustments separate from contract and cost ledgers.

CREATE SCHEMA IF NOT EXISTS "crm";

CREATE TABLE IF NOT EXISTS "crm"."crm_business_plan_performance_actual_d" (
  "business_plan_performance_actual_id" BIGSERIAL PRIMARY KEY,
  "target_year" INTEGER NOT NULL,
  "business_type" VARCHAR(120) NOT NULL,
  "industry_line" VARCHAR(120) NOT NULL,
  "owner_name" VARCHAR(120) NOT NULL,
  "region_code" VARCHAR(20) NOT NULL DEFAULT 'domestic',
  "wbs_code" VARCHAR(120) NOT NULL DEFAULT '',
  "monthly_revenue_amounts" JSONB NOT NULL,
  "monthly_cost_amounts" JSONB NOT NULL,
  "revenue_amount_total" BIGINT NOT NULL DEFAULT 0,
  "cost_amount_total" BIGINT NOT NULL DEFAULT 0,
  "memo" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "last_source" VARCHAR(100),
  "last_activity" VARCHAR(100),
  "transaction_id" UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_business_plan_performance_actual_d_basis"
  ON "crm"."crm_business_plan_performance_actual_d" (
    "target_year",
    "business_type",
    "industry_line",
    "owner_name",
    "region_code",
    "wbs_code"
  );

CREATE INDEX IF NOT EXISTS "ix_crm_business_plan_performance_actual_d_year_active"
  ON "crm"."crm_business_plan_performance_actual_d" ("target_year", "is_active");

CREATE INDEX IF NOT EXISTS "ix_crm_business_plan_performance_actual_d_business"
  ON "crm"."crm_business_plan_performance_actual_d" ("business_type", "industry_line");

COMMENT ON TABLE "crm"."crm_business_plan_performance_actual_d"
  IS 'CRM-owned monthly business plan performance direct actual revenue/cost adjustments. Contract, PMS, accounting ledgers remain separate.';

COMMENT ON COLUMN "crm"."crm_business_plan_performance_actual_d"."monthly_revenue_amounts"
  IS '12-month direct actual revenue input for business plan performance preview.';

COMMENT ON COLUMN "crm"."crm_business_plan_performance_actual_d"."monthly_cost_amounts"
  IS '12-month direct actual cost input for business plan performance preview.';
