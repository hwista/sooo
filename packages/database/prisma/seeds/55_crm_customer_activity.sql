-- CRM customer/activity ledger seed from opportunity samples.
-- This keeps customer/activity projection sources available on fresh database initialization.

WITH latest_opportunity AS (
  SELECT DISTINCT ON (LOWER(TRIM(customer_name)))
    opportunity_id,
    opportunity_code,
    customer_name,
    owner_name,
    owner_user_id,
    industry_line,
    region_code,
    confirmed,
    contract_created,
    admin_boundary_code,
    next_action,
    updated_by,
    updated_at
  FROM crm.crm_opportunity_m
  WHERE is_active = TRUE
    AND TRIM(customer_name) <> ''
  ORDER BY LOWER(TRIM(customer_name)), updated_at DESC, opportunity_id DESC
)
INSERT INTO crm.crm_customer_m (
  customer_code,
  customer_name,
  customer_type_code,
  industry_line,
  region_code,
  owner_name,
  owner_user_id,
  source_opportunity_id,
  latest_opportunity_code,
  latest_activity_at,
  last_interaction_summary,
  next_action,
  admin_boundary_code,
  updated_by,
  updated_at,
  last_source,
  last_activity
)
SELECT
  'crm-cust-' || SUBSTRING(MD5(LOWER(TRIM(customer_name))) FROM 1 FOR 12),
  customer_name,
  CASE WHEN confirmed = TRUE OR contract_created = TRUE THEN 'active' ELSE 'prospect' END,
  industry_line,
  region_code,
  owner_name,
  owner_user_id,
  opportunity_id,
  opportunity_code,
  updated_at,
  next_action,
  next_action,
  admin_boundary_code,
  updated_by,
  updated_at,
  'crm.customer.seed',
  'opportunity-seed-backfill'
FROM latest_opportunity
ON CONFLICT (customer_code) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  customer_type_code = EXCLUDED.customer_type_code,
  industry_line = EXCLUDED.industry_line,
  region_code = EXCLUDED.region_code,
  owner_name = EXCLUDED.owner_name,
  owner_user_id = EXCLUDED.owner_user_id,
  source_opportunity_id = EXCLUDED.source_opportunity_id,
  latest_opportunity_code = EXCLUDED.latest_opportunity_code,
  latest_activity_at = EXCLUDED.latest_activity_at,
  last_interaction_summary = EXCLUDED.last_interaction_summary,
  next_action = EXCLUDED.next_action,
  admin_boundary_code = EXCLUDED.admin_boundary_code,
  updated_by = EXCLUDED.updated_by,
  updated_at = EXCLUDED.updated_at,
  last_source = EXCLUDED.last_source,
  last_activity = EXCLUDED.last_activity;

INSERT INTO crm.crm_customer_activity_d (
  activity_code,
  customer_id,
  source_opportunity_id,
  source_opportunity_code,
  activity_type_code,
  activity_status_code,
  subject,
  occurred_at,
  owner_name,
  owner_user_id,
  summary,
  next_action,
  updated_by,
  updated_at,
  last_source,
  last_activity
)
SELECT
  'crm-act-opp-' || o.opportunity_id::TEXT,
  c.customer_id,
  o.opportunity_id,
  o.opportunity_code,
  'opportunity-next-action',
  'done',
  o.opportunity_name,
  o.updated_at,
  o.owner_name,
  o.owner_user_id,
  o.next_action,
  o.next_action,
  o.updated_by,
  o.updated_at,
  'crm.customer.seed',
  'opportunity-next-action-seed-backfill'
FROM crm.crm_opportunity_m o
JOIN crm.crm_customer_m c
  ON c.customer_code = 'crm-cust-' || SUBSTRING(MD5(LOWER(TRIM(o.customer_name))) FROM 1 FOR 12)
WHERE o.is_active = TRUE
  AND TRIM(o.customer_name) <> ''
ON CONFLICT (activity_code) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  source_opportunity_id = EXCLUDED.source_opportunity_id,
  source_opportunity_code = EXCLUDED.source_opportunity_code,
  subject = EXCLUDED.subject,
  occurred_at = EXCLUDED.occurred_at,
  owner_name = EXCLUDED.owner_name,
  owner_user_id = EXCLUDED.owner_user_id,
  summary = EXCLUDED.summary,
  next_action = EXCLUDED.next_action,
  updated_by = EXCLUDED.updated_by,
  updated_at = EXCLUDED.updated_at,
  last_source = EXCLUDED.last_source,
  last_activity = EXCLUDED.last_activity;
