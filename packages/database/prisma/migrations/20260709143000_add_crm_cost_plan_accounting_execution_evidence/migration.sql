-- CRM cost plan accounting/payment external execution evidence.
-- Keeps CRM as an evidence receiver while voucher issuance and payment execution remain external.

ALTER TABLE "crm"."crm_cost_plan_accounting_handoff_m"
  ADD COLUMN IF NOT EXISTS "execution_evidence_snapshot" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "execution_evidence_updated_at" TIMESTAMPTZ;

COMMENT ON COLUMN "crm"."crm_cost_plan_accounting_handoff_m"."execution_evidence_snapshot"
  IS 'External accounting/payment execution evidence references received by CRM for the active handoff snapshot.';

COMMENT ON COLUMN "crm"."crm_cost_plan_accounting_handoff_m"."execution_evidence_updated_at"
  IS 'Timestamp when CRM last received external accounting/payment execution evidence for this handoff snapshot.';
