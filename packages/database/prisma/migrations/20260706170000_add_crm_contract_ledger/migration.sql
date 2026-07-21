-- CRM contract ledger baseline.
-- Contracts are CRM-owned financial/billing context; PMS consumes read-only handoff snapshots later.

CREATE SCHEMA IF NOT EXISTS "crm";

CREATE TABLE IF NOT EXISTS "crm"."crm_contract_m" (
  "contract_id" BIGSERIAL PRIMARY KEY,
  "contract_code" VARCHAR(80) NOT NULL,
  "source_opportunity_id" BIGINT,
  "source_opportunity_code" VARCHAR(80),
  "customer_name" VARCHAR(200) NOT NULL,
  "contract_name" VARCHAR(300) NOT NULL,
  "owner_name" VARCHAR(100) NOT NULL,
  "business_type" VARCHAR(120) NOT NULL,
  "industry_line" VARCHAR(120) NOT NULL,
  "region_code" VARCHAR(30) NOT NULL DEFAULT 'domestic',
  "status_code" VARCHAR(40) NOT NULL DEFAULT 'review',
  "confirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  "contract_start_date" DATE NOT NULL,
  "contract_end_date" DATE NOT NULL,
  "wbs_code" VARCHAR(80),
  "payment_term_code" VARCHAR(80),
  "revenue_subtotal" BIGINT NOT NULL DEFAULT 0,
  "special_discount_type_code" VARCHAR(30) NOT NULL DEFAULT 'amount',
  "special_discount_value" DECIMAL(12,2),
  "special_discount_amount" BIGINT NOT NULL DEFAULT 0,
  "revenue_total" BIGINT NOT NULL DEFAULT 0,
  "cost_total" BIGINT NOT NULL DEFAULT 0,
  "external_cost_total" BIGINT NOT NULL DEFAULT 0,
  "pms_handoff_status_code" VARCHAR(40) NOT NULL DEFAULT 'planned',
  "dms_link_status_code" VARCHAR(40) NOT NULL DEFAULT 'planned',
  "admin_boundary_code" VARCHAR(40) NOT NULL DEFAULT 'shared-admin',
  "next_action" VARCHAR(1000) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_crm_contract_m_source_opportunity"
    FOREIGN KEY ("source_opportunity_id")
    REFERENCES "crm"."crm_opportunity_m" ("opportunity_id")
    ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_contract_m_code"
  ON "crm"."crm_contract_m" ("contract_code");
CREATE INDEX IF NOT EXISTS "ix_crm_contract_m_status_active"
  ON "crm"."crm_contract_m" ("status_code", "is_active");
CREATE INDEX IF NOT EXISTS "ix_crm_contract_m_customer"
  ON "crm"."crm_contract_m" ("customer_name");
CREATE INDEX IF NOT EXISTS "ix_crm_contract_m_updated"
  ON "crm"."crm_contract_m" ("updated_at");
CREATE INDEX IF NOT EXISTS "ix_crm_contract_m_source_opportunity"
  ON "crm"."crm_contract_m" ("source_opportunity_id");

CREATE TABLE IF NOT EXISTS "crm"."crm_contract_h" (
  "contract_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "event_by" BIGINT,
  "contract_code" VARCHAR(80) NOT NULL,
  "source_opportunity_id" BIGINT,
  "source_opportunity_code" VARCHAR(80),
  "customer_name" VARCHAR(200) NOT NULL,
  "contract_name" VARCHAR(300) NOT NULL,
  "owner_name" VARCHAR(100) NOT NULL,
  "business_type" VARCHAR(120) NOT NULL,
  "industry_line" VARCHAR(120) NOT NULL,
  "region_code" VARCHAR(30) NOT NULL,
  "status_code" VARCHAR(40) NOT NULL,
  "confirmed" BOOLEAN NOT NULL,
  "contract_start_date" DATE NOT NULL,
  "contract_end_date" DATE NOT NULL,
  "wbs_code" VARCHAR(80),
  "payment_term_code" VARCHAR(80),
  "revenue_subtotal" BIGINT NOT NULL,
  "special_discount_type_code" VARCHAR(30) NOT NULL,
  "special_discount_value" DECIMAL(12,2),
  "special_discount_amount" BIGINT NOT NULL,
  "revenue_total" BIGINT NOT NULL,
  "cost_total" BIGINT NOT NULL,
  "external_cost_total" BIGINT NOT NULL,
  "pms_handoff_status_code" VARCHAR(40) NOT NULL,
  "dms_link_status_code" VARCHAR(40) NOT NULL,
  "admin_boundary_code" VARCHAR(40) NOT NULL,
  "next_action" VARCHAR(1000) NOT NULL,
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_crm_contract_h" PRIMARY KEY ("contract_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_crm_contract_h_event_at"
  ON "crm"."crm_contract_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_crm_contract_h_tx"
  ON "crm"."crm_contract_h" ("transaction_id");

CREATE TABLE IF NOT EXISTS "crm"."crm_contract_line_d" (
  "contract_line_id" BIGSERIAL PRIMARY KEY,
  "contract_id" BIGINT NOT NULL,
  "line_code" VARCHAR(80) NOT NULL,
  "line_kind_code" VARCHAR(30) NOT NULL,
  "category_code" VARCHAR(60) NOT NULL,
  "line_label" VARCHAR(300) NOT NULL,
  "quantity" DECIMAL(12,2),
  "unit_price" BIGINT,
  "amount" BIGINT NOT NULL DEFAULT 0,
  "margin_rate" DECIMAL(7,2),
  "trunc_unit" BIGINT,
  "department" VARCHAR(120),
  "member_name" VARCHAR(120),
  "grade" VARCHAR(80),
  "service_type_code" VARCHAR(30),
  "revenue_linked" BOOLEAN NOT NULL DEFAULT FALSE,
  "linked_cost_line_code" VARCHAR(80),
  "revenue_unit_price" BIGINT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_crm_contract_line_d_contract"
    FOREIGN KEY ("contract_id")
    REFERENCES "crm"."crm_contract_m" ("contract_id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_contract_line_d_contract_code"
  ON "crm"."crm_contract_line_d" ("contract_id", "line_code");
CREATE INDEX IF NOT EXISTS "ix_crm_contract_line_d_kind"
  ON "crm"."crm_contract_line_d" ("contract_id", "line_kind_code");

CREATE TABLE IF NOT EXISTS "crm"."crm_contract_billing_plan_d" (
  "contract_billing_plan_id" BIGSERIAL PRIMARY KEY,
  "contract_id" BIGINT NOT NULL,
  "billing_ym" VARCHAR(7) NOT NULL,
  "revenue_amount" BIGINT NOT NULL DEFAULT 0,
  "external_cost_amount" BIGINT NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_crm_contract_billing_plan_d_contract"
    FOREIGN KEY ("contract_id")
    REFERENCES "crm"."crm_contract_m" ("contract_id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_contract_billing_plan_d_contract_ym"
  ON "crm"."crm_contract_billing_plan_d" ("contract_id", "billing_ym");
CREATE INDEX IF NOT EXISTS "ix_crm_contract_billing_plan_d_ym"
  ON "crm"."crm_contract_billing_plan_d" ("billing_ym");

CREATE TABLE IF NOT EXISTS "crm"."crm_contract_billing_actual_d" (
  "contract_billing_actual_id" BIGSERIAL PRIMARY KEY,
  "contract_id" BIGINT NOT NULL,
  "billing_ym" VARCHAR(7) NOT NULL,
  "revenue_amount" BIGINT NOT NULL DEFAULT 0,
  "external_cost_amount" BIGINT NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_crm_contract_billing_actual_d_contract"
    FOREIGN KEY ("contract_id")
    REFERENCES "crm"."crm_contract_m" ("contract_id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_crm_contract_billing_actual_d_contract_ym"
  ON "crm"."crm_contract_billing_actual_d" ("contract_id", "billing_ym");
CREATE INDEX IF NOT EXISTS "ix_crm_contract_billing_actual_d_ym"
  ON "crm"."crm_contract_billing_actual_d" ("billing_ym");

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

WITH source_opportunity AS (
  SELECT opportunity_id, opportunity_code
    FROM "crm"."crm_opportunity_m"
   WHERE opportunity_code IN ('crm-opp-003', 'crm-opp-001')
)
INSERT INTO "crm"."crm_contract_m" (
  contract_code, source_opportunity_id, source_opportunity_code,
  customer_name, contract_name, owner_name, business_type, industry_line,
  region_code, status_code, confirmed, contract_start_date, contract_end_date,
  wbs_code, payment_term_code, revenue_subtotal, special_discount_type_code,
  special_discount_value, special_discount_amount, revenue_total, cost_total,
  external_cost_total, pms_handoff_status_code, dms_link_status_code,
  admin_boundary_code, next_action, is_active, created_at, updated_at,
  last_source, last_activity
)
SELECT *
FROM (
  VALUES
    ('crm-ct-001', (SELECT opportunity_id FROM source_opportunity WHERE opportunity_code = 'crm-opp-003'), 'crm-opp-003',
     'LS MnM', '설비 예방정비 모바일 업무화 본계약', '이현우', '업무 시스템', '설비/정비',
     'domestic', 'active', true, DATE '2026-07-15', DATE '2026-11-30',
     'WBS-CRM-2026-001', '계약즉시', 520000000::bigint, 'amount', NULL::numeric, 0::bigint,
     520000000::bigint, 361000000::bigint, 63000000::bigint, 'planned', 'planned',
     'shared-admin', '청구계획 확인 후 PMS 실행 인계 후보 생성', true,
     TIMESTAMPTZ '2026-07-06T00:00:00Z', TIMESTAMPTZ '2026-07-06T00:00:00Z',
     'MIGRATION-SEED', 'crm.contract.seed'),
    ('crm-ct-002', (SELECT opportunity_id FROM source_opportunity WHERE opportunity_code = 'crm-opp-001'), 'crm-opp-001',
     'LS Electric', '스마트 배전반 통합 관제 고도화 계약 후보', '김민준', 'SI 구축', '전력/제조',
     'domestic', 'review', false, DATE '2026-08-01', DATE '2027-01-31',
     'WBS-CRM-2026-002', 'NET30', 840000000::bigint, 'amount', 20000000::numeric, 20000000::bigint,
     820000000::bigint, 592000000::bigint, 244000000::bigint, 'planned', 'planned',
     'shared-admin', '계약 확정 전 고객사 조건과 청구계획 자동분할 검토', true,
     TIMESTAMPTZ '2026-07-06T00:00:00Z', TIMESTAMPTZ '2026-07-06T00:00:00Z',
     'MIGRATION-SEED', 'crm.contract.seed')
) AS v(
  contract_code, source_opportunity_id, source_opportunity_code,
  customer_name, contract_name, owner_name, business_type, industry_line,
  region_code, status_code, confirmed, contract_start_date, contract_end_date,
  wbs_code, payment_term_code, revenue_subtotal, special_discount_type_code,
  special_discount_value, special_discount_amount, revenue_total, cost_total,
  external_cost_total, pms_handoff_status_code, dms_link_status_code,
  admin_boundary_code, next_action, is_active, created_at, updated_at,
  last_source, last_activity
)
ON CONFLICT (contract_code) DO UPDATE SET
  source_opportunity_id = EXCLUDED.source_opportunity_id,
  source_opportunity_code = EXCLUDED.source_opportunity_code,
  customer_name = EXCLUDED.customer_name,
  contract_name = EXCLUDED.contract_name,
  owner_name = EXCLUDED.owner_name,
  business_type = EXCLUDED.business_type,
  industry_line = EXCLUDED.industry_line,
  region_code = EXCLUDED.region_code,
  status_code = EXCLUDED.status_code,
  confirmed = EXCLUDED.confirmed,
  contract_start_date = EXCLUDED.contract_start_date,
  contract_end_date = EXCLUDED.contract_end_date,
  wbs_code = EXCLUDED.wbs_code,
  payment_term_code = EXCLUDED.payment_term_code,
  revenue_subtotal = EXCLUDED.revenue_subtotal,
  special_discount_type_code = EXCLUDED.special_discount_type_code,
  special_discount_value = EXCLUDED.special_discount_value,
  special_discount_amount = EXCLUDED.special_discount_amount,
  revenue_total = EXCLUDED.revenue_total,
  cost_total = EXCLUDED.cost_total,
  external_cost_total = EXCLUDED.external_cost_total,
  next_action = EXCLUDED.next_action,
  updated_at = EXCLUDED.updated_at,
  last_source = EXCLUDED.last_source,
  last_activity = EXCLUDED.last_activity;

INSERT INTO "crm"."crm_contract_line_d" (
  contract_id, line_code, line_kind_code, category_code, line_label,
  quantity, unit_price, amount, margin_rate, trunc_unit,
  department, member_name, grade, service_type_code,
  revenue_linked, linked_cost_line_code, revenue_unit_price,
  sort_order, is_active, last_source, last_activity
)
SELECT c.contract_id, v.line_code, v.line_kind_code, v.category_code, v.line_label,
       v.quantity, v.unit_price, v.amount, v.margin_rate, v.trunc_unit,
       v.department, v.member_name, v.grade, v.service_type_code,
       v.revenue_linked, v.linked_cost_line_code, v.revenue_unit_price,
       v.sort_order, true, 'MIGRATION-SEED', 'crm.contract.seed'
FROM "crm"."crm_contract_m" c
JOIN (
  VALUES
    ('crm-ct-001', 'ct-rev-001-1', 'revenue', 'service', '모바일 업무 구축', 4.00::numeric, 130000000::bigint, 520000000::bigint, NULL::numeric, 0::bigint, '모바일센터', '앱 구축팀', 'Senior', 'internal', false, NULL, NULL::bigint, 10),
    ('crm-ct-001', 'ct-cost-001-1', 'cost', 'internal-cost', '수행 인력 원가', 4.00::numeric, 74500000::bigint, 298000000::bigint, NULL::numeric, 0::bigint, '모바일센터', '수행 인력', 'Senior', 'internal', false, NULL, NULL::bigint, 20),
    ('crm-ct-001', 'ct-cost-001-2', 'cost', 'external-cost', '모바일 단말 검증', 1.00::numeric, 63000000::bigint, 63000000::bigint, NULL::numeric, 0::bigint, 'QA 파트너', '단말 검증', 'Partner', 'external', false, NULL, NULL::bigint, 30),
    ('crm-ct-002', 'ct-rev-002-1', 'revenue', 'product', '관제 플랫폼 라이선스', 3.00::numeric, 130000000::bigint, 390000000::bigint, NULL::numeric, 0::bigint, NULL, NULL, NULL, NULL, false, NULL, NULL::bigint, 10),
    ('crm-ct-002', 'ct-rev-002-2', 'revenue', 'service', '구축/연동 서비스', 6.00::numeric, 75000000::bigint, 450000000::bigint, 22.67::numeric, 0::bigint, 'DX센터', '구축팀', 'Senior', 'internal', true, 'ct-cost-002-1', NULL::bigint, 20),
    ('crm-ct-002', 'ct-cost-002-1', 'cost', 'internal-cost', '내부 수행 원가', 6.00::numeric, 58000000::bigint, 348000000::bigint, NULL::numeric, 0::bigint, 'DX센터', '수행팀', 'Senior', 'internal', true, NULL, 75000000::bigint, 30),
    ('crm-ct-002', 'ct-cost-002-2', 'cost', 'external-cost', '외부 연동/장비 원가', 2.00::numeric, 122000000::bigint, 244000000::bigint, NULL::numeric, 0::bigint, '파트너', '연동 장비', 'Partner', 'external', false, NULL, NULL::bigint, 40)
) AS v(contract_code, line_code, line_kind_code, category_code, line_label,
  quantity, unit_price, amount, margin_rate, trunc_unit,
  department, member_name, grade, service_type_code,
  revenue_linked, linked_cost_line_code, revenue_unit_price, sort_order)
  ON c.contract_code = v.contract_code
ON CONFLICT (contract_id, line_code) DO UPDATE SET
  line_kind_code = EXCLUDED.line_kind_code,
  category_code = EXCLUDED.category_code,
  line_label = EXCLUDED.line_label,
  quantity = EXCLUDED.quantity,
  unit_price = EXCLUDED.unit_price,
  amount = EXCLUDED.amount,
  margin_rate = EXCLUDED.margin_rate,
  trunc_unit = EXCLUDED.trunc_unit,
  department = EXCLUDED.department,
  member_name = EXCLUDED.member_name,
  grade = EXCLUDED.grade,
  service_type_code = EXCLUDED.service_type_code,
  revenue_linked = EXCLUDED.revenue_linked,
  linked_cost_line_code = EXCLUDED.linked_cost_line_code,
  revenue_unit_price = EXCLUDED.revenue_unit_price,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW(),
  last_source = EXCLUDED.last_source,
  last_activity = EXCLUDED.last_activity;

INSERT INTO "crm"."crm_contract_billing_plan_d" (
  contract_id, billing_ym, revenue_amount, external_cost_amount,
  sort_order, is_active, last_source, last_activity
)
SELECT c.contract_id, v.billing_ym, v.revenue_amount, v.external_cost_amount,
       v.sort_order, true, 'MIGRATION-SEED', 'crm.contract.seed'
FROM "crm"."crm_contract_m" c
JOIN (
  VALUES
    ('crm-ct-001', '2026/07', 130000000::bigint, 15750000::bigint, 10),
    ('crm-ct-001', '2026/08', 130000000::bigint, 15750000::bigint, 20),
    ('crm-ct-001', '2026/09', 130000000::bigint, 15750000::bigint, 30),
    ('crm-ct-001', '2026/10', 130000000::bigint, 15750000::bigint, 40),
    ('crm-ct-002', '2026/08', 136000000::bigint, 40666666::bigint, 10),
    ('crm-ct-002', '2026/09', 136000000::bigint, 40666666::bigint, 20),
    ('crm-ct-002', '2026/10', 136000000::bigint, 40666666::bigint, 30),
    ('crm-ct-002', '2026/11', 136000000::bigint, 40666666::bigint, 40),
    ('crm-ct-002', '2026/12', 136000000::bigint, 40666666::bigint, 50),
    ('crm-ct-002', '2027/01', 140000000::bigint, 40666670::bigint, 60)
) AS v(contract_code, billing_ym, revenue_amount, external_cost_amount, sort_order)
  ON c.contract_code = v.contract_code
ON CONFLICT (contract_id, billing_ym) DO UPDATE SET
  revenue_amount = EXCLUDED.revenue_amount,
  external_cost_amount = EXCLUDED.external_cost_amount,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW(),
  last_source = EXCLUDED.last_source,
  last_activity = EXCLUDED.last_activity;

INSERT INTO "crm"."crm_contract_billing_actual_d" (
  contract_id, billing_ym, revenue_amount, external_cost_amount,
  sort_order, is_active, last_source, last_activity
)
SELECT c.contract_id, v.billing_ym, v.revenue_amount, v.external_cost_amount,
       v.sort_order, true, 'MIGRATION-SEED', 'crm.contract.billing-actual.seed'
FROM "crm"."crm_contract_m" c
JOIN (
  VALUES
    ('crm-ct-001', '2026/07', 130000000::bigint, 15750000::bigint, 10),
    ('crm-ct-001', '2026/08', 120000000::bigint, 15750000::bigint, 20)
) AS v(contract_code, billing_ym, revenue_amount, external_cost_amount, sort_order)
  ON c.contract_code = v.contract_code
ON CONFLICT (contract_id, billing_ym) DO UPDATE SET
  revenue_amount = EXCLUDED.revenue_amount,
  external_cost_amount = EXCLUDED.external_cost_amount,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW(),
  last_source = EXCLUDED.last_source,
  last_activity = EXCLUDED.last_activity;
