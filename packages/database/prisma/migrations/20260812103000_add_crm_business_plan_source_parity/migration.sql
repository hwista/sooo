-- CRM source parity: one logical row spans the base-year monthly revenue/external cost
-- and the following two annual revenue/external-cost slots.

ALTER TABLE "crm"."crm_business_plan_line_d"
  ADD COLUMN IF NOT EXISTS "row_code" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "business_name" VARCHAR(200) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "wbs_code" VARCHAR(120) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "plan_external_cost_amount" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "plan_monthly_external_cost_amounts" JSONB;

UPDATE "crm"."crm_business_plan_line_d"
   SET "row_code" = 'ROW-' || UPPER(SUBSTRING(MD5(CONCAT_WS(
         '::',
         "business_type",
         "industry_line",
         "owner_name",
         "region_code"
       )) FROM 1 FOR 24))
 WHERE "row_code" IS NULL OR BTRIM("row_code") = '';

UPDATE "crm"."crm_business_plan_line_d"
   SET "business_name" = "industry_line"
 WHERE BTRIM("business_name") = '';

ALTER TABLE "crm"."crm_business_plan_line_d"
  ALTER COLUMN "row_code" SET NOT NULL;

UPDATE "crm"."crm_business_plan_m" AS plan
   SET "row_count" = totals.row_count
  FROM (
    SELECT "business_plan_id", COUNT(DISTINCT "row_code")::INTEGER AS row_count
      FROM "crm"."crm_business_plan_line_d"
     WHERE "is_active" = TRUE
     GROUP BY "business_plan_id"
  ) AS totals
 WHERE plan."business_plan_id" = totals."business_plan_id";

CREATE INDEX IF NOT EXISTS "ix_crm_business_plan_line_d_plan_row"
  ON "crm"."crm_business_plan_line_d" ("business_plan_id", "row_code");

COMMENT ON COLUMN "crm"."crm_business_plan_line_d"."row_code"
  IS 'Stable logical business-plan row identifier shared by its three target-year lines.';
COMMENT ON COLUMN "crm"."crm_business_plan_line_d"."plan_external_cost_amount"
  IS 'Annual external-cost plan amount for the target-year line.';
COMMENT ON COLUMN "crm"."crm_business_plan_line_d"."plan_monthly_external_cost_amounts"
  IS 'Base-year 12-month external-cost input. Null means annual amount is distributed evenly at read time.';
