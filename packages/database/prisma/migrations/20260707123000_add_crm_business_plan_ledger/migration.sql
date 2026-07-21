-- CRM business plan ledger baseline.
-- Business plans are CRM-owned annual/versioned snapshots derived from the CRM pipeline and confirmed contract read models.

CREATE SCHEMA IF NOT EXISTS "crm";

CREATE TABLE IF NOT EXISTS "crm"."crm_business_plan_m" (
  "business_plan_id" BIGSERIAL PRIMARY KEY,
  "business_plan_code" VARCHAR(80) NOT NULL,
  "plan_name" VARCHAR(200) NOT NULL,
  "base_year" INTEGER NOT NULL,
  "version_no" INTEGER NOT NULL DEFAULT 1,
  "status_code" VARCHAR(40) NOT NULL DEFAULT 'draft',
  "confirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  "confirmed_at" TIMESTAMPTZ(6),
  "business_type_filter" VARCHAR(120),
  "industry_line_filter" VARCHAR(120),
  "region_filter" VARCHAR(30) NOT NULL DEFAULT 'all',
  "search_filter" VARCHAR(200),
  "pipeline_amount_total" BIGINT NOT NULL DEFAULT 0,
  "contract_plan_amount_total" BIGINT NOT NULL DEFAULT 0,
  "contract_actual_amount_total" BIGINT NOT NULL DEFAULT 0,
  "plan_candidate_amount_total" BIGINT NOT NULL DEFAULT 0,
  "actual_gap_amount_total" BIGINT NOT NULL DEFAULT 0,
  "row_count" INTEGER NOT NULL DEFAULT 0,
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

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_business_plan_m_code"
  ON "crm"."crm_business_plan_m" ("business_plan_code");
CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_business_plan_m_year_version"
  ON "crm"."crm_business_plan_m" ("base_year", "version_no");
CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_business_plan_m_confirmed_year"
  ON "crm"."crm_business_plan_m" ("base_year")
  WHERE "confirmed" = TRUE AND "is_active" = TRUE;
CREATE INDEX IF NOT EXISTS "ix_crm_business_plan_m_year_active"
  ON "crm"."crm_business_plan_m" ("base_year", "is_active");
CREATE INDEX IF NOT EXISTS "ix_crm_business_plan_m_status_active"
  ON "crm"."crm_business_plan_m" ("status_code", "is_active");
CREATE INDEX IF NOT EXISTS "ix_crm_business_plan_m_updated"
  ON "crm"."crm_business_plan_m" ("updated_at");

CREATE TABLE IF NOT EXISTS "crm"."crm_business_plan_h" (
  "business_plan_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "event_by" BIGINT,
  "business_plan_code" VARCHAR(80) NOT NULL,
  "plan_name" VARCHAR(200) NOT NULL,
  "base_year" INTEGER NOT NULL,
  "version_no" INTEGER NOT NULL,
  "status_code" VARCHAR(40) NOT NULL,
  "confirmed" BOOLEAN NOT NULL,
  "confirmed_at" TIMESTAMPTZ(6),
  "business_type_filter" VARCHAR(120),
  "industry_line_filter" VARCHAR(120),
  "region_filter" VARCHAR(30) NOT NULL,
  "search_filter" VARCHAR(200),
  "pipeline_amount_total" BIGINT NOT NULL,
  "contract_plan_amount_total" BIGINT NOT NULL,
  "contract_actual_amount_total" BIGINT NOT NULL,
  "plan_candidate_amount_total" BIGINT NOT NULL,
  "actual_gap_amount_total" BIGINT NOT NULL,
  "row_count" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_crm_business_plan_h" PRIMARY KEY ("business_plan_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_crm_business_plan_h_event_at"
  ON "crm"."crm_business_plan_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_crm_business_plan_h_tx"
  ON "crm"."crm_business_plan_h" ("transaction_id");

CREATE TABLE IF NOT EXISTS "crm"."crm_business_plan_line_d" (
  "business_plan_line_id" BIGSERIAL PRIMARY KEY,
  "business_plan_id" BIGINT NOT NULL,
  "line_code" VARCHAR(80) NOT NULL,
  "target_year" INTEGER NOT NULL,
  "business_type" VARCHAR(120) NOT NULL,
  "industry_line" VARCHAR(120) NOT NULL,
  "owner_name" VARCHAR(100) NOT NULL,
  "region_code" VARCHAR(30) NOT NULL DEFAULT 'domestic',
  "pipeline_amount" BIGINT NOT NULL DEFAULT 0,
  "contract_plan_amount" BIGINT NOT NULL DEFAULT 0,
  "contract_actual_amount" BIGINT NOT NULL DEFAULT 0,
  "plan_candidate_amount" BIGINT NOT NULL DEFAULT 0,
  "actual_gap_amount" BIGINT NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_crm_business_plan_line_d_plan"
    FOREIGN KEY ("business_plan_id")
    REFERENCES "crm"."crm_business_plan_m" ("business_plan_id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_business_plan_line_d_plan_code"
  ON "crm"."crm_business_plan_line_d" ("business_plan_id", "line_code");
CREATE INDEX IF NOT EXISTS "ix_crm_business_plan_line_d_plan_year"
  ON "crm"."crm_business_plan_line_d" ("business_plan_id", "target_year");
CREATE INDEX IF NOT EXISTS "ix_crm_business_plan_line_d_target_year"
  ON "crm"."crm_business_plan_line_d" ("target_year");

CREATE OR REPLACE FUNCTION "crm"."fn_crm_business_plan_h_record"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_row "crm"."crm_business_plan_m"%ROWTYPE;
  v_event_type CHAR(1);
  v_history_seq BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := OLD;
    v_event_type := 'D';
  ELSIF TG_OP = 'INSERT' THEN
    v_row := NEW;
    v_event_type := 'C';
  ELSE
    v_row := NEW;
    v_event_type := 'U';
  END IF;

  SELECT COALESCE(MAX(history_seq), 0) + 1
    INTO v_history_seq
    FROM "crm"."crm_business_plan_h"
   WHERE business_plan_id = v_row.business_plan_id;

  INSERT INTO "crm"."crm_business_plan_h" (
    business_plan_id, history_seq, event_type, event_at, event_by,
    business_plan_code, plan_name, base_year, version_no, status_code,
    confirmed, confirmed_at, business_type_filter, industry_line_filter,
    region_filter, search_filter, pipeline_amount_total, contract_plan_amount_total,
    contract_actual_amount_total, plan_candidate_amount_total, actual_gap_amount_total,
    row_count, is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  )
  VALUES (
    v_row.business_plan_id, v_history_seq, v_event_type, NOW(), v_row.updated_by,
    v_row.business_plan_code, v_row.plan_name, v_row.base_year, v_row.version_no, v_row.status_code,
    v_row.confirmed, v_row.confirmed_at, v_row.business_type_filter, v_row.industry_line_filter,
    v_row.region_filter, v_row.search_filter, v_row.pipeline_amount_total, v_row.contract_plan_amount_total,
    v_row.contract_actual_amount_total, v_row.plan_candidate_amount_total, v_row.actual_gap_amount_total,
    v_row.row_count, v_row.is_active, v_row.memo, v_row.created_by, v_row.created_at,
    v_row.updated_by, v_row.updated_at, v_row.last_source, v_row.last_activity, v_row.transaction_id
  );

  RETURN v_row;
END;
$$;

DROP TRIGGER IF EXISTS "trg_crm_business_plan_m_h_record" ON "crm"."crm_business_plan_m";
CREATE TRIGGER "trg_crm_business_plan_m_h_record"
AFTER INSERT OR UPDATE OR DELETE ON "crm"."crm_business_plan_m"
FOR EACH ROW EXECUTE FUNCTION "crm"."fn_crm_business_plan_h_record"();
