-- CRM source-parity internal cost grid.
-- Preserves the original five fixed items and signed plan/actual monthly values.

CREATE TABLE IF NOT EXISTS "crm"."crm_cost_plan_internal_item_monthly_d" (
  "cost_plan_internal_item_monthly_id" BIGSERIAL PRIMARY KEY,
  "target_year" INTEGER NOT NULL,
  "item_code" VARCHAR(30) NOT NULL,
  "item_name" VARCHAR(80) NOT NULL,
  "monthly_plan_amounts" JSONB NOT NULL,
  "monthly_actual_amounts" JSONB NOT NULL,
  "plan_amount_total" BIGINT NOT NULL DEFAULT 0,
  "actual_amount_total" BIGINT NOT NULL DEFAULT 0,
  "difference_amount_total" BIGINT NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "last_source" VARCHAR(100),
  "last_activity" VARCHAR(100),
  "transaction_id" UUID,
  CONSTRAINT "crm_cost_plan_internal_item_monthly_d_target_year_item_code_key" UNIQUE ("target_year", "item_code"),
  CONSTRAINT "ck_crm_cost_plan_internal_item_monthly_d_item_code"
    CHECK ("item_code" IN ('labor', 'other', 'dept_adj', 'svc', 'dept_common'))
);

CREATE INDEX IF NOT EXISTS "ix_crm_cost_plan_internal_item_monthly_d_year_active"
  ON "crm"."crm_cost_plan_internal_item_monthly_d" ("target_year", "is_active");

COMMENT ON TABLE "crm"."crm_cost_plan_internal_item_monthly_d"
  IS 'Source-compatible annual internal cost grid with five fixed items and signed monthly plan/actual values.';

COMMENT ON COLUMN "crm"."crm_cost_plan_internal_item_monthly_d"."difference_amount_total"
  IS 'Original source formula: plan total minus actual total.';
