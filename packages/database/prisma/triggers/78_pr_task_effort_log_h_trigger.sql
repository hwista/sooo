-- =========================================================
-- History Trigger: pms.pr_task_effort_log_m -> pms.pr_task_effort_log_h
-- Schema: pms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_pr_task_effort_log_h_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_history_seq BIGINT;
  v_record RECORD;
  v_event_type CHAR(1);
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'C';
    v_record := NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := 'U';
    v_record := NEW;
  ELSE
    v_event_type := 'D';
    v_record := OLD;
  END IF;

  SELECT COALESCE(MAX(history_seq), 0) + 1
  INTO v_history_seq
  FROM pms.pr_task_effort_log_h
  WHERE effort_log_id = v_record.effort_log_id;

  INSERT INTO pms.pr_task_effort_log_h (
    effort_log_id, history_seq, event_type, event_at,
    project_id, task_id, user_id, work_date, actual_hours, work_type_code, summary,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.effort_log_id, v_history_seq, v_event_type, NOW(),
    v_record.project_id, v_record.task_id, v_record.user_id, v_record.work_date,
    v_record.actual_hours, v_record.work_type_code, v_record.summary,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at,
    v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pr_task_effort_log_h ON pms.pr_task_effort_log_m;

CREATE TRIGGER trg_pr_task_effort_log_h
AFTER INSERT OR UPDATE OR DELETE ON pms.pr_task_effort_log_m
FOR EACH ROW EXECUTE FUNCTION fn_pr_task_effort_log_h_trigger();

COMMENT ON FUNCTION fn_pr_task_effort_log_h_trigger() IS 'PMS task daily effort log history trigger function';
