-- PMS closeout approval step ledger for project deliverables and close conditions.
-- Keeps a launch-ready multi-step approval route without moving CRM/DMS ownership boundaries.

CREATE SCHEMA IF NOT EXISTS "pms";

CREATE TABLE IF NOT EXISTS "pms"."pr_project_closeout_approval_step_m" (
  "approval_step_id" BIGSERIAL PRIMARY KEY,
  "project_id" BIGINT NOT NULL,
  "status_code" TEXT NOT NULL,
  "target_type_code" VARCHAR(40) NOT NULL,
  "target_code" TEXT NOT NULL,
  "sequence_no" INTEGER NOT NULL,
  "approver_user_id" BIGINT NOT NULL,
  "approval_status_code" VARCHAR(40) NOT NULL DEFAULT 'pending',
  "requested_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "decided_at" TIMESTAMPTZ,
  "decided_by" BIGINT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_pr_project_closeout_approval_step_m_project"
    FOREIGN KEY ("project_id")
    REFERENCES "pms"."pr_project_m" ("project_id")
    ON DELETE CASCADE,
  CONSTRAINT "ck_pr_project_closeout_approval_step_m_target_type"
    CHECK ("target_type_code" IN ('deliverable', 'close_condition')),
  CONSTRAINT "ck_pr_project_closeout_approval_step_m_status"
    CHECK ("approval_status_code" IN ('pending', 'approved', 'rejected', 'skipped')),
  CONSTRAINT "ck_pr_project_closeout_approval_step_m_sequence"
    CHECK ("sequence_no" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_pr_project_closeout_approval_step_m_sequence"
  ON "pms"."pr_project_closeout_approval_step_m" (
    "project_id",
    "status_code",
    "target_type_code",
    "target_code",
    "sequence_no"
  )
  WHERE "is_active" = true;

CREATE INDEX IF NOT EXISTS "ix_pr_project_closeout_approval_step_m_sequence"
  ON "pms"."pr_project_closeout_approval_step_m" (
    "project_id",
    "status_code",
    "target_type_code",
    "target_code",
    "sequence_no"
  );

CREATE INDEX IF NOT EXISTS "ix_pr_project_closeout_approval_step_m_target"
  ON "pms"."pr_project_closeout_approval_step_m" (
    "project_id",
    "status_code",
    "target_type_code",
    "target_code",
    "is_active"
  );

CREATE INDEX IF NOT EXISTS "ix_pr_project_closeout_approval_step_m_approver"
  ON "pms"."pr_project_closeout_approval_step_m" (
    "approver_user_id",
    "approval_status_code",
    "is_active"
  );

CREATE INDEX IF NOT EXISTS "ix_pr_project_closeout_approval_step_m_updated_at"
  ON "pms"."pr_project_closeout_approval_step_m" ("updated_at");

COMMENT ON TABLE "pms"."pr_project_closeout_approval_step_m"
  IS 'Project closeout approval route steps for deliverables and close conditions.';

COMMENT ON COLUMN "pms"."pr_project_closeout_approval_step_m"."target_type_code"
  IS 'Approval target type: deliverable or close_condition.';

COMMENT ON COLUMN "pms"."pr_project_closeout_approval_step_m"."target_code"
  IS 'Deliverable code or close condition code within the project status.';
