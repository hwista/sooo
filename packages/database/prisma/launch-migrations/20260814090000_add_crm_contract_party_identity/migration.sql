-- Add source-parity customer contact and platform owner identity to CRM contracts.
-- Both fields are nullable so the previous application version remains rollback-compatible.

ALTER TABLE "crm"."crm_contract_m"
  ADD COLUMN IF NOT EXISTS "client_contact" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "owner_user_id" BIGINT;

ALTER TABLE "crm"."crm_contract_h"
  ADD COLUMN IF NOT EXISTS "client_contact" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "owner_user_id" BIGINT;

WITH source_party AS (
  SELECT
    o."opportunity_id",
    NULLIF(BTRIM(o."quote_client_contact_name"), '') AS "client_contact",
    u."user_id" AS "owner_user_id"
  FROM "crm"."crm_opportunity_m" o
  LEFT JOIN "common"."cm_user_m" u
    ON u."user_id" = o."owner_user_id"
)
UPDATE "crm"."crm_contract_m" c
SET
  "client_contact" = COALESCE(c."client_contact", s."client_contact"),
  "owner_user_id" = COALESCE(c."owner_user_id", s."owner_user_id")
FROM source_party s
WHERE c."source_opportunity_id" = s."opportunity_id"
  AND (
    (c."client_contact" IS NULL AND s."client_contact" IS NOT NULL)
    OR (c."owner_user_id" IS NULL AND s."owner_user_id" IS NOT NULL)
  );

WITH source_party AS (
  SELECT
    o."opportunity_id",
    NULLIF(BTRIM(o."quote_client_contact_name"), '') AS "client_contact",
    u."user_id" AS "owner_user_id"
  FROM "crm"."crm_opportunity_m" o
  LEFT JOIN "common"."cm_user_m" u
    ON u."user_id" = o."owner_user_id"
)
UPDATE "crm"."crm_contract_h" h
SET
  "client_contact" = COALESCE(h."client_contact", s."client_contact"),
  "owner_user_id" = COALESCE(h."owner_user_id", s."owner_user_id")
FROM source_party s
WHERE h."source_opportunity_id" = s."opportunity_id"
  AND (
    (h."client_contact" IS NULL AND s."client_contact" IS NOT NULL)
    OR (h."owner_user_id" IS NULL AND s."owner_user_id" IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS "ix_crm_contract_m_owner_user"
  ON "crm"."crm_contract_m" ("owner_user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_contract_m_owner_user'
      AND conrelid = 'crm.crm_contract_m'::regclass
  ) THEN
    ALTER TABLE "crm"."crm_contract_m"
      ADD CONSTRAINT "fk_crm_contract_m_owner_user"
      FOREIGN KEY ("owner_user_id")
      REFERENCES "common"."cm_user_m" ("user_id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

COMMENT ON COLUMN "crm"."crm_contract_m"."client_contact" IS
  'Customer-side contract contact snapshot from the source CRM contract function.';
COMMENT ON COLUMN "crm"."crm_contract_m"."owner_user_id" IS
  'Optional platform common.cm_user_m owner identity; owner_name remains the display snapshot.';
COMMENT ON COLUMN "crm"."crm_contract_h"."client_contact" IS
  'Historical copy of CRM contract client_contact.';
COMMENT ON COLUMN "crm"."crm_contract_h"."owner_user_id" IS
  'Historical copy of CRM contract owner_user_id.';

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
    customer_name, contract_name, owner_name, client_contact, owner_user_id,
    business_type, industry_line, region_code, status_code, confirmed,
    contract_start_date, contract_end_date, wbs_code, payment_term_code,
    revenue_subtotal, special_discount_type_code, special_discount_value,
    special_discount_amount, revenue_total, cost_total, external_cost_total,
    pms_handoff_status_code, dms_link_status_code, admin_boundary_code,
    next_action, is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  )
  VALUES (
    v_row.contract_id, v_history_seq, v_event_type, NOW(), v_row.updated_by,
    v_row.contract_code, v_row.source_opportunity_id, v_row.source_opportunity_code,
    v_row.customer_name, v_row.contract_name, v_row.owner_name,
    v_row.client_contact, v_row.owner_user_id, v_row.business_type, v_row.industry_line,
    v_row.region_code, v_row.status_code, v_row.confirmed,
    v_row.contract_start_date, v_row.contract_end_date, v_row.wbs_code,
    v_row.payment_term_code, v_row.revenue_subtotal,
    v_row.special_discount_type_code, v_row.special_discount_value,
    v_row.special_discount_amount, v_row.revenue_total, v_row.cost_total,
    v_row.external_cost_total, v_row.pms_handoff_status_code,
    v_row.dms_link_status_code, v_row.admin_boundary_code, v_row.next_action,
    v_row.is_active, v_row.memo, v_row.created_by, v_row.created_at,
    v_row.updated_by, v_row.updated_at, v_row.last_source, v_row.last_activity,
    v_row.transaction_id
  );

  RETURN v_row;
END;
$$;
