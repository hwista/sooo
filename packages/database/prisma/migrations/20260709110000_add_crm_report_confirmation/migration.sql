-- CRM report confirmation snapshot ledger.
-- Stores the CRM-owned reporting snapshot without creating accounting, PMS, or DMS completion side effects.

CREATE SCHEMA IF NOT EXISTS "crm";

CREATE TABLE IF NOT EXISTS "crm"."crm_report_confirmation_m" (
  "report_confirmation_id" BIGSERIAL PRIMARY KEY,
  "target_year" INTEGER NOT NULL,
  "business_type" VARCHAR(120) NOT NULL DEFAULT '',
  "industry_line" VARCHAR(120) NOT NULL DEFAULT '',
  "region_code" VARCHAR(20) NOT NULL DEFAULT 'all',
  "search_text" VARCHAR(200) NOT NULL DEFAULT '',
  "status_code" VARCHAR(30) NOT NULL DEFAULT 'confirmed',
  "query_snapshot" JSONB NOT NULL,
  "summary_snapshot" JSONB NOT NULL,
  "monthly_trend_snapshot" JSONB NOT NULL,
  "breakdowns_snapshot" JSONB NOT NULL,
  "attention_items_snapshot" JSONB NOT NULL,
  "opportunity_count" INTEGER NOT NULL DEFAULT 0,
  "contract_count" INTEGER NOT NULL DEFAULT 0,
  "breakdown_count" INTEGER NOT NULL DEFAULT 0,
  "attention_item_count" INTEGER NOT NULL DEFAULT 0,
  "pipeline_revenue_total" BIGINT NOT NULL DEFAULT 0,
  "plan_revenue_total" BIGINT NOT NULL DEFAULT 0,
  "actual_revenue_total" BIGINT NOT NULL DEFAULT 0,
  "revenue_delta" BIGINT NOT NULL DEFAULT 0,
  "margin_delta" BIGINT NOT NULL DEFAULT 0,
  "memo" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "confirmed_by" BIGINT,
  "confirmed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "reopened_by" BIGINT,
  "reopened_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "last_source" VARCHAR(100),
  "last_activity" VARCHAR(100),
  "transaction_id" UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_report_confirmation_m_active_basis"
  ON "crm"."crm_report_confirmation_m" (
    "target_year",
    "business_type",
    "industry_line",
    "region_code",
    "search_text"
  )
  WHERE "is_active" = true AND "status_code" = 'confirmed';

CREATE INDEX IF NOT EXISTS "ix_crm_report_confirmation_m_year_status"
  ON "crm"."crm_report_confirmation_m" ("target_year", "status_code", "is_active");

CREATE INDEX IF NOT EXISTS "ix_crm_report_confirmation_m_confirmed_at"
  ON "crm"."crm_report_confirmation_m" ("confirmed_at" DESC);

COMMENT ON TABLE "crm"."crm_report_confirmation_m"
  IS 'CRM-owned report confirmation snapshots for reports preview. Accounting, PMS KPI, and DMS document states remain separate.';

COMMENT ON COLUMN "crm"."crm_report_confirmation_m"."summary_snapshot"
  IS 'CRM reports preview summary at confirmation time, excluding runtime-only latest confirmation metadata.';

COMMENT ON COLUMN "crm"."crm_report_confirmation_m"."monthly_trend_snapshot"
  IS 'Monthly trend snapshot used to prove what was confirmed.';
