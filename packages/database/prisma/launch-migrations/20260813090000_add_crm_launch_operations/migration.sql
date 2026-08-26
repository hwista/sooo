-- CRM launch operations foundation.
-- Secrets and external provider credentials are intentionally excluded.

CREATE TABLE "crm"."crm_config_m" (
  "crm_config_id" BIGSERIAL NOT NULL,
  "config_code" VARCHAR(80) NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "quote_template_key" VARCHAR(120) NOT NULL DEFAULT 'crm-quote-v1',
  "contract_template_key" VARCHAR(120) NOT NULL DEFAULT 'crm-contract-v1',
  "dms_handoff_enabled" BOOLEAN NOT NULL DEFAULT true,
  "pms_handoff_enabled" BOOLEAN NOT NULL DEFAULT false,
  "accounting_handoff_enabled" BOOLEAN NOT NULL DEFAULT false,
  "accounting_provider_mode_code" VARCHAR(40) NOT NULL DEFAULT 'disabled',
  "stalled_after_minutes" INTEGER NOT NULL DEFAULT 30,
  "attempt_retention_days" INTEGER NOT NULL DEFAULT 90,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "crm_config_m_pkey" PRIMARY KEY ("crm_config_id"),
  CONSTRAINT "ck_crm_config_m_revision" CHECK ("revision" >= 1),
  CONSTRAINT "ck_crm_config_m_accounting_mode" CHECK ("accounting_provider_mode_code" IN ('disabled', 'external-api')),
  CONSTRAINT "ck_crm_config_m_stalled_after" CHECK ("stalled_after_minutes" BETWEEN 5 AND 1440),
  CONSTRAINT "ck_crm_config_m_retention" CHECK ("attempt_retention_days" BETWEEN 7 AND 3650)
);

CREATE UNIQUE INDEX "ux_crm_config_m_code" ON "crm"."crm_config_m"("config_code");
CREATE INDEX "ix_crm_config_m_active" ON "crm"."crm_config_m"("is_active");

CREATE TABLE "crm"."crm_config_h" (
  "crm_config_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "event_by" BIGINT,
  "config_code" VARCHAR(80) NOT NULL,
  "revision" INTEGER NOT NULL,
  "quote_template_key" VARCHAR(120) NOT NULL,
  "contract_template_key" VARCHAR(120) NOT NULL,
  "dms_handoff_enabled" BOOLEAN NOT NULL,
  "pms_handoff_enabled" BOOLEAN NOT NULL,
  "accounting_handoff_enabled" BOOLEAN NOT NULL,
  "accounting_provider_mode_code" VARCHAR(40) NOT NULL,
  "stalled_after_minutes" INTEGER NOT NULL,
  "attempt_retention_days" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "crm_config_h_pkey" PRIMARY KEY ("crm_config_id", "history_seq"),
  CONSTRAINT "ck_crm_config_h_event_type" CHECK ("event_type" IN ('C', 'U', 'D'))
);

CREATE INDEX "ix_crm_config_h_event_at" ON "crm"."crm_config_h"("event_at");
CREATE INDEX "ix_crm_config_h_tx" ON "crm"."crm_config_h"("transaction_id");

CREATE TABLE "crm"."crm_operation_attempt_m" (
  "operation_attempt_id" BIGSERIAL NOT NULL,
  "target_type_code" VARCHAR(40) NOT NULL,
  "action_code" VARCHAR(80) NOT NULL,
  "source_entity_type" VARCHAR(80) NOT NULL,
  "source_entity_id" VARCHAR(120) NOT NULL,
  "status_code" VARCHAR(40) NOT NULL DEFAULT 'queued',
  "root_attempt_id" BIGINT,
  "retry_of_attempt_id" BIGINT,
  "attempt_number" INTEGER NOT NULL DEFAULT 1,
  "idempotency_key" VARCHAR(160) NOT NULL,
  "payload_fingerprint" VARCHAR(128) NOT NULL,
  "error_code" VARCHAR(80),
  "error_message" VARCHAR(1000),
  "evidence_jsonb" JSONB,
  "requested_by" BIGINT,
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "crm_operation_attempt_m_pkey" PRIMARY KEY ("operation_attempt_id"),
  CONSTRAINT "ck_crm_operation_attempt_m_status" CHECK ("status_code" IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  CONSTRAINT "ck_crm_operation_attempt_m_number" CHECK ("attempt_number" >= 1),
  CONSTRAINT "ck_crm_operation_attempt_m_finished" CHECK (
    ("status_code" IN ('queued', 'running') AND "finished_at" IS NULL)
    OR ("status_code" IN ('succeeded', 'failed', 'cancelled') AND "finished_at" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "ux_crm_operation_attempt_m_idempotency" ON "crm"."crm_operation_attempt_m"("idempotency_key");
CREATE INDEX "ix_crm_operation_attempt_m_target_status" ON "crm"."crm_operation_attempt_m"("target_type_code", "status_code", "updated_at");
CREATE INDEX "ix_crm_operation_attempt_m_source" ON "crm"."crm_operation_attempt_m"("source_entity_type", "source_entity_id", "created_at");
CREATE INDEX "ix_crm_operation_attempt_m_root" ON "crm"."crm_operation_attempt_m"("root_attempt_id", "attempt_number");
CREATE INDEX "ix_crm_operation_attempt_m_retry" ON "crm"."crm_operation_attempt_m"("retry_of_attempt_id");

CREATE TABLE "crm"."crm_operation_attempt_h" (
  "operation_attempt_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "event_by" BIGINT,
  "target_type_code" VARCHAR(40) NOT NULL,
  "action_code" VARCHAR(80) NOT NULL,
  "source_entity_type" VARCHAR(80) NOT NULL,
  "source_entity_id" VARCHAR(120) NOT NULL,
  "status_code" VARCHAR(40) NOT NULL,
  "root_attempt_id" BIGINT,
  "retry_of_attempt_id" BIGINT,
  "attempt_number" INTEGER NOT NULL,
  "idempotency_key" VARCHAR(160) NOT NULL,
  "payload_fingerprint" VARCHAR(128) NOT NULL,
  "error_code" VARCHAR(80),
  "error_message" VARCHAR(1000),
  "evidence_jsonb" JSONB,
  "requested_by" BIGINT,
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "crm_operation_attempt_h_pkey" PRIMARY KEY ("operation_attempt_id", "history_seq"),
  CONSTRAINT "ck_crm_operation_attempt_h_event_type" CHECK ("event_type" IN ('C', 'U', 'D'))
);

CREATE INDEX "ix_crm_operation_attempt_h_event_at" ON "crm"."crm_operation_attempt_h"("event_at");
CREATE INDEX "ix_crm_operation_attempt_h_tx" ON "crm"."crm_operation_attempt_h"("transaction_id");

COMMENT ON TABLE "crm"."crm_config_m" IS 'CRM 런칭 운영 설정 정본. 비밀정보는 저장하지 않는다.';
COMMENT ON TABLE "crm"."crm_operation_attempt_m" IS 'CRM 외부 경계 실행 attempt/retry/idempotency 운영 원장';
