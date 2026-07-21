-- CRM business plan sample ledger.
-- Values are demo verification data derived from the current CRM migration baseline, not operating KPI.

WITH upsert_plan AS (
  INSERT INTO crm.crm_business_plan_m (
    business_plan_code,
    plan_name,
    base_year,
    version_no,
    status_code,
    confirmed,
    confirmed_at,
    region_filter,
    pipeline_amount_total,
    contract_plan_amount_total,
    contract_actual_amount_total,
    plan_candidate_amount_total,
    actual_gap_amount_total,
    row_count,
    memo,
    last_source,
    last_activity
  )
  VALUES (
    'BP-2026-DEMO-001',
    '2026 CRM Demo 사업계획 v1',
    2026,
    1,
    'draft',
    FALSE,
    NULL,
    'all',
    1000000000,
    320000000,
    240000000,
    1320000000,
    -1080000000,
    6,
    'CRM 원천 데모 이식 검증용 사업계획 seed',
    'crm.business-plan.seed',
    'seed'
  )
  ON CONFLICT (business_plan_code) DO UPDATE
     SET plan_name = EXCLUDED.plan_name,
         status_code = EXCLUDED.status_code,
         confirmed = EXCLUDED.confirmed,
         confirmed_at = EXCLUDED.confirmed_at,
         pipeline_amount_total = EXCLUDED.pipeline_amount_total,
         contract_plan_amount_total = EXCLUDED.contract_plan_amount_total,
         contract_actual_amount_total = EXCLUDED.contract_actual_amount_total,
         plan_candidate_amount_total = EXCLUDED.plan_candidate_amount_total,
         actual_gap_amount_total = EXCLUDED.actual_gap_amount_total,
         row_count = EXCLUDED.row_count,
         updated_at = NOW(),
         last_source = EXCLUDED.last_source,
         last_activity = 'seed-update'
  RETURNING business_plan_id
)
INSERT INTO crm.crm_business_plan_line_d (
  business_plan_id,
  line_code,
  target_year,
  business_type,
  industry_line,
  owner_name,
  region_code,
  pipeline_amount,
  contract_plan_amount,
  contract_actual_amount,
  plan_candidate_amount,
  actual_gap_amount,
  sort_order,
  last_source,
  last_activity
)
SELECT
  upsert_plan.business_plan_id,
  seed.line_code,
  seed.target_year,
  seed.business_type,
  seed.industry_line,
  seed.owner_name,
  seed.region_code,
  seed.pipeline_amount,
  seed.contract_plan_amount,
  seed.contract_actual_amount,
  seed.plan_candidate_amount,
  seed.actual_gap_amount,
  seed.sort_order,
  'crm.business-plan.seed',
  'seed'
FROM upsert_plan
CROSS JOIN (
  VALUES
    ('demo-2026-si-power', 2026, 'SI 구축', '전력/제조', '김민준', 'domestic', 700000000, 200000000, 180000000, 900000000, -720000000, 10),
    ('demo-2027-si-power', 2027, 'SI 구축', '전력/제조', '김민준', 'domestic', 300000000, 120000000, 60000000, 420000000, -360000000, 20),
    ('demo-2028-si-power', 2028, 'SI 구축', '전력/제조', '김민준', 'domestic', 0, 0, 0, 0, 0, 30),
    ('demo-2026-cloud-public', 2026, 'Cloud MSP', '공공/서비스', '이서연', 'domestic', 0, 0, 0, 0, 0, 40),
    ('demo-2027-cloud-public', 2027, 'Cloud MSP', '공공/서비스', '이서연', 'domestic', 0, 0, 0, 0, 0, 50),
    ('demo-2028-cloud-public', 2028, 'Cloud MSP', '공공/서비스', '이서연', 'domestic', 0, 0, 0, 0, 0, 60)
) AS seed(
  line_code,
  target_year,
  business_type,
  industry_line,
  owner_name,
  region_code,
  pipeline_amount,
  contract_plan_amount,
  contract_actual_amount,
  plan_candidate_amount,
  actual_gap_amount,
  sort_order
)
ON CONFLICT (business_plan_id, line_code) DO UPDATE
   SET target_year = EXCLUDED.target_year,
       business_type = EXCLUDED.business_type,
       industry_line = EXCLUDED.industry_line,
       owner_name = EXCLUDED.owner_name,
       region_code = EXCLUDED.region_code,
       pipeline_amount = EXCLUDED.pipeline_amount,
       contract_plan_amount = EXCLUDED.contract_plan_amount,
       contract_actual_amount = EXCLUDED.contract_actual_amount,
       plan_candidate_amount = EXCLUDED.plan_candidate_amount,
       actual_gap_amount = EXCLUDED.actual_gap_amount,
       sort_order = EXCLUDED.sort_order,
       updated_at = NOW(),
       last_source = EXCLUDED.last_source,
       last_activity = 'seed-update';
