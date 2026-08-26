-- =========================================================
-- CRM Seed Data: Source Demo Opportunities
-- Schema: crm
-- Source: Sales Management System -proto/script/1.SQL script/sample_data.sql
-- Six opportunity groups are preserved. The Samsung ERP group contains the
-- original confirmed V1 and the original working V2, so seven rows are expected.
-- =========================================================

begin;

insert into crm.crm_opportunity_m (
  opportunity_code, opportunity_group_code, customer_name, opportunity_name, owner_name, owner_user_id,
  business_type, industry_line, region_code, status_code, priority_code,
  version_no, confirmed, expected_start_date, expected_end_date,
  payment_term_code, quote_status_code, quote_client_contact_name, quote_issued_at, quote_valid_until, quote_memo,
  revenue_subtotal, special_discount_type_code, special_discount_value,
  special_discount_amount, revenue_total, cost_total, pms_handoff_status_code, dms_link_status_code,
  admin_boundary_code, next_action, is_active, created_at, updated_at,
  last_source, last_activity
)
values
  ('crm-opp-001', 'crm-opp-001', '삼성전자', 'ERP 시스템 구축 프로젝트', '김민준',
   (select u.user_id from common.cm_user_m u join common.cm_user_auth_m a on a.user_id = u.user_id where a.login_id = 'am.park' limit 1),
   '외부SI', '전자/제조', 'domestic', 'won', 'high',
   1, true, date '2025-01-01', date '2025-12-31',
   'NET30', 'accepted', null, timestamp with time zone '2025-01-01T00:00:00Z', date '2025-01-31', '원천 데모 확정 1차수',
   565000000, 'amount', 5000000.00, 5000000, 560000000, 404000000, 'planned', 'planned',
   'shared-admin', '계약 원장과 청구계획 확인', true,
   timestamp with time zone '2025-01-01T00:00:00Z', timestamp with time zone '2025-01-01T00:00:00Z',
   'SEED', 'crm.opportunity.seed'),
  ('crm-opp-001-v2', 'crm-opp-001', '삼성전자', 'ERP 시스템 구축 프로젝트', '김민준',
   (select u.user_id from common.cm_user_m u join common.cm_user_auth_m a on a.user_id = u.user_id where a.login_id = 'am.park' limit 1),
   '외부SI', '전자/제조', 'domestic', 'won', 'high',
   2, false, date '2025-01-01', date '2025-12-31',
   'NET30', 'draft', null, null, null, '원천 데모 변경사항 반영 중인 2차수',
   605500000, 'amount', 3000000.00, 3000000, 602500000, 0, 'planned', 'planned',
   'shared-admin', '2차수 원가 라인 입력 후 확정', true,
   timestamp with time zone '2025-03-01T00:00:00Z', timestamp with time zone '2025-03-01T00:00:00Z',
   'SEED', 'crm.opportunity.seed'),
  ('crm-opp-002', 'crm-opp-002', '현대자동차', 'SCM 플랫폼 고도화', '이서연',
   (select u.user_id from common.cm_user_m u join common.cm_user_auth_m a on a.user_id = u.user_id where a.login_id = 'am.park' limit 1),
   '외부SI', '자동차/제조', 'domestic', 'proposal', 'high',
   1, true, date '2025-04-01', date '2026-03-31',
   '분할납부', 'accepted', null, timestamp with time zone '2025-04-01T00:00:00Z', date '2025-05-01', '원천 데모 진행중 확정 1차수',
   197000000, 'rate', 5.00, 9850000, 187150000, 138200000, 'planned', 'planned',
   'shared-admin', '계약 전환 범위 확인', true,
   timestamp with time zone '2025-04-01T00:00:00Z', timestamp with time zone '2025-04-01T00:00:00Z',
   'SEED', 'crm.opportunity.seed'),
  ('crm-opp-003', 'crm-opp-003', 'LG화학', 'MES 고도화 및 스마트팩토리 구현', '박지호',
   (select u.user_id from common.cm_user_m u join common.cm_user_auth_m a on a.user_id = u.user_id where a.login_id = 'pm.kim' limit 1),
   '외부SI', '화학/제조', 'domestic', 'won', 'high',
   1, true, date '2024-10-01', date '2025-09-30',
   '분할납부', 'accepted', null, timestamp with time zone '2024-10-01T00:00:00Z', date '2024-10-31', '원천 데모 계약완료 1차수',
   330500000, 'amount', null, 0, 330500000, 233270000, 'planned', 'planned',
   'shared-admin', '계약 및 실적 확인', true,
   timestamp with time zone '2024-10-01T00:00:00Z', timestamp with time zone '2024-10-01T00:00:00Z',
   'SEED', 'crm.opportunity.seed'),
  ('crm-opp-004', 'crm-opp-004', 'SK하이닉스', '하이브리드 클라우드 인프라 전환', '최수아',
   (select u.user_id from common.cm_user_m u join common.cm_user_auth_m a on a.user_id = u.user_id where a.login_id = 'con.jung' limit 1),
   '클라우드 전환', '반도체/제조', 'domestic', 'qualified', 'medium',
   1, false, date '2025-07-01', date '2026-06-30',
   'NET60', 'draft', null, null, null, '원천 데모 검토중 작성본',
   478000000, 'amount', null, 0, 478000000, 385280000, 'planned', 'planned',
   'shared-admin', '검토 완료 후 확정', true,
   timestamp with time zone '2025-07-01T00:00:00Z', timestamp with time zone '2025-07-01T00:00:00Z',
   'SEED', 'crm.opportunity.seed'),
  ('crm-opp-005', 'crm-opp-005', '카카오', 'AI 기반 데이터 분석 플랫폼 구축', '한도현',
   (select u.user_id from common.cm_user_m u join common.cm_user_auth_m a on a.user_id = u.user_id where a.login_id = 'sm.choi' limit 1),
   'AI/분석', 'IT/플랫폼', 'domestic', 'proposal', 'medium',
   1, true, date '2025-05-01', date '2025-10-31',
   'NET30', 'accepted', null, timestamp with time zone '2025-05-01T00:00:00Z', date '2025-05-31', '원천 데모 용역 전용 확정 1차수',
   177000000, 'amount', null, 0, 177000000, 125100000, 'planned', 'planned',
   'shared-admin', '계약 전환 범위 확인', true,
   timestamp with time zone '2025-05-01T00:00:00Z', timestamp with time zone '2025-05-01T00:00:00Z',
   'SEED', 'crm.opportunity.seed'),
  ('crm-opp-006', 'crm-opp-006', '포스코', '스마트팩토리 2단계 구축', '박지호',
   (select u.user_id from common.cm_user_m u join common.cm_user_auth_m a on a.user_id = u.user_id where a.login_id = 'pm.kim' limit 1),
   '외부SI', '철강/제조', 'domestic', 'lost', 'medium',
   1, false, date '2025-03-01', date '2025-12-31',
   'NET30', 'void', null, null, null, '원천 데모 실패 영업기회',
   381000000, 'amount', null, 0, 381000000, 269100000, 'planned', 'planned',
   'shared-admin', '실패 사유 보관', true,
   timestamp with time zone '2025-03-01T00:00:00Z', timestamp with time zone '2025-03-01T00:00:00Z',
   'SEED', 'crm.opportunity.seed')
