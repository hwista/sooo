-- CRM cost plan internal monthly confirmation.
-- Adds non-destructive confirmation state to the existing internal monthly input ledger.

ALTER TABLE "crm"."crm_cost_plan_internal_monthly_d"
  ADD COLUMN IF NOT EXISTS "status_code" VARCHAR(30) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "confirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "confirmed_by" BIGINT;

UPDATE "crm"."crm_cost_plan_internal_monthly_d"
   SET status_code = CASE WHEN confirmed THEN 'confirmed' ELSE 'draft' END
 WHERE status_code IS NULL
    OR status_code = '';

CREATE INDEX IF NOT EXISTS "ix_crm_cost_plan_internal_monthly_d_year_status"
  ON "crm"."crm_cost_plan_internal_monthly_d" ("target_year", "status_code");

COMMENT ON COLUMN "crm"."crm_cost_plan_internal_monthly_d"."status_code"
  IS 'CRM internal monthly input workflow status: draft or confirmed.';

COMMENT ON COLUMN "crm"."crm_cost_plan_internal_monthly_d"."confirmed"
  IS 'Whether the internal monthly input is confirmed and locked for direct edits.';
