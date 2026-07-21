-- =========================================================
-- History Trigger: crm.crm_opportunity_line_d -> crm.crm_opportunity_line_h
-- Schema: crm
-- =========================================================

CREATE OR REPLACE FUNCTION fn_crm_opportunity_line_h_trigger()
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
  FROM crm.crm_opportunity_line_h
  WHERE opportunity_line_id = v_record.opportunity_line_id;

  INSERT INTO crm.crm_opportunity_line_h (
    opportunity_line_id, history_seq, event_type, event_at, event_by,
    opportunity_id, line_code, line_kind_code, category_code, line_label,
    quantity, unit_price, amount, margin_rate, trunc_unit,
    department, member_name, grade, service_type_code,
    revenue_linked, linked_cost_line_code, revenue_unit_price,
    sort_order, is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.opportunity_line_id, v_history_seq, v_event_type, NOW(), v_record.updated_by,
    v_record.opportunity_id, v_record.line_code, v_record.line_kind_code, v_record.category_code, v_record.line_label,
    v_record.quantity, v_record.unit_price, v_record.amount, v_record.margin_rate, v_record.trunc_unit,
    v_record.department, v_record.member_name, v_record.grade, v_record.service_type_code,
    v_record.revenue_linked, v_record.linked_cost_line_code, v_record.revenue_unit_price,
    v_record.sort_order, v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_opportunity_line_h ON crm.crm_opportunity_line_d;

CREATE TRIGGER trg_crm_opportunity_line_h
AFTER INSERT OR UPDATE OR DELETE ON crm.crm_opportunity_line_d
FOR EACH ROW EXECUTE FUNCTION fn_crm_opportunity_line_h_trigger();

COMMENT ON FUNCTION fn_crm_opportunity_line_h_trigger() IS 'CRM 영업기회 금액 라인 히스토리 트리거 함수';
