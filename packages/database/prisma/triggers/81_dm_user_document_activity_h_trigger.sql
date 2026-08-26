-- =========================================================
-- History Trigger: dms.dm_user_document_activity_m -> dms.dm_user_document_activity_h
-- Schema: dms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_dm_user_document_activity_h_trigger()
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
  FROM dms.dm_user_document_activity_h
  WHERE user_document_activity_id = v_record.user_document_activity_id;

  INSERT INTO dms.dm_user_document_activity_h (
    user_document_activity_id, history_seq, event_type, event_at,
    user_id, document_id, first_opened_at, last_opened_at, open_count,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.user_document_activity_id, v_history_seq, v_event_type, NOW(),
    v_record.user_id, v_record.document_id, v_record.first_opened_at, v_record.last_opened_at, v_record.open_count,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dm_user_document_activity_h ON dms.dm_user_document_activity_m;

CREATE TRIGGER trg_dm_user_document_activity_h
AFTER INSERT OR UPDATE OR DELETE ON dms.dm_user_document_activity_m
FOR EACH ROW EXECUTE FUNCTION fn_dm_user_document_activity_h_trigger();

COMMENT ON FUNCTION fn_dm_user_document_activity_h_trigger() IS
  'DMS 사용자별 문서 열람 이력의 CUD 히스토리 트리거 함수';
