-- Database-native contracts that Prisma 6 cannot express in schema.prisma.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_dm_chat_session_m_messages_array'
      AND conrelid = 'dms.dm_chat_session_m'::regclass
  ) THEN
    ALTER TABLE "dms"."dm_chat_session_m"
      ADD CONSTRAINT "ck_dm_chat_session_m_messages_array"
      CHECK (jsonb_typeof("messages") = 'array');
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_report_confirmation_m_active_basis"
  ON "crm"."crm_report_confirmation_m" (
    "target_year",
    "business_type",
    "industry_line",
    "region_code",
    "search_text"
  )
  WHERE "is_active" = true AND "status_code" = 'confirmed';

CREATE UNIQUE INDEX IF NOT EXISTS "ux_pr_project_closeout_approval_step_m_sequence"
  ON "pms"."pr_project_closeout_approval_step_m" (
    "project_id",
    "status_code",
    "target_type_code",
    "target_code",
    "sequence_no"
  )
  WHERE "is_active" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_business_plan_m_confirmed_year"
  ON "crm"."crm_business_plan_m" ("base_year")
  WHERE "confirmed" = true AND "is_active" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_contract_dms_handoff_m_active_contract_template"
  ON "crm"."crm_contract_dms_handoff_m" ("contract_id", "template_key")
  WHERE "is_active" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_quote_dms_handoff_m_active_opportunity_template"
  ON "crm"."crm_quote_dms_handoff_m" ("opportunity_id", "template_key")
  WHERE "is_active" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_cost_plan_accounting_handoff_m_active_basis"
  ON "crm"."crm_cost_plan_accounting_handoff_m" (
    "target_year",
    "business_type_filter",
    "industry_line_filter",
    "region_filter",
    "search_filter"
  )
  WHERE "is_active" = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pr_project_closeout_approval_step_m_target_type'
      AND conrelid = 'pms.pr_project_closeout_approval_step_m'::regclass
  ) THEN
    ALTER TABLE "pms"."pr_project_closeout_approval_step_m"
      ADD CONSTRAINT "ck_pr_project_closeout_approval_step_m_target_type"
      CHECK ("target_type_code" IN ('deliverable', 'close_condition'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pr_project_closeout_approval_step_m_status'
      AND conrelid = 'pms.pr_project_closeout_approval_step_m'::regclass
  ) THEN
    ALTER TABLE "pms"."pr_project_closeout_approval_step_m"
      ADD CONSTRAINT "ck_pr_project_closeout_approval_step_m_status"
      CHECK ("approval_status_code" IN ('pending', 'approved', 'rejected', 'skipped'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pr_project_closeout_approval_step_m_sequence'
      AND conrelid = 'pms.pr_project_closeout_approval_step_m'::regclass
  ) THEN
    ALTER TABLE "pms"."pr_project_closeout_approval_step_m"
      ADD CONSTRAINT "ck_pr_project_closeout_approval_step_m_sequence"
      CHECK ("sequence_no" > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pr_task_effort_log_m_actual_hours'
      AND conrelid = 'pms.pr_task_effort_log_m'::regclass
  ) THEN
    ALTER TABLE "pms"."pr_task_effort_log_m"
      ADD CONSTRAINT "ck_pr_task_effort_log_m_actual_hours"
      CHECK ("actual_hours" > 0 AND "actual_hours" <= 24);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pr_legacy_issue_archive_m_reason'
      AND conrelid = 'pms.pr_legacy_issue_archive_m'::regclass
  ) THEN
    ALTER TABLE "pms"."pr_legacy_issue_archive_m"
      ADD CONSTRAINT "ck_pr_legacy_issue_archive_m_reason"
      CHECK ("archived_reason_code" IN ('hidden_cleanup', 'canonicalized_cleanup', 'manual_cleanup'));
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION "crm"."fn_crm_contract_h_record"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_row "crm"."crm_contract_m"%ROWTYPE;
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
    FROM "crm"."crm_contract_h"
   WHERE contract_id = v_row.contract_id;

  INSERT INTO "crm"."crm_contract_h" (
    contract_id, history_seq, event_type, event_at, event_by,
    contract_code, source_opportunity_id, source_opportunity_code,
    customer_name, contract_name, owner_name, business_type, industry_line,
    region_code, status_code, confirmed, contract_start_date, contract_end_date,
    wbs_code, payment_term_code, revenue_subtotal, special_discount_type_code,
    special_discount_value, special_discount_amount, revenue_total, cost_total,
    external_cost_total, pms_handoff_status_code, dms_link_status_code,
    admin_boundary_code, next_action, is_active, memo, created_by, created_at,
    updated_by, updated_at, last_source, last_activity, transaction_id
  )
  VALUES (
    v_row.contract_id, v_history_seq, v_event_type, NOW(), v_row.updated_by,
    v_row.contract_code, v_row.source_opportunity_id, v_row.source_opportunity_code,
    v_row.customer_name, v_row.contract_name, v_row.owner_name, v_row.business_type, v_row.industry_line,
    v_row.region_code, v_row.status_code, v_row.confirmed, v_row.contract_start_date, v_row.contract_end_date,
    v_row.wbs_code, v_row.payment_term_code, v_row.revenue_subtotal, v_row.special_discount_type_code,
    v_row.special_discount_value, v_row.special_discount_amount, v_row.revenue_total, v_row.cost_total,
    v_row.external_cost_total, v_row.pms_handoff_status_code, v_row.dms_link_status_code,
    v_row.admin_boundary_code, v_row.next_action, v_row.is_active, v_row.memo, v_row.created_by, v_row.created_at,
    v_row.updated_by, v_row.updated_at, v_row.last_source, v_row.last_activity, v_row.transaction_id
  );

  RETURN v_row;
END;
$$;

DROP TRIGGER IF EXISTS "trg_crm_contract_m_h_record" ON "crm"."crm_contract_m";
CREATE TRIGGER "trg_crm_contract_m_h_record"
AFTER INSERT OR UPDATE OR DELETE ON "crm"."crm_contract_m"
FOR EACH ROW EXECUTE FUNCTION "crm"."fn_crm_contract_h_record"();
