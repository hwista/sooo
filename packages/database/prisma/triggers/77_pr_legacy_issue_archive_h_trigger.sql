-- =========================================================
-- History Trigger: pms.pr_legacy_issue_archive_m -> pms.pr_legacy_issue_archive_h
-- Schema: pms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_pr_legacy_issue_archive_h_trigger()
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
  FROM pms.pr_legacy_issue_archive_h
  WHERE archive_id = v_record.archive_id;

  INSERT INTO pms.pr_legacy_issue_archive_h (
    archive_id, history_seq, event_type, event_at,
    source_issue_id, project_id, issue_code, issue_title, description,
    issue_type_code, status_code, priority_code,
    reported_by_user_id, assignee_user_id, reported_at, due_at, resolved_at, resolution,
    sort_order, source_is_active, archived_reason_code, archived_at,
    source_created_by, source_created_at, source_updated_by, source_updated_at,
    source_last_source, source_last_activity, source_transaction_id,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.archive_id, v_history_seq, v_event_type, NOW(),
    v_record.source_issue_id, v_record.project_id, v_record.issue_code, v_record.issue_title, v_record.description,
    v_record.issue_type_code, v_record.status_code, v_record.priority_code,
    v_record.reported_by_user_id, v_record.assignee_user_id, v_record.reported_at, v_record.due_at, v_record.resolved_at, v_record.resolution,
    v_record.sort_order, v_record.source_is_active, v_record.archived_reason_code, v_record.archived_at,
    v_record.source_created_by, v_record.source_created_at, v_record.source_updated_by, v_record.source_updated_at,
    v_record.source_last_source, v_record.source_last_activity, v_record.source_transaction_id,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pr_legacy_issue_archive_h ON pms.pr_legacy_issue_archive_m;

CREATE TRIGGER trg_pr_legacy_issue_archive_h
AFTER INSERT OR UPDATE OR DELETE ON pms.pr_legacy_issue_archive_m
FOR EACH ROW EXECUTE FUNCTION fn_pr_legacy_issue_archive_h_trigger();

COMMENT ON FUNCTION fn_pr_legacy_issue_archive_h_trigger() IS 'PMS legacy Issue archive history trigger function';
