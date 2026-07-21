-- PMS legacy Issue archive protected baseline
-- Keeps retired pr_issue_m cleanup data reviewable without re-opening legacy write surfaces.

CREATE SCHEMA IF NOT EXISTS "pms";

CREATE TABLE IF NOT EXISTS "pms"."pr_legacy_issue_archive_m" (
  "archive_id" BIGSERIAL PRIMARY KEY,
  "source_issue_id" BIGINT NOT NULL,
  "project_id" BIGINT NOT NULL,
  "issue_code" VARCHAR(50) NOT NULL,
  "issue_title" TEXT NOT NULL,
  "description" TEXT,
  "issue_type_code" TEXT NOT NULL,
  "status_code" TEXT NOT NULL,
  "priority_code" TEXT NOT NULL,
  "reported_by_user_id" BIGINT,
  "assignee_user_id" BIGINT,
  "reported_at" TIMESTAMP(3) NOT NULL,
  "due_at" DATE,
  "resolved_at" TIMESTAMP(3),
  "resolution" TEXT,
  "sort_order" INTEGER NOT NULL,
  "source_is_active" BOOLEAN NOT NULL,
  "archived_reason_code" VARCHAR(50) NOT NULL DEFAULT 'hidden_cleanup',
  "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source_created_by" BIGINT,
  "source_created_at" TIMESTAMP(3) NOT NULL,
  "source_updated_by" BIGINT,
  "source_updated_at" TIMESTAMP(3) NOT NULL,
  "source_last_source" TEXT,
  "source_last_activity" TEXT,
  "source_transaction_id" UUID,
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

CREATE TABLE IF NOT EXISTS "pms"."pr_legacy_issue_archive_h" (
  "archive_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source_issue_id" BIGINT NOT NULL,
  "project_id" BIGINT NOT NULL,
  "issue_code" VARCHAR(50) NOT NULL,
  "issue_title" TEXT NOT NULL,
  "description" TEXT,
  "issue_type_code" TEXT NOT NULL,
  "status_code" TEXT NOT NULL,
  "priority_code" TEXT NOT NULL,
  "reported_by_user_id" BIGINT,
  "assignee_user_id" BIGINT,
  "reported_at" TIMESTAMP(3) NOT NULL,
  "due_at" DATE,
  "resolved_at" TIMESTAMP(3),
  "resolution" TEXT,
  "sort_order" INTEGER NOT NULL,
  "source_is_active" BOOLEAN NOT NULL,
  "archived_reason_code" VARCHAR(50) NOT NULL,
  "archived_at" TIMESTAMP(3) NOT NULL,
  "source_created_by" BIGINT,
  "source_created_at" TIMESTAMP(3) NOT NULL,
  "source_updated_by" BIGINT,
  "source_updated_at" TIMESTAMP(3) NOT NULL,
  "source_last_source" TEXT,
  "source_last_activity" TEXT,
  "source_transaction_id" UUID,
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_pr_legacy_issue_archive_h" PRIMARY KEY ("archive_id", "history_seq")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_pr_legacy_issue_archive_m_source_issue"
  ON "pms"."pr_legacy_issue_archive_m" ("source_issue_id");

CREATE INDEX IF NOT EXISTS "ix_pr_legacy_issue_archive_m_project_archived"
  ON "pms"."pr_legacy_issue_archive_m" ("project_id", "archived_at");

CREATE INDEX IF NOT EXISTS "ix_pr_legacy_issue_archive_m_reason"
  ON "pms"."pr_legacy_issue_archive_m" ("archived_reason_code");

CREATE INDEX IF NOT EXISTS "ix_pr_legacy_issue_archive_h_event_at"
  ON "pms"."pr_legacy_issue_archive_h" ("event_at");

CREATE INDEX IF NOT EXISTS "ix_pr_legacy_issue_archive_h_tx"
  ON "pms"."pr_legacy_issue_archive_h" ("transaction_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'ck_pr_legacy_issue_archive_m_reason'
  ) THEN
    ALTER TABLE "pms"."pr_legacy_issue_archive_m"
      ADD CONSTRAINT "ck_pr_legacy_issue_archive_m_reason"
      CHECK ("archived_reason_code" IN ('hidden_cleanup', 'canonicalized_cleanup', 'manual_cleanup'));
  END IF;
END $$;

COMMENT ON TABLE "pms"."pr_legacy_issue_archive_m" IS 'PMS legacy Issue cleanup archive. Launch keeps pr_issue_m read/update only for active cleanup rows and snapshots hidden rows here.';
COMMENT ON COLUMN "pms"."pr_legacy_issue_archive_m"."source_issue_id" IS 'Original pms.pr_issue_m.issue_id.';
COMMENT ON COLUMN "pms"."pr_legacy_issue_archive_m"."archived_reason_code" IS 'Why the retired legacy Issue row was archived.';
