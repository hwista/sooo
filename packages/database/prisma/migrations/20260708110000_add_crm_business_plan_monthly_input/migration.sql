-- CRM business plan monthly input.
-- Keeps monthly plan revenue directly on the CRM-owned business plan line snapshot.

CREATE SCHEMA IF NOT EXISTS "crm";

ALTER TABLE "crm"."crm_business_plan_line_d"
  ADD COLUMN IF NOT EXISTS "plan_monthly_revenue_amounts" JSONB;

COMMENT ON COLUMN "crm"."crm_business_plan_line_d"."plan_monthly_revenue_amounts"
  IS '12-month CRM business plan revenue input. Null means annual amount is distributed evenly at read time.';