on conflict (opportunity_code) do update set
  opportunity_group_code = excluded.opportunity_group_code,
  customer_name = excluded.customer_name,
  opportunity_name = excluded.opportunity_name,
  owner_name = excluded.owner_name,
  owner_user_id = excluded.owner_user_id,
  business_type = excluded.business_type,
  industry_line = excluded.industry_line,
  region_code = excluded.region_code,
  status_code = excluded.status_code,
  priority_code = excluded.priority_code,
  version_no = excluded.version_no,
  confirmed = excluded.confirmed,
  expected_start_date = excluded.expected_start_date,
  expected_end_date = excluded.expected_end_date,
  payment_term_code = excluded.payment_term_code,
  quote_status_code = excluded.quote_status_code,
  quote_client_contact_name = excluded.quote_client_contact_name,
  quote_issued_at = excluded.quote_issued_at,
  quote_valid_until = excluded.quote_valid_until,
  quote_memo = excluded.quote_memo,
  revenue_subtotal = excluded.revenue_subtotal,
  special_discount_type_code = excluded.special_discount_type_code,
  special_discount_value = excluded.special_discount_value,
  special_discount_amount = excluded.special_discount_amount,
  revenue_total = excluded.revenue_total,
  cost_total = excluded.cost_total,
  pms_handoff_status_code = excluded.pms_handoff_status_code,
  dms_link_status_code = excluded.dms_link_status_code,
  admin_boundary_code = excluded.admin_boundary_code,
  next_action = excluded.next_action,
  is_active = excluded.is_active,
  updated_at = excluded.updated_at,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

