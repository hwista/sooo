-- =========================================================
-- History Trigger: crm.crm_quote_seller_profile_m -> crm.crm_quote_seller_profile_h
-- Schema: crm
-- =========================================================

CREATE OR REPLACE FUNCTION "crm"."fn_crm_quote_seller_profile_h_record"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_row "crm"."crm_quote_seller_profile_m"%ROWTYPE;
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
    FROM "crm"."crm_quote_seller_profile_h"
   WHERE seller_profile_id = v_row.seller_profile_id;

  INSERT INTO "crm"."crm_quote_seller_profile_h" (
    seller_profile_id, history_seq, event_type, event_at, event_by,
    profile_code, company_name, ceo_name, business_registration_no,
    address, tel, fax, website, email, ci_status_code, ci_storage_ref,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  )
  VALUES (
    v_row.seller_profile_id, v_history_seq, v_event_type, NOW(), v_row.updated_by,
    v_row.profile_code, v_row.company_name, v_row.ceo_name, v_row.business_registration_no,
    v_row.address, v_row.tel, v_row.fax, v_row.website, v_row.email, v_row.ci_status_code, v_row.ci_storage_ref,
    v_row.is_active, v_row.memo, v_row.created_by, v_row.created_at, v_row.updated_by, v_row.updated_at,
    v_row.last_source, v_row.last_activity, v_row.transaction_id
  );

  RETURN v_row;
END;
$$;

DROP TRIGGER IF EXISTS "trg_crm_quote_seller_profile_m_h_record" ON "crm"."crm_quote_seller_profile_m";
CREATE TRIGGER "trg_crm_quote_seller_profile_m_h_record"
AFTER INSERT OR UPDATE OR DELETE ON "crm"."crm_quote_seller_profile_m"
FOR EACH ROW EXECUTE FUNCTION "crm"."fn_crm_quote_seller_profile_h_record"();

COMMENT ON FUNCTION "crm"."fn_crm_quote_seller_profile_h_record"() IS 'CRM 견적서 공급자 표시 정보 히스토리 트리거 함수';
