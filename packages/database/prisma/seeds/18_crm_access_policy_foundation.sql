-- =========================================================
-- Seed: 18_crm_access_policy_foundation.sql
-- CRM opportunity access vocabulary / baseline
-- =========================================================

begin;

insert into common.cm_permission_m (
  permission_code, permission_name, domain_code, permission_axis,
  description, sort_order, is_active, memo,
  last_source, last_activity, updated_at
)
values
  ('crm.opportunity.read', 'CRM 영업기회 조회', 'crm', 'action', 'CRM 영업기회 목록, 상세, 차수, 변경 이력을 조회하는 권한', 240, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.opportunity.write', 'CRM 영업기회 등록/수정', 'crm', 'action', 'CRM 영업기회를 등록하고 최신 미확정 차수를 수정하는 권한', 241, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.opportunity.confirm', 'CRM 영업기회 확정 관리', 'crm', 'action', 'CRM 영업기회를 확정하거나 확정 해제하는 권한', 242, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.opportunity.version.manage', 'CRM 영업기회 차수 관리', 'crm', 'action', '확정된 CRM 영업기회에서 새 차수를 추가하는 권한', 243, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.customer.read', 'CRM 고객 조회', 'crm', 'action', 'CRM 고객 원장과 고객 상세를 조회하는 권한', 244, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.customer.write', 'CRM 고객 등록/수정', 'crm', 'action', 'CRM 고객 원장을 등록하고 수정하는 권한', 245, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.customer.activity.read', 'CRM 고객 활동 조회', 'crm', 'action', 'CRM 고객 활동 원장을 조회하는 권한', 246, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.customer.activity.write', 'CRM 고객 활동 등록', 'crm', 'action', 'CRM 고객 활동 원장을 등록하는 권한', 247, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp)
on conflict (permission_code) do update
set permission_name = excluded.permission_name,
    domain_code = excluded.domain_code,
    permission_axis = excluded.permission_axis,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

insert into common.cm_role_permission_r (
  role_id, permission_id, is_active, memo, last_source, last_activity, updated_at
)
select
  r.role_id,
  p.permission_id,
  true as is_active,
  'Seeded CRM role baseline permission' as memo,
  'crm-access-policy-seed' as last_source,
  'seed.crm-access-policy' as last_activity,
  current_timestamp as updated_at
from (
  values
    ('admin', 'crm.opportunity.read'),
    ('admin', 'crm.opportunity.write'),
    ('admin', 'crm.opportunity.confirm'),
    ('admin', 'crm.opportunity.version.manage'),
    ('admin', 'crm.customer.read'),
    ('admin', 'crm.customer.write'),
    ('admin', 'crm.customer.activity.read'),
    ('admin', 'crm.customer.activity.write'),
    ('manager', 'crm.opportunity.read'),
    ('manager', 'crm.opportunity.write'),
    ('manager', 'crm.opportunity.confirm'),
    ('manager', 'crm.opportunity.version.manage'),
    ('manager', 'crm.customer.read'),
    ('manager', 'crm.customer.write'),
    ('manager', 'crm.customer.activity.read'),
    ('manager', 'crm.customer.activity.write'),
    ('user', 'crm.opportunity.read'),
    ('user', 'crm.opportunity.write'),
    ('user', 'crm.customer.read'),
    ('user', 'crm.customer.write'),
    ('user', 'crm.customer.activity.read'),
    ('user', 'crm.customer.activity.write'),
    ('viewer', 'crm.opportunity.read'),
    ('viewer', 'crm.customer.read'),
    ('viewer', 'crm.customer.activity.read')
) as mapping(role_code, permission_code)
join common.cm_role_m r on r.role_code = mapping.role_code
join common.cm_permission_m p on p.permission_code = mapping.permission_code
on conflict (role_id, permission_id) do update
set is_active = true,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

commit;