delete from crm.crm_opportunity_line_d
where opportunity_id in (
  select opportunity_id
  from crm.crm_opportunity_m
  where opportunity_code in (
    'crm-opp-001', 'crm-opp-001-v2', 'crm-opp-002', 'crm-opp-003',
    'crm-opp-004', 'crm-opp-005', 'crm-opp-006'
  )
)
and last_source = 'SEED'
and last_activity = 'crm.opportunity.seed';

insert into crm.crm_opportunity_line_d (
  opportunity_id, line_code, line_kind_code, category_code, line_label,
  quantity, unit_price, amount, margin_rate, trunc_unit,
  department, member_name, grade, service_type_code,
  revenue_linked, linked_cost_line_code, revenue_unit_price,
  sort_order, is_active, created_at, updated_at, last_source, last_activity
)
select o.opportunity_id, v.line_code, v.line_kind_code, v.category_code, v.line_label,
       v.quantity, v.unit_price, v.amount, v.margin_rate, v.trunc_unit,
       v.department, v.member_name, v.grade, v.service_type_code,
       v.revenue_linked, v.linked_cost_line_code, v.revenue_unit_price,
       v.sort_order, true, now(), now(), 'SEED', 'crm.opportunity.seed'
from crm.crm_opportunity_m o
join (
  values
    ('crm-opp-001', 'rev-product-01', 'revenue', 'product', '서버 장비 (HP DL380)', 5.00::numeric, 18000000::bigint, 90000000::bigint, 25.00::numeric, 100000::bigint, null, null, null, null, false, null, null::bigint, 10),
    ('crm-opp-001', 'rev-product-02', 'revenue', 'product', 'SAP ERP 라이선스 (Enterprise)', 30.00::numeric, 8500000::bigint, 255000000::bigint, 30.00::numeric, 100000::bigint, null, null, null, null, false, null, null::bigint, 20),
    ('crm-opp-001', 'rev-product-03', 'revenue', 'product', '네트워크 장비 (스위치/라우터)', 10.00::numeric, 3200000::bigint, 32000000::bigint, 20.00::numeric, 10000::bigint, null, null, null, null, false, null, null::bigint, 30),
    ('crm-opp-001', 'rev-service-01', 'revenue', 'service', '김민준', 6.00::numeric, 12000000::bigint, 72000000::bigint, 35.00::numeric, 100000::bigint, '영업1팀', '김민준', '특급', 'internal', false, null, null::bigint, 40),
    ('crm-opp-001', 'rev-service-02', 'revenue', 'service', '이서연', 8.00::numeric, 9000000::bigint, 72000000::bigint, 30.00::numeric, 100000::bigint, '영업1팀', '이서연', '고급', 'internal', false, null, null::bigint, 50),
    ('crm-opp-001', 'rev-service-03', 'revenue', 'service', '정협력', 4.00::numeric, 11000000::bigint, 44000000::bigint, 20.00::numeric, 100000::bigint, '파트너사A', '정협력', '특급', 'external', false, null, null::bigint, 60),
    ('crm-opp-001', 'cost-product-01', 'cost', 'product', '서버 장비 (HP DL380)', 5.00::numeric, 13500000::bigint, 67500000::bigint, null::numeric, null::bigint, null, null, null, null, true, null, 18000000::bigint, 70),
    ('crm-opp-001', 'cost-product-02', 'cost', 'product', 'SAP ERP 라이선스 (Enterprise)', 30.00::numeric, 5950000::bigint, 178500000::bigint, null::numeric, null::bigint, null, null, null, null, true, null, 8500000::bigint, 80),
    ('crm-opp-001', 'cost-product-03', 'cost', 'product', '네트워크 장비 (스위치/라우터)', 10.00::numeric, 2560000::bigint, 25600000::bigint, null::numeric, null::bigint, null, null, null, null, true, null, 3200000::bigint, 90),
    ('crm-opp-001', 'cost-internal-01', 'cost', 'internal-cost', '김민준', 6.00::numeric, 7800000::bigint, 46800000::bigint, null::numeric, null::bigint, '영업1팀', '김민준', '특급', 'internal', true, null, 12000000::bigint, 100),
    ('crm-opp-001', 'cost-internal-02', 'cost', 'internal-cost', '이서연', 8.00::numeric, 6300000::bigint, 50400000::bigint, null::numeric, null::bigint, '영업1팀', '이서연', '고급', 'internal', true, null, 9000000::bigint, 110),
    ('crm-opp-001', 'cost-external-01', 'cost', 'external-cost', '정협력', 4.00::numeric, 8800000::bigint, 35200000::bigint, null::numeric, null::bigint, '파트너사A', '정협력', '특급', 'external', true, null, 11000000::bigint, 120),

    ('crm-opp-001-v2', 'rev-product-01', 'revenue', 'product', '서버 장비 (HP DL380)', 5.00::numeric, 18000000::bigint, 90000000::bigint, 25.00::numeric, 100000::bigint, null, null, null, null, false, null, null::bigint, 10),
    ('crm-opp-001-v2', 'rev-product-02', 'revenue', 'product', 'SAP ERP 라이선스 (Enterprise)', 35.00::numeric, 8500000::bigint, 297500000::bigint, 30.00::numeric, 100000::bigint, null, null, null, null, false, null, null::bigint, 20),
    ('crm-opp-001-v2', 'rev-product-03', 'revenue', 'product', '네트워크 장비 (스위치/라우터)', 10.00::numeric, 3200000::bigint, 32000000::bigint, 20.00::numeric, 10000::bigint, null, null, null, null, false, null, null::bigint, 30),
    ('crm-opp-001-v2', 'rev-service-01', 'revenue', 'service', '김민준', 8.00::numeric, 12000000::bigint, 96000000::bigint, 35.00::numeric, 100000::bigint, '영업1팀', '김민준', '특급', 'internal', false, null, null::bigint, 40),
    ('crm-opp-001-v2', 'rev-service-02', 'revenue', 'service', '이서연', 10.00::numeric, 9000000::bigint, 90000000::bigint, 30.00::numeric, 100000::bigint, '영업1팀', '이서연', '고급', 'internal', false, null, null::bigint, 50),

    ('crm-opp-002', 'rev-service-01', 'revenue', 'service', '이서연', 10.00::numeric, 9500000::bigint, 95000000::bigint, 30.00::numeric, 100000::bigint, '영업1팀', '이서연', '고급', 'internal', false, null, null::bigint, 10),
    ('crm-opp-002', 'rev-service-02', 'revenue', 'service', '김민준', 4.00::numeric, 12000000::bigint, 48000000::bigint, 35.00::numeric, 100000::bigint, '영업1팀', '김민준', '특급', 'internal', false, null, null::bigint, 20),
    ('crm-opp-002', 'rev-service-03', 'revenue', 'service', '홍길동', 6.00::numeric, 9000000::bigint, 54000000::bigint, 25.00::numeric, 100000::bigint, '파트너사B', '홍길동', '고급', 'external', false, null, null::bigint, 30),
    ('crm-opp-002', 'cost-internal-01', 'cost', 'internal-cost', '이서연', 10.00::numeric, 6650000::bigint, 66500000::bigint, null::numeric, null::bigint, '영업1팀', '이서연', '고급', 'internal', true, null, 9500000::bigint, 40),
    ('crm-opp-002', 'cost-internal-02', 'cost', 'internal-cost', '김민준', 4.00::numeric, 7800000::bigint, 31200000::bigint, null::numeric, null::bigint, '영업1팀', '김민준', '특급', 'internal', true, null, 12000000::bigint, 50),
    ('crm-opp-002', 'cost-external-01', 'cost', 'external-cost', '홍길동', 6.00::numeric, 6750000::bigint, 40500000::bigint, null::numeric, null::bigint, '파트너사B', '홍길동', '고급', 'external', true, null, 9000000::bigint, 60),

    ('crm-opp-003', 'rev-product-01', 'revenue', 'product', 'IoT 센서 (온도/습도)', 200.00::numeric, 320000::bigint, 64000000::bigint, 20.00::numeric, 10000::bigint, null, null, null, null, false, null, null::bigint, 10),
    ('crm-opp-003', 'rev-product-02', 'revenue', 'product', '산업용 게이트웨이', 20.00::numeric, 4500000::bigint, 90000000::bigint, 25.00::numeric, 10000::bigint, null, null, null, null, false, null, null::bigint, 20),
    ('crm-opp-003', 'rev-product-03', 'revenue', 'product', 'MES 소프트웨어 라이선스', 1.00::numeric, 85000000::bigint, 85000000::bigint, 40.00::numeric, 100000::bigint, null, null, null, null, false, null, null::bigint, 30),
    ('crm-opp-003', 'rev-service-01', 'revenue', 'service', '박지호', 5.00::numeric, 12000000::bigint, 60000000::bigint, 35.00::numeric, 100000::bigint, '영업2팀', '박지호', '특급', 'internal', false, null, null::bigint, 40),
    ('crm-opp-003', 'rev-service-02', 'revenue', 'service', '이기술', 3.00::numeric, 10500000::bigint, 31500000::bigint, 22.00::numeric, 100000::bigint, '협력사C', '이기술', '특급', 'external', false, null, null::bigint, 50),
    ('crm-opp-003', 'cost-product-01', 'cost', 'product', 'IoT 센서 (온도/습도)', 200.00::numeric, 256000::bigint, 51200000::bigint, null::numeric, null::bigint, null, null, null, null, true, null, 320000::bigint, 60),
    ('crm-opp-003', 'cost-product-02', 'cost', 'product', '산업용 게이트웨이', 20.00::numeric, 3375000::bigint, 67500000::bigint, null::numeric, null::bigint, null, null, null, null, true, null, 4500000::bigint, 70),
    ('crm-opp-003', 'cost-product-03', 'cost', 'product', 'MES 소프트웨어 라이선스', 1.00::numeric, 51000000::bigint, 51000000::bigint, null::numeric, null::bigint, null, null, null, null, true, null, 85000000::bigint, 80),
    ('crm-opp-003', 'cost-internal-01', 'cost', 'internal-cost', '박지호', 5.00::numeric, 7800000::bigint, 39000000::bigint, null::numeric, null::bigint, '영업2팀', '박지호', '특급', 'internal', true, null, 12000000::bigint, 90),
    ('crm-opp-003', 'cost-external-01', 'cost', 'external-cost', '이기술', 3.00::numeric, 8190000::bigint, 24570000::bigint, null::numeric, null::bigint, '협력사C', '이기술', '특급', 'external', true, null, 10500000::bigint, 100),

    ('crm-opp-004', 'rev-product-01', 'revenue', 'product', 'AWS 클라우드 구독 (1년)', 1.00::numeric, 240000000::bigint, 240000000::bigint, 15.00::numeric, 1000000::bigint, null, null, null, null, false, null, null::bigint, 10),
    ('crm-opp-004', 'rev-product-02', 'revenue', 'product', '백업 스토리지 (NetApp)', 4.00::numeric, 22000000::bigint, 88000000::bigint, 20.00::numeric, 100000::bigint, null, null, null, null, false, null, null::bigint, 20),
    ('crm-opp-004', 'rev-service-01', 'revenue', 'service', '최수아', 6.00::numeric, 9000000::bigint, 54000000::bigint, 28.00::numeric, 100000::bigint, '영업2팀', '최수아', '고급', 'internal', false, null, null::bigint, 30),
    ('crm-opp-004', 'rev-service-02', 'revenue', 'service', '김클라', 8.00::numeric, 12000000::bigint, 96000000::bigint, 25.00::numeric, 100000::bigint, '클라우드전문사', '김클라', '특급', 'external', false, null, null::bigint, 40),
    ('crm-opp-004', 'cost-product-01', 'cost', 'product', 'AWS 클라우드 구독 (1년)', 1.00::numeric, 204000000::bigint, 204000000::bigint, null::numeric, null::bigint, null, null, null, null, true, null, 240000000::bigint, 50),
    ('crm-opp-004', 'cost-product-02', 'cost', 'product', '백업 스토리지 (NetApp)', 4.00::numeric, 17600000::bigint, 70400000::bigint, null::numeric, null::bigint, null, null, null, null, true, null, 22000000::bigint, 60),
    ('crm-opp-004', 'cost-internal-01', 'cost', 'internal-cost', '최수아', 6.00::numeric, 6480000::bigint, 38880000::bigint, null::numeric, null::bigint, '영업2팀', '최수아', '고급', 'internal', true, null, 9000000::bigint, 70),
    ('crm-opp-004', 'cost-external-01', 'cost', 'external-cost', '김클라', 8.00::numeric, 9000000::bigint, 72000000::bigint, null::numeric, null::bigint, '클라우드전문사', '김클라', '특급', 'external', true, null, 12000000::bigint, 80),

    ('crm-opp-005', 'rev-service-01', 'revenue', 'service', '한도현', 5.00::numeric, 12000000::bigint, 60000000::bigint, 33.00::numeric, 100000::bigint, '영업3팀', '한도현', '특급', 'internal', false, null, null::bigint, 10),
    ('crm-opp-005', 'rev-service-02', 'revenue', 'service', '박분석', 6.00::numeric, 9500000::bigint, 57000000::bigint, 30.00::numeric, 100000::bigint, '영업3팀', '박분석', '고급', 'internal', false, null, null::bigint, 20),
    ('crm-opp-005', 'rev-service-03', 'revenue', 'service', '최AI', 4.00::numeric, 15000000::bigint, 60000000::bigint, 25.00::numeric, 100000::bigint, 'AI연구소', '최AI', '특급', 'external', false, null, null::bigint, 30),
    ('crm-opp-005', 'cost-internal-01', 'cost', 'internal-cost', '한도현', 5.00::numeric, 8040000::bigint, 40200000::bigint, null::numeric, null::bigint, '영업3팀', '한도현', '특급', 'internal', true, null, 12000000::bigint, 40),
    ('crm-opp-005', 'cost-internal-02', 'cost', 'internal-cost', '박분석', 6.00::numeric, 6650000::bigint, 39900000::bigint, null::numeric, null::bigint, '영업3팀', '박분석', '고급', 'internal', true, null, 9500000::bigint, 50),
    ('crm-opp-005', 'cost-external-01', 'cost', 'external-cost', '최AI', 4.00::numeric, 11250000::bigint, 45000000::bigint, null::numeric, null::bigint, 'AI연구소', '최AI', '특급', 'external', true, null, 15000000::bigint, 60),

    ('crm-opp-006', 'rev-product-01', 'revenue', 'product', '제조 실행 시스템(MES) 라이선스', 1.00::numeric, 120000000::bigint, 120000000::bigint, 35.00::numeric, 1000000::bigint, null, null, null, null, false, null, null::bigint, 10),
    ('crm-opp-006', 'rev-product-02', 'revenue', 'product', 'PLC 제어 장비', 30.00::numeric, 5500000::bigint, 165000000::bigint, 22.00::numeric, 10000::bigint, null, null, null, null, false, null, null::bigint, 20),
    ('crm-opp-006', 'rev-service-01', 'revenue', 'service', '박지호', 8.00::numeric, 12000000::bigint, 96000000::bigint, 35.00::numeric, 100000::bigint, '영업2팀', '박지호', '특급', 'internal', false, null, null::bigint, 30),
    ('crm-opp-006', 'cost-product-01', 'cost', 'product', '제조 실행 시스템(MES) 라이선스', 1.00::numeric, 78000000::bigint, 78000000::bigint, null::numeric, null::bigint, null, null, null, null, true, null, 120000000::bigint, 40),
    ('crm-opp-006', 'cost-product-02', 'cost', 'product', 'PLC 제어 장비', 30.00::numeric, 4290000::bigint, 128700000::bigint, null::numeric, null::bigint, null, null, null, null, true, null, 5500000::bigint, 50),
    ('crm-opp-006', 'cost-internal-01', 'cost', 'internal-cost', '박지호', 8.00::numeric, 7800000::bigint, 62400000::bigint, null::numeric, null::bigint, '영업2팀', '박지호', '특급', 'internal', true, null, 12000000::bigint, 60)
) as v(opportunity_code, line_code, line_kind_code, category_code, line_label,
  quantity, unit_price, amount, margin_rate, trunc_unit,
  department, member_name, grade, service_type_code,
  revenue_linked, linked_cost_line_code, revenue_unit_price, sort_order)
  on o.opportunity_code = v.opportunity_code
on conflict (opportunity_id, line_code) do update set
  line_kind_code = excluded.line_kind_code,
  category_code = excluded.category_code,
  line_label = excluded.line_label,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  amount = excluded.amount,
  margin_rate = excluded.margin_rate,
  trunc_unit = excluded.trunc_unit,
  department = excluded.department,
  member_name = excluded.member_name,
  grade = excluded.grade,
  service_type_code = excluded.service_type_code,
  revenue_linked = excluded.revenue_linked,
  linked_cost_line_code = excluded.linked_cost_line_code,
  revenue_unit_price = excluded.revenue_unit_price,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now(),
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

commit;
