-- CRM cost plan accounting/payment handoff snapshot ledger.
-- Stores CRM-owned evidence for confirmed cost rows without issuing accounting vouchers or executing payments.

CREATE SCHEMA IF NOT EXISTS "crm";

CREATE TABLE IF NOT EXISTS "crm"."crm_cost_plan_accounting_handoff_m" (
  "cost_plan_accounting_handoff_id" BIGSERIAL PRIMARY KEY,
  "target_year" INTEGER NOT NULL,
  "business_type_filter" VARCHAR(120) NOT NULL DEFAULT '',
  "industry_line_filter" VARCHAR(120) NOT NULL DEFAULT '',
  "region_filter" VARCHAR(40) NOT NULL DEFAULT 'all',
  "search_filter" VARCHAR(200) NOT NULL DEFAULT '',
  "status_code" VARCHAR(40) NOT NULL DEFAULT 'snapshot-created',
  "line_count" INTEGER NOT NULL DEFAULT 0,
  "settlement_amount_total" BIGINT NOT NULL DEFAULT 0,
  "preview_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "lines_snapshot" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "memo" TEXT,
  "saved_by" BIGINT,
  "saved_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "last_source" VARCHAR(100),
  "last_activity" VARCHAR(100),
  "transaction_id" UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_cost_plan_accounting_handoff_m_active_basis"
  ON "crm"."crm_cost_plan_accounting_handoff_m" (
    "target_year",
    "business_type_filter",
    "industry_line_filter",
    "region_filter",
    "search_filter"
  )
  WHERE "is_active" = true;

CREATE INDEX IF NOT EXISTS "ix_crm_cost_plan_accounting_handoff_m_year_status"
  ON "crm"."crm_cost_plan_accounting_handoff_m" ("target_year", "status_code", "is_active");

CREATE INDEX IF NOT EXISTS "ix_crm_cost_plan_accounting_handoff_m_saved_at"
  ON "crm"."crm_cost_plan_accounting_handoff_m" ("saved_at" DESC);

COMMENT ON TABLE "crm"."crm_cost_plan_accounting_handoff_m"
  IS 'CRM-owned accounting/payment handoff snapshots for confirmed internal and AMS cost rows. Accounting voucher issuance and payment execution remain external system responsibilities.';

COMMENT ON COLUMN "crm"."crm_cost_plan_accounting_handoff_m"."preview_snapshot"
  IS 'Cost-plan accounting/payment handoff preview snapshot at handoff time, excluding runtime latest handoff metadata.';

COMMENT ON COLUMN "crm"."crm_cost_plan_accounting_handoff_m"."lines_snapshot"
  IS 'Confirmed internal-cost and AMS external-cost rows included in the CRM handoff evidence.';
