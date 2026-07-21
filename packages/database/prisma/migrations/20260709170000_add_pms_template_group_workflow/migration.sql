-- Add launch-time workflow/version fields for PMS deliverable and close-condition template groups.

ALTER TABLE pms.pr_deliverable_group_m
  ADD COLUMN IF NOT EXISTS approval_status_code VARCHAR(32) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approved_by BIGINT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP(3);

ALTER TABLE pms.pr_deliverable_group_h
  ADD COLUMN IF NOT EXISTS approval_status_code VARCHAR(32) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approved_by BIGINT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP(3);

ALTER TABLE pms.pr_close_condition_group_m
  ADD COLUMN IF NOT EXISTS approval_status_code VARCHAR(32) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approved_by BIGINT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP(3);

ALTER TABLE pms.pr_close_condition_group_h
  ADD COLUMN IF NOT EXISTS approval_status_code VARCHAR(32) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approved_by BIGINT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP(3);

UPDATE pms.pr_deliverable_group_m
SET approval_status_code = 'approved',
    approved_at = COALESCE(approved_at, updated_at)
WHERE group_code IN ('request-default', 'proposal-default', 'execution-default', 'transition-default');
UPDATE pms.pr_close_condition_group_m
SET approval_status_code = 'approved',
    approved_at = COALESCE(approved_at, updated_at)
WHERE group_code IN ('request-default', 'proposal-default', 'execution-default', 'transition-default');
