ALTER TABLE IF EXISTS pms.pr_close_condition_group_item_r_m
  ADD COLUMN IF NOT EXISTS requires_deliverable BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS pms.pr_close_condition_group_item_r_h
  ADD COLUMN IF NOT EXISTS requires_deliverable BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE pms.pr_close_condition_group_item_r_m
   SET requires_deliverable = TRUE
 WHERE condition_code = 'DELIVERABLE_SUBMITTED'
   AND requires_deliverable = FALSE;

UPDATE pms.pr_close_condition_group_item_r_h
   SET requires_deliverable = TRUE
 WHERE condition_code = 'DELIVERABLE_SUBMITTED'
   AND requires_deliverable = FALSE;
