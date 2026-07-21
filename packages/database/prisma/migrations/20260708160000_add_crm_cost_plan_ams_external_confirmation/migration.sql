-- CRM cost plan AMS external monthly settlement confirmation.
-- Adds a lightweight workflow state to lock vendor/WBS monthly external cost inputs.

ALTER TABLE "crm"."crm_cost_plan_ams_external_monthly_d"
  ADD COLUMN IF NOT EXISTS "status_code" VARCHAR(30) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "confirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "confirmed_by" BIGINT;

CREATE INDEX IF NOT EXISTS "ix_crm_cost_plan_ams_external_monthly_d_year_status"
  ON "crm"."crm_cost_plan_ams_external_monthly_d" ("target_year", "status_code");

COMMENT ON COLUMN "crm"."crm_cost_plan_ams_external_monthly_d"."status_code"
  IS 'AMS external monthly input workflow status: draft or confirmed.';

COMMENT ON COLUMN "crm"."crm_cost_plan_ams_external_monthly_d"."confirmed"
  IS 'Whether the AMS external monthly input is settlement-confirmed and locked for direct edits.';

COMMENT ON COLUMN "crm"."crm_cost_plan_ams_external_monthly_d"."confirmed_at"
  IS 'Timestamp when the AMS external monthly input was settlement-confirmed.';

COMMENT ON COLUMN "crm"."crm_cost_plan_ams_external_monthly_d"."confirmed_by"
  IS 'User id that settlement-confirmed the AMS external monthly input.';
