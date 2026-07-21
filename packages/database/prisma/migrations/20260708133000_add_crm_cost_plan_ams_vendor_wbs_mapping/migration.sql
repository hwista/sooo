-- CRM cost plan AMS vendor-WBS mapping.
-- Stores the CRM-owned vendor assignment required before AMS readiness can move to ready.

CREATE SCHEMA IF NOT EXISTS "crm";

CREATE TABLE IF NOT EXISTS "crm"."crm_cost_plan_ams_vendor_wbs_r" (
  "cost_plan_ams_vendor_wbs_mapping_id" BIGSERIAL PRIMARY KEY,
  "target_year" INTEGER NOT NULL,
  "business_type" VARCHAR(120) NOT NULL,
  "industry_line" VARCHAR(120) NOT NULL,
  "owner_name" VARCHAR(100) NOT NULL,
  "region_code" VARCHAR(30) NOT NULL DEFAULT 'domestic',
  "wbs_code" VARCHAR(80) NOT NULL,
  "vendor_name" VARCHAR(200) NOT NULL,
  "vendor_contract_no" VARCHAR(120),
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

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_cost_plan_ams_vendor_wbs_r_basis"
  ON "crm"."crm_cost_plan_ams_vendor_wbs_r" (
    "target_year",
    "business_type",
    "industry_line",
    "owner_name",
    "region_code",
    "wbs_code"
  );

CREATE INDEX IF NOT EXISTS "ix_crm_cost_plan_ams_vendor_wbs_r_year_active"
  ON "crm"."crm_cost_plan_ams_vendor_wbs_r" ("target_year", "is_active");

CREATE INDEX IF NOT EXISTS "ix_crm_cost_plan_ams_vendor_wbs_r_vendor"
  ON "crm"."crm_cost_plan_ams_vendor_wbs_r" ("vendor_name");

COMMENT ON TABLE "crm"."crm_cost_plan_ams_vendor_wbs_r"
  IS 'CRM-owned AMS vendor to WBS mapping used by cost-plan preview readiness. External cost monthly storage stays in a later slice.';
