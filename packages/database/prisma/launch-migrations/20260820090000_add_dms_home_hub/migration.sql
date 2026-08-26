-- Persistent, user-scoped document activity for the DMS home work hub.

CREATE TABLE IF NOT EXISTS "dms"."dm_user_document_activity_m" (
  "user_document_activity_id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT NOT NULL,
  "document_id" BIGINT NOT NULL,
  "first_opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "open_count" INTEGER NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_dm_user_document_activity_m_user"
    FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m" ("user_id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_dm_user_document_activity_m_document"
    FOREIGN KEY ("document_id") REFERENCES "dms"."dm_document_m" ("document_id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_dm_user_document_activity_m_user_document"
  ON "dms"."dm_user_document_activity_m" ("user_id", "document_id");

CREATE INDEX IF NOT EXISTS "ix_dm_user_document_activity_m_user_last_opened"
  ON "dms"."dm_user_document_activity_m" ("user_id", "last_opened_at" DESC);

CREATE INDEX IF NOT EXISTS "ix_dm_user_document_activity_m_document"
  ON "dms"."dm_user_document_activity_m" ("document_id");

CREATE TABLE IF NOT EXISTS "dms"."dm_user_document_activity_h" (
  "user_document_activity_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMPTZ(6) NOT NULL,
  "user_id" BIGINT NOT NULL,
  "document_id" BIGINT NOT NULL,
  "first_opened_at" TIMESTAMPTZ(6) NOT NULL,
  "last_opened_at" TIMESTAMPTZ(6) NOT NULL,
  "open_count" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_dm_user_document_activity_h"
    PRIMARY KEY ("user_document_activity_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_dm_user_document_activity_h_event_at"
  ON "dms"."dm_user_document_activity_h" ("event_at");

CREATE INDEX IF NOT EXISTS "ix_dm_user_document_activity_h_tx"
  ON "dms"."dm_user_document_activity_h" ("transaction_id");

COMMENT ON TABLE "dms"."dm_user_document_activity_m" IS
  'Per-user successful document-open ledger used by the DMS home work hub.';
COMMENT ON TABLE "dms"."dm_user_document_activity_h" IS
  'Immutable create/update/delete history for DMS user document activity.';
