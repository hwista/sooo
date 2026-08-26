-- Source-compatible DOCX contract generation handoff for confirmed CRM opportunities.

CREATE TABLE IF NOT EXISTS "crm"."crm_opportunity_contract_dms_handoff_m" (
  "opportunity_contract_dms_handoff_id" BIGSERIAL PRIMARY KEY,
  "opportunity_id" BIGINT NOT NULL,
  "opportunity_code" VARCHAR(80) NOT NULL,
  "document_title" VARCHAR(300) NOT NULL,
  "template_key" VARCHAR(120) NOT NULL,
  "folder_hint" VARCHAR(500) NOT NULL,
  "file_name_hint" VARCHAR(300) NOT NULL,
  "draft_path" VARCHAR(800) NOT NULL,
  "status_code" VARCHAR(40) NOT NULL DEFAULT 'draft-created',
  "document_snapshot" JSONB NOT NULL,
  "variables_snapshot" JSONB NOT NULL,
  "artifact_snapshot" JSONB,
  "memo" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "saved_by" BIGINT,
  "saved_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "crm_opportunity_contract_dms_handoff_m_opportunity_id_fkey"
    FOREIGN KEY ("opportunity_id")
    REFERENCES "crm"."crm_opportunity_m" ("opportunity_id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_opportunity_contract_dms_handoff_m_active_opportunity_template"
  ON "crm"."crm_opportunity_contract_dms_handoff_m" ("opportunity_id", "template_key")
  WHERE "is_active" = TRUE;

CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_contract_dms_handoff_m_opportunity_template"
  ON "crm"."crm_opportunity_contract_dms_handoff_m" ("opportunity_id", "template_key");

CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_contract_dms_handoff_m_opportunity_code"
  ON "crm"."crm_opportunity_contract_dms_handoff_m" ("opportunity_code", "is_active", "saved_at");

CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_contract_dms_handoff_m_saved_at"
  ON "crm"."crm_opportunity_contract_dms_handoff_m" ("saved_at");

COMMENT ON TABLE "crm"."crm_opportunity_contract_dms_handoff_m" IS
  'CRM-owned snapshot of the source 22-variable opportunity contract document handoff; DMS owns DOCX template binary, rendering, and artifact storage.';
COMMENT ON COLUMN "crm"."crm_opportunity_contract_dms_handoff_m"."variables_snapshot" IS
  'Exact ordered 22-variable snapshot derived from a confirmed latest CRM opportunity, seller profile, owner profile, and system date.';
COMMENT ON COLUMN "crm"."crm_opportunity_contract_dms_handoff_m"."artifact_snapshot" IS
  'DMS-owned rendered DOCX artifact reference copied back into the CRM handoff ledger.';
