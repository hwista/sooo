-- =========================================================
-- History Trigger: crm.crm_customer_activity_d -> crm.crm_customer_activity_h
-- Schema: crm
-- =========================================================

CREATE OR REPLACE FUNCTION fn_crm_customer_activity_h_trigger()
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
  FROM crm.crm_customer_activity_h
  WHERE activity_id = v_record.activity_id;

  INSERT INTO crm.crm_customer_activity_h (
    activity_id, history_seq, event_type, event_at, event_by,
    activity_code, customer_id, source_opportunity_id, source_opportunity_code,
    activity_type_code, activity_status_code, subject, occurred_at, due_at,
    owner_name, owner_user_id, summary, next_action,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.activity_id, v_history_seq, v_event_type, NOW(), v_record.updated_by,
    v_record.activity_code, v_record.customer_id, v_record.source_opportunity_id, v_record.source_opportunity_code,
    v_record.activity_type_code, v_record.activity_status_code, v_record.subject, v_record.occurred_at, v_record.due_at,
    v_record.owner_name, v_record.owner_user_id, v_record.summary, v_record.next_action,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_customer_activity_h ON crm.crm_customer_activity_d;

CREATE TRIGGER trg_crm_customer_activity_h
AFTER INSERT OR UPDATE OR DELETE ON crm.crm_customer_activity_d
FOR EACH ROW EXECUTE FUNCTION fn_crm_customer_activity_h_trigger();

COMMENT ON FUNCTION fn_crm_customer_activity_h_trigger() IS 'CRM 고객 활동 원장 히스토리 트리거 함수';
