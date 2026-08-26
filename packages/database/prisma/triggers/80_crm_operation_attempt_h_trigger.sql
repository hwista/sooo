-- CRM operation attempt ledger history

CREATE OR REPLACE FUNCTION "crm"."fn_crm_operation_attempt_h_record"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_row "crm"."crm_operation_attempt_m"%ROWTYPE;
  v_event_type CHAR(1);
  v_history_seq BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := OLD;
    v_event_type := 'D';
  ELSIF TG_OP = 'INSERT' THEN
    v_row := NEW;
    v_event_type := 'C';
  ELSE
    v_row := NEW;
    v_event_type := 'U';
  END IF;

  SELECT COALESCE(MAX(history_seq), 0) + 1
    INTO v_history_seq
    FROM "crm"."crm_operation_attempt_h"
   WHERE operation_attempt_id = v_row.operation_attempt_id;

  INSERT INTO "crm"."crm_operation_attempt_h" (
    operation_attempt_id, history_seq, event_type, event_at, event_by,
    target_type_code, action_code, source_entity_type, source_entity_id,
    status_code, root_attempt_id, retry_of_attempt_id, attempt_number,
    idempotency_key, payload_fingerprint, error_code, error_message, evidence_jsonb,
    requested_by, started_at, finished_at,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_row.operation_attempt_id, v_history_seq, v_event_type, NOW(), v_row.updated_by,
    v_row.target_type_code, v_row.action_code, v_row.source_entity_type, v_row.source_entity_id,
    v_row.status_code, v_row.root_attempt_id, v_row.retry_of_attempt_id, v_row.attempt_number,
    v_row.idempotency_key, v_row.payload_fingerprint, v_row.error_code, v_row.error_message, v_row.evidence_jsonb,
    v_row.requested_by, v_row.started_at, v_row.finished_at,
    v_row.is_active, v_row.memo, v_row.created_by, v_row.created_at, v_row.updated_by, v_row.updated_at,
    v_row.last_source, v_row.last_activity, v_row.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS "trg_crm_operation_attempt_m_h_record" ON "crm"."crm_operation_attempt_m";
CREATE TRIGGER "trg_crm_operation_attempt_m_h_record"
AFTER INSERT OR UPDATE OR DELETE ON "crm"."crm_operation_attempt_m"
FOR EACH ROW EXECUTE FUNCTION "crm"."fn_crm_operation_attempt_h_record"();

COMMENT ON FUNCTION "crm"."fn_crm_operation_attempt_h_record"() IS 'CRM operation attempt ledger history trigger';
