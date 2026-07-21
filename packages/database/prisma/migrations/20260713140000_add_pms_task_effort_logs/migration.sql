-- PMS task daily effort log protected baseline
-- Keeps PMS-owned task labor records inside project execution scope and aggregates them to pr_task_m.actual_hours.

CREATE SCHEMA IF NOT EXISTS "pms";

CREATE TABLE IF NOT EXISTS "pms"."pr_task_effort_log_m" (
  "effort_log_id" BIGSERIAL PRIMARY KEY,
  "project_id" BIGINT NOT NULL,
  "task_id" BIGINT NOT NULL,
  "user_id" BIGINT,
  "work_date" DATE NOT NULL,
  "actual_hours" DECIMAL(8, 1) NOT NULL,
  "work_type_code" VARCHAR(50) NOT NULL DEFAULT 'execution',
  "summary" TEXT,
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

CREATE TABLE IF NOT EXISTS "pms"."pr_task_effort_log_h" (
  "effort_log_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "project_id" BIGINT NOT NULL,
  "task_id" BIGINT NOT NULL,
  "user_id" BIGINT,
  "work_date" DATE NOT NULL,
  "actual_hours" DECIMAL(8, 1) NOT NULL,
  "work_type_code" VARCHAR(50) NOT NULL,
  "summary" TEXT,
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_pr_task_effort_log_h" PRIMARY KEY ("effort_log_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_pr_task_effort_log_m_project_date"
  ON "pms"."pr_task_effort_log_m" ("project_id", "work_date");

CREATE INDEX IF NOT EXISTS "ix_pr_task_effort_log_m_task_date"
  ON "pms"."pr_task_effort_log_m" ("task_id", "work_date");

CREATE INDEX IF NOT EXISTS "ix_pr_task_effort_log_m_user_date"
  ON "pms"."pr_task_effort_log_m" ("user_id", "work_date");

CREATE INDEX IF NOT EXISTS "ix_pr_task_effort_log_m_updated_at"
  ON "pms"."pr_task_effort_log_m" ("updated_at");

CREATE INDEX IF NOT EXISTS "ix_pr_task_effort_log_h_event_at"
  ON "pms"."pr_task_effort_log_h" ("event_at");

CREATE INDEX IF NOT EXISTS "ix_pr_task_effort_log_h_tx"
  ON "pms"."pr_task_effort_log_h" ("transaction_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'ck_pr_task_effort_log_m_actual_hours'
  ) THEN
    ALTER TABLE "pms"."pr_task_effort_log_m"
      ADD CONSTRAINT "ck_pr_task_effort_log_m_actual_hours"
      CHECK ("actual_hours" > 0 AND "actual_hours" <= 24);
  END IF;
END $$;

COMMENT ON TABLE "pms"."pr_task_effort_log_m" IS 'PMS task daily effort log. PMS owns project execution work records, while CRM keeps contract, billing, and revenue ledgers.';
COMMENT ON COLUMN "pms"."pr_task_effort_log_m"."actual_hours" IS 'Actual labor hours for one task work record. Active rows are aggregated back to pms.pr_task_m.actual_hours.';
COMMENT ON COLUMN "pms"."pr_task_effort_log_m"."work_type_code" IS 'Execution work category such as execution, meeting, review, support, rework, or management.';
