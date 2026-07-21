-- CRM quote DMS handoff snapshot ledger.
-- Keeps the CRM-owned quote markdown draft evidence without taking over DMS template/export lifecycle.

CREATE SCHEMA IF NOT EXISTS "crm";

CREATE TABLE IF NOT EXISTS "crm"."crm_quote_dms_handoff_m" (
  "quote_dms_handoff_id" BIGSERIAL PRIMARY KEY,
  "opportunity_id" BIGINT NOT NULL,
  "opportunity_code" VARCHAR(80) NOT NULL,
  "quote_number" VARCHAR(120) NOT NULL,
  "document_type_code" VARCHAR(40) NOT NULL DEFAULT 'quote',
  "document_title" VARCHAR(300) NOT NULL,
  "template_key" VARCHAR(120) NOT NULL,
  "folder_hint" VARCHAR(500) NOT NULL,
  "file_name_hint" VARCHAR(300) NOT NULL,
  "draft_path" VARCHAR(800) NOT NULL,
  "status_code" VARCHAR(40) NOT NULL DEFAULT 'draft-created',
  "document_snapshot" JSONB NOT NULL,
  "variables_snapshot" JSONB NOT NULL,
  "memo" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "saved_by" BIGINT,
  "saved_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "last_source" VARCHAR(100),
  "last_activity" VARCHAR(100),
  "transaction_id" UUID,
  CONSTRAINT "fk_crm_quote_dms_handoff_m_opportunity"
    FOREIGN KEY ("opportunity_id")
    REFERENCES "crm"."crm_opportunity_m" ("opportunity_id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_quote_dms_handoff_m_active_opportunity_template"
  ON "crm"."crm_quote_dms_handoff_m" ("opportunity_id", "template_key")
  WHERE "is_active" = true;

CREATE INDEX IF NOT EXISTS "ix_crm_quote_dms_handoff_m_opportunity_code"
  ON "crm"."crm_quote_dms_handoff_m" ("opportunity_code", "is_active", "saved_at" DESC);

CREATE INDEX IF NOT EXISTS "ix_crm_quote_dms_handoff_m_saved_at"
  ON "crm"."crm_quote_dms_handoff_m" ("saved_at" DESC);

COMMENT ON TABLE "crm"."crm_quote_dms_handoff_m"
  IS 'CRM-owned DMS document handoff snapshots for quote markdown drafts. DMS remains owner of templates, Word/PDF export, and document lifecycle state.';

COMMENT ON COLUMN "crm"."crm_quote_dms_handoff_m"."document_snapshot"
  IS 'Quote DMS document preview snapshot at draft handoff time.';

COMMENT ON COLUMN "crm"."crm_quote_dms_handoff_m"."variables_snapshot"
  IS 'Quote document variable snapshot handed off to DMS.';
