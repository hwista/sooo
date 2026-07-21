-- CRM contract DMS handoff snapshot ledger.
-- Keeps the CRM-owned document packet handoff evidence without taking over DMS template/review/export lifecycle.

CREATE SCHEMA IF NOT EXISTS "crm";

CREATE TABLE IF NOT EXISTS "crm"."crm_contract_dms_handoff_m" (
  "contract_dms_handoff_id" BIGSERIAL PRIMARY KEY,
  "contract_id" BIGINT NOT NULL,
  "contract_code" VARCHAR(80) NOT NULL,
  "document_type_code" VARCHAR(40) NOT NULL DEFAULT 'contract',
  "document_title" VARCHAR(300) NOT NULL,
  "template_key" VARCHAR(120) NOT NULL,
  "folder_hint" VARCHAR(500) NOT NULL,
  "file_name_hint" VARCHAR(300) NOT NULL,
  "draft_path" VARCHAR(800) NOT NULL,
  "status_code" VARCHAR(40) NOT NULL DEFAULT 'draft-created',
  "document_snapshot" JSONB NOT NULL,
  "variables_snapshot" JSONB NOT NULL,
  "attachments_snapshot" JSONB NOT NULL,
  "memo" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "saved_by" BIGINT,
  "saved_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "last_source" VARCHAR(100),
  "last_activity" VARCHAR(100),
  "transaction_id" UUID,
  CONSTRAINT "fk_crm_contract_dms_handoff_m_contract"
    FOREIGN KEY ("contract_id")
    REFERENCES "crm"."crm_contract_m" ("contract_id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_contract_dms_handoff_m_active_contract_template"
  ON "crm"."crm_contract_dms_handoff_m" ("contract_id", "template_key")
  WHERE "is_active" = true;

CREATE INDEX IF NOT EXISTS "ix_crm_contract_dms_handoff_m_contract_code"
  ON "crm"."crm_contract_dms_handoff_m" ("contract_code", "is_active", "saved_at" DESC);

CREATE INDEX IF NOT EXISTS "ix_crm_contract_dms_handoff_m_saved_at"
  ON "crm"."crm_contract_dms_handoff_m" ("saved_at" DESC);

COMMENT ON TABLE "crm"."crm_contract_dms_handoff_m"
  IS 'CRM-owned DMS document handoff snapshots for contract markdown drafts. DMS remains owner of templates, review, attachments, Word/PDF export, and approval state.';

COMMENT ON COLUMN "crm"."crm_contract_dms_handoff_m"."document_snapshot"
  IS 'Contract DMS document preview snapshot at draft handoff time.';

COMMENT ON COLUMN "crm"."crm_contract_dms_handoff_m"."variables_snapshot"
  IS 'Document variable snapshot handed off to DMS.';

COMMENT ON COLUMN "crm"."crm_contract_dms_handoff_m"."attachments_snapshot"
  IS 'Attachment readiness snapshot handed off to DMS; not a DMS approval or attachment lifecycle state.';
