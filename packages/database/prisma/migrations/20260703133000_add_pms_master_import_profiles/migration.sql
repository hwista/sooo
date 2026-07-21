-- PMS master import shared mapping profiles.
-- Profiles are PMS execution asset import settings only; CRM owns commercial ledgers.

CREATE SCHEMA IF NOT EXISTS "pms";

CREATE TABLE IF NOT EXISTS "pms"."pr_master_import_profile_m" (
  "profile_id" BIGSERIAL PRIMARY KEY,
  "entity_type" VARCHAR(40) NOT NULL,
  "profile_name" VARCHAR(160) NOT NULL,
  "column_mapping" JSONB NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_pr_master_import_profile_entity_name"
  ON "pms"."pr_master_import_profile_m" ("entity_type", "profile_name");
CREATE INDEX IF NOT EXISTS "ix_pr_master_import_profile_m_entity"
  ON "pms"."pr_master_import_profile_m" ("entity_type");
CREATE INDEX IF NOT EXISTS "ix_pr_master_import_profile_m_default"
  ON "pms"."pr_master_import_profile_m" ("is_default");
CREATE INDEX IF NOT EXISTS "ix_pr_master_import_profile_m_active"
  ON "pms"."pr_master_import_profile_m" ("is_active");

CREATE TABLE IF NOT EXISTS "pms"."pr_master_import_profile_h" (
  "profile_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMP(3) NOT NULL,
  "entity_type" VARCHAR(40) NOT NULL,
  "profile_name" VARCHAR(160) NOT NULL,
  "column_mapping" JSONB NOT NULL,
  "is_default" BOOLEAN NOT NULL,
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_pr_master_import_profile_h" PRIMARY KEY ("profile_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_pr_master_import_profile_h_event_at"
  ON "pms"."pr_master_import_profile_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_pr_master_import_profile_h_tx"
  ON "pms"."pr_master_import_profile_h" ("transaction_id");
