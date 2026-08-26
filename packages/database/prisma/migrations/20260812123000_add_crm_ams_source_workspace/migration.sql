-- CRM AMS source-parity vendor master, multi-WBS mapping and annual external-cost grid.

CREATE TABLE IF NOT EXISTS "crm"."crm_cost_plan_ams_source_vendor_m" (
  "cost_plan_ams_source_vendor_id" BIGSERIAL PRIMARY KEY,
  "target_year" INTEGER NOT NULL,
  "vendor_name" VARCHAR(200) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "last_source" VARCHAR(100),
  "last_activity" VARCHAR(100),
  "transaction_id" UUID
);

CREATE INDEX IF NOT EXISTS "ix_crm_cost_plan_ams_source_vendor_m_year_active"
  ON "crm"."crm_cost_plan_ams_source_vendor_m" ("target_year", "is_active");

CREATE TABLE IF NOT EXISTS "crm"."crm_cost_plan_ams_source_vendor_wbs_r" (
  "cost_plan_ams_source_vendor_wbs_id" BIGSERIAL PRIMARY KEY,
  "vendor_id" BIGINT NOT NULL REFERENCES "crm"."crm_cost_plan_ams_source_vendor_m"("cost_plan_ams_source_vendor_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "wbs_code" VARCHAR(80) NOT NULL,
  "contract_id" BIGINT REFERENCES "crm"."crm_contract_m"("contract_id") ON DELETE SET NULL ON UPDATE CASCADE,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "last_source" VARCHAR(100),
  "last_activity" VARCHAR(100),
  "transaction_id" UUID,
  CONSTRAINT "crm_cost_plan_ams_source_vendor_wbs_r_vendor_id_wbs_code_key" UNIQUE ("vendor_id", "wbs_code")
);

CREATE INDEX IF NOT EXISTS "ix_crm_cost_plan_ams_source_vendor_wbs_r_wbs"
  ON "crm"."crm_cost_plan_ams_source_vendor_wbs_r" ("wbs_code");

CREATE TABLE IF NOT EXISTS "crm"."crm_cost_plan_ams_source_external_monthly_d" (
  "cost_plan_ams_source_external_monthly_id" BIGSERIAL PRIMARY KEY,
  "vendor_id" BIGINT NOT NULL REFERENCES "crm"."crm_cost_plan_ams_source_vendor_m"("cost_plan_ams_source_vendor_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "wbs_code" VARCHAR(80) NOT NULL,
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
  CONSTRAINT "crm_cost_plan_ams_source_external_monthly_d_vendor_id_wbs_c_key" UNIQUE ("vendor_id", "wbs_code")
);

CREATE INDEX IF NOT EXISTS "ix_crm_cost_plan_ams_source_external_monthly_d_wbs_active"
  ON "crm"."crm_cost_plan_ams_source_external_monthly_d" ("wbs_code", "is_active");

COMMENT ON COLUMN "crm"."crm_cost_plan_ams_source_external_monthly_d"."difference_amount_total"
  IS 'Original AMS source formula: actual total minus plan total.';
