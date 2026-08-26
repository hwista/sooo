-- CRM launch operations config history

CREATE OR REPLACE FUNCTION "crm"."fn_crm_config_h_record"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_row "crm"."crm_config_m"%ROWTYPE;
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
    FROM "crm"."crm_config_h"
   WHERE crm_config_id = v_row.crm_config_id;

  INSERT INTO "crm"."crm_config_h" (
    crm_config_id, history_seq, event_type, event_at, event_by,
    config_code, revision, quote_template_key, contract_template_key,
    dms_handoff_enabled, pms_handoff_enabled, accounting_handoff_enabled,
    accounting_provider_mode_code, stalled_after_minutes, attempt_retention_days,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_row.crm_config_id, v_history_seq, v_event_type, NOW(), v_row.updated_by,
    v_row.config_code, v_row.revision, v_row.quote_template_key, v_row.contract_template_key,
    v_row.dms_handoff_enabled, v_row.pms_handoff_enabled, v_row.accounting_handoff_enabled,
    v_row.accounting_provider_mode_code, v_row.stalled_after_minutes, v_row.attempt_retention_days,
    v_row.is_active, v_row.memo, v_row.created_by, v_row.created_at, v_row.updated_by, v_row.updated_at,
    v_row.last_source, v_row.last_activity, v_row.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS "trg_crm_config_m_h_record" ON "crm"."crm_config_m";
CREATE TRIGGER "trg_crm_config_m_h_record"
AFTER INSERT OR UPDATE OR DELETE ON "crm"."crm_config_m"
FOR EACH ROW EXECUTE FUNCTION "crm"."fn_crm_config_h_record"();

COMMENT ON FUNCTION "crm"."fn_crm_config_h_record"() IS 'CRM 런칭 운영 설정 history trigger';
