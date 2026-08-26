-- =========================================================
-- CRM Seed Data: Source Demo Contracts
-- Schema: crm
-- Source: Sales Management System -proto/script/sample_contracts.sql
--
-- The prototype contract samples are independent from sample_data.sql, so they
-- use a dedicated code namespace and do not overwrite SSOO platform fixtures.
-- Source billing values are intentionally preserved even where the prototype
-- sample totals differ from the contract-line totals.
-- =========================================================

begin;

insert into crm.crm_contract_m (
  contract_code, source_opportunity_id, source_opportunity_code,
  customer_name, contract_name, owner_name, business_type, industry_line,
  region_code, status_code, confirmed, contract_start_date, contract_end_date,
  wbs_code, payment_term_code, revenue_subtotal,
  special_discount_type_code, special_discount_value, special_discount_amount,
  revenue_total, cost_total, external_cost_total,
  pms_handoff_status_code, dms_link_status_code, admin_boundary_code, next_action,
  is_active, created_at, updated_at, last_source, last_activity
)
values
  ('crm-source-ct-001', null, null, 'LS전선(주)', 'ERP 시스템 구축 프로젝트', '시스템관리자',
   '내부SI', 'LS전선', 'domestic', 'active', true, date '2025-01-01', date '2025-12-31',
   'WBS-2025-001', 'NET30', 303000000, 'amount', 0, 0, 303000000, 225000000, 59000000,
   'planned', 'planned', 'shared-admin', '원천 샘플 계약 수행 및 청구실적 확인', true,
   timestamp with time zone '2025-01-01T00:00:00Z', timestamp with time zone '2025-01-01T00:00:00Z',
   'SOURCE-DEMO', 'crm.source.contract.seed'),
  ('crm-source-ct-002', null, null, '가온전선(주)', '네트워크 인프라 고도화', '시스템관리자',
   'AMS', '가온전선', 'domestic', 'active', true, date '2025-03-01', date '2026-02-28',
   'WBS-2025-002', '분할납부', 186000000, 'amount', 0, 0, 186000000, 141200000, 109700000,
   'planned', 'planned', 'shared-admin', '원천 AMS 계약 청구계획 확인', true,
   timestamp with time zone '2025-03-01T00:00:00Z', timestamp with time zone '2025-03-01T00:00:00Z',
   'SOURCE-DEMO', 'crm.source.contract.seed'),
  ('crm-source-ct-003', null, null, '(주)스마트제조', '스마트팩토리 MES 구축', '시스템관리자',
   '외부SI', '대외', 'domestic', 'active', true, date '2025-06-01', date '2026-05-31',
   'WBS-2025-003', 'NET60', 428000000, 'rate', 5.00, 21400000, 406600000, 318400000, 90400000,
   'planned', 'planned', 'shared-admin', '원천 외부SI 계약 청구계획 확인', true,
   timestamp with time zone '2025-06-01T00:00:00Z', timestamp with time zone '2025-06-01T00:00:00Z',
   'SOURCE-DEMO', 'crm.source.contract.seed'),
  ('crm-source-ct-004', null, null, '엠트론(주)', '클라우드 인프라 운영 서비스', '시스템관리자',
   'AMS', '엠트론', 'domestic', 'active', true, date '2026-01-01', date '2026-12-31',
   'WBS-2026-001', '계약즉시', 186000000, 'amount', 0, 0, 186000000, 139500000, 0,
   'planned', 'planned', 'shared-admin', '원천 AMS 운영 계약 월별 계획 확인', true,
   timestamp with time zone '2026-01-01T00:00:00Z', timestamp with time zone '2026-01-01T00:00:00Z',
   'SOURCE-DEMO', 'crm.source.contract.seed'),
  ('crm-source-ct-005', null, null, 'LS Cable Vietnam', '베트남 물류 WMS 시스템 구축', '시스템관리자',
   '외부SI', '대외', 'overseas', 'active', true, date '2026-04-01', date '2026-12-31',
   'WBS-2026-002', 'NET30', 387000000, 'amount', 0, 0, 387000000, 283350000, 141600000,
   'planned', 'planned', 'shared-admin', '원천 해외 계약 청구실적 확인', true,
   timestamp with time zone '2026-04-01T00:00:00Z', timestamp with time zone '2026-04-01T00:00:00Z',
   'SOURCE-DEMO', 'crm.source.contract.seed')
on conflict (contract_code) do update set
  source_opportunity_id = excluded.source_opportunity_id,
  source_opportunity_code = excluded.source_opportunity_code,
  customer_name = excluded.customer_name,
  contract_name = excluded.contract_name,
  owner_name = excluded.owner_name,
  business_type = excluded.business_type,
  industry_line = excluded.industry_line,
  region_code = excluded.region_code,
  status_code = excluded.status_code,
  confirmed = excluded.confirmed,
  contract_start_date = excluded.contract_start_date,
  contract_end_date = excluded.contract_end_date,
  wbs_code = excluded.wbs_code,
  payment_term_code = excluded.payment_term_code,
  revenue_subtotal = excluded.revenue_subtotal,
  special_discount_type_code = excluded.special_discount_type_code,
  special_discount_value = excluded.special_discount_value,
  special_discount_amount = excluded.special_discount_amount,
  revenue_total = excluded.revenue_total,
  cost_total = excluded.cost_total,
  external_cost_total = excluded.external_cost_total,
  pms_handoff_status_code = excluded.pms_handoff_status_code,
  dms_link_status_code = excluded.dms_link_status_code,
  admin_boundary_code = excluded.admin_boundary_code,
  next_action = excluded.next_action,
  is_active = true,
  updated_at = excluded.updated_at,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

delete from crm.crm_contract_line_d
where contract_id in (
  select contract_id from crm.crm_contract_m
  where contract_code like 'crm-source-ct-%'
)
and last_source = 'SOURCE-DEMO';

insert into crm.crm_contract_line_d (
  contract_id, line_code, line_kind_code, category_code, line_label,
  quantity, unit_price, amount, margin_rate, trunc_unit,
  department, member_name, grade, service_type_code,
  revenue_linked, linked_cost_line_code, revenue_unit_price,
  sort_order, is_active, created_at, updated_at, last_source, last_activity
)
select c.contract_id, v.line_code, v.line_kind_code, v.category_code, v.line_label,
       v.quantity, v.unit_price, v.amount, v.margin_rate, v.trunc_unit,
       v.department, v.member_name, v.grade, v.service_type_code,
       false, null, v.revenue_unit_price,
       v.sort_order, true, now(), now(), 'SOURCE-DEMO', 'crm.source.contract.seed'
from crm.crm_contract_m c
join (
  values
    ('crm-source-ct-001','rev-product-01','revenue','product','ERP 소프트웨어 라이선스',10.00::numeric,5000000::bigint,50000000::bigint,30.00::numeric,0::bigint,null,null,null,null,null::bigint,10),
    ('crm-source-ct-001','rev-product-02','revenue','product','서버 장비',2.00::numeric,15000000::bigint,30000000::bigint,20.00::numeric,0::bigint,null,null,null,null,null::bigint,20),
    ('crm-source-ct-001','rev-service-01','revenue','service','PM',12.00::numeric,8000000::bigint,96000000::bigint,25.00::numeric,0::bigint,'개발팀','PM','수석','internal',null::bigint,30),
    ('crm-source-ct-001','rev-service-02','revenue','service','개발자1',12.00::numeric,6000000::bigint,72000000::bigint,25.00::numeric,0::bigint,'개발팀','개발자1','선임','internal',null::bigint,40),
    ('crm-source-ct-001','rev-service-03','revenue','service','개발자2',10.00::numeric,5500000::bigint,55000000::bigint,25.00::numeric,0::bigint,'개발팀','개발자2','책임','internal',null::bigint,50),
    ('crm-source-ct-001','cost-product-01','cost','product','ERP 소프트웨어 라이선스',10.00::numeric,3500000::bigint,35000000::bigint,null::numeric,null::bigint,null,null,null,null,5000000::bigint,60),
    ('crm-source-ct-001','cost-product-02','cost','product','서버 장비',2.00::numeric,12000000::bigint,24000000::bigint,null::numeric,null::bigint,null,null,null,null,15000000::bigint,70),
    ('crm-source-ct-001','cost-internal-01','cost','internal-cost','PM',12.00::numeric,6000000::bigint,72000000::bigint,null::numeric,null::bigint,'개발팀','PM','수석','internal',8000000::bigint,80),
    ('crm-source-ct-001','cost-internal-02','cost','internal-cost','개발자1',12.00::numeric,4500000::bigint,54000000::bigint,null::numeric,null::bigint,'개발팀','개발자1','선임','internal',6000000::bigint,90),
    ('crm-source-ct-001','cost-internal-03','cost','internal-cost','개발자2',10.00::numeric,4000000::bigint,40000000::bigint,null::numeric,null::bigint,'개발팀','개발자2','책임','internal',5500000::bigint,100),

    ('crm-source-ct-002','rev-product-01','revenue','product','네트워크 스위치',20.00::numeric,3000000::bigint,60000000::bigint,25.00::numeric,0::bigint,null,null,null,null,null::bigint,10),
    ('crm-source-ct-002','rev-product-02','revenue','product','방화벽 장비',4.00::numeric,8000000::bigint,32000000::bigint,20.00::numeric,0::bigint,null,null,null,null,null::bigint,20),
    ('crm-source-ct-002','rev-product-03','revenue','product','무선 AP',50.00::numeric,500000::bigint,25000000::bigint,30.00::numeric,0::bigint,null,null,null,null,null::bigint,30),
    ('crm-source-ct-002','rev-service-01','revenue','service','네트워크엔지니어',6.00::numeric,7000000::bigint,42000000::bigint,25.00::numeric,0::bigint,'인프라팀','네트워크엔지니어','선임','internal',null::bigint,40),
    ('crm-source-ct-002','rev-service-02','revenue','service','외부전문가',3.00::numeric,9000000::bigint,27000000::bigint,20.00::numeric,0::bigint,'인프라팀','외부전문가','책임','external',null::bigint,50),
    ('crm-source-ct-002','cost-product-01','cost','product','네트워크 스위치',20.00::numeric,2250000::bigint,45000000::bigint,null::numeric,null::bigint,null,null,null,null,3000000::bigint,60),
    ('crm-source-ct-002','cost-product-02','cost','product','방화벽 장비',4.00::numeric,6400000::bigint,25600000::bigint,null::numeric,null::bigint,null,null,null,null,8000000::bigint,70),
    ('crm-source-ct-002','cost-product-03','cost','product','무선 AP',50.00::numeric,350000::bigint,17500000::bigint,null::numeric,null::bigint,null,null,null,null,500000::bigint,80),
    ('crm-source-ct-002','cost-internal-01','cost','internal-cost','네트워크엔지니어',6.00::numeric,5250000::bigint,31500000::bigint,null::numeric,null::bigint,'인프라팀','네트워크엔지니어','선임','internal',7000000::bigint,90),
    ('crm-source-ct-002','cost-external-01','cost','external-cost','외부전문가',3.00::numeric,7200000::bigint,21600000::bigint,null::numeric,null::bigint,'외부','외부전문가','책임','external',9000000::bigint,100),

    ('crm-source-ct-003','rev-product-01','revenue','product','MES 솔루션 라이선스',1.00::numeric,80000000::bigint,80000000::bigint,35.00::numeric,10000::bigint,null,null,null,null,null::bigint,10),
    ('crm-source-ct-003','rev-service-01','revenue','service','PM',12.00::numeric,9000000::bigint,108000000::bigint,30.00::numeric,0::bigint,'솔루션팀','PM','수석','internal',null::bigint,20),
    ('crm-source-ct-003','rev-service-02','revenue','service','아키텍트',8.00::numeric,9000000::bigint,72000000::bigint,30.00::numeric,0::bigint,'솔루션팀','아키텍트','수석','internal',null::bigint,30),
    ('crm-source-ct-003','rev-service-03','revenue','service','개발자',20.00::numeric,6000000::bigint,120000000::bigint,25.00::numeric,0::bigint,'솔루션팀','개발자','선임','internal',null::bigint,40),
    ('crm-source-ct-003','rev-service-04','revenue','service','외부개발',6.00::numeric,8000000::bigint,48000000::bigint,20.00::numeric,0::bigint,'솔루션팀','외부개발','책임','external',null::bigint,50),
    ('crm-source-ct-003','cost-product-01','cost','product','MES 솔루션 라이선스',1.00::numeric,52000000::bigint,52000000::bigint,null::numeric,null::bigint,null,null,null,null,80000000::bigint,60),
    ('crm-source-ct-003','cost-internal-01','cost','internal-cost','PM',12.00::numeric,6900000::bigint,82800000::bigint,null::numeric,null::bigint,'솔루션팀','PM','수석','internal',9000000::bigint,70),
    ('crm-source-ct-003','cost-internal-02','cost','internal-cost','아키텍트',8.00::numeric,6900000::bigint,55200000::bigint,null::numeric,null::bigint,'솔루션팀','아키텍트','수석','internal',9000000::bigint,80),
    ('crm-source-ct-003','cost-internal-03','cost','internal-cost','개발자',20.00::numeric,4500000::bigint,90000000::bigint,null::numeric,null::bigint,'솔루션팀','개발자','선임','internal',6000000::bigint,90),
    ('crm-source-ct-003','cost-external-01','cost','external-cost','외부개발',6.00::numeric,6400000::bigint,38400000::bigint,null::numeric,null::bigint,'외부','외부개발','책임','external',8000000::bigint,100),

    ('crm-source-ct-004','rev-service-01','revenue','service','시스템엔지니어1',12.00::numeric,6500000::bigint,78000000::bigint,25.00::numeric,0::bigint,'운영팀','시스템엔지니어1','선임','internal',null::bigint,10),
    ('crm-source-ct-004','rev-service-02','revenue','service','시스템엔지니어2',12.00::numeric,5500000::bigint,66000000::bigint,25.00::numeric,0::bigint,'운영팀','시스템엔지니어2','책임','internal',null::bigint,20),
    ('crm-source-ct-004','rev-service-03','revenue','service','DBA',6.00::numeric,7000000::bigint,42000000::bigint,25.00::numeric,0::bigint,'운영팀','DBA','선임','internal',null::bigint,30),
    ('crm-source-ct-004','cost-internal-01','cost','internal-cost','시스템엔지니어1',12.00::numeric,4875000::bigint,58500000::bigint,null::numeric,null::bigint,'운영팀','시스템엔지니어1','선임','internal',6500000::bigint,40),
    ('crm-source-ct-004','cost-internal-02','cost','internal-cost','시스템엔지니어2',12.00::numeric,4125000::bigint,49500000::bigint,null::numeric,null::bigint,'운영팀','시스템엔지니어2','책임','internal',5500000::bigint,50),
    ('crm-source-ct-004','cost-internal-03','cost','internal-cost','DBA',6.00::numeric,5250000::bigint,31500000::bigint,null::numeric,null::bigint,'운영팀','DBA','선임','internal',7000000::bigint,60),

    ('crm-source-ct-005','rev-product-01','revenue','product','WMS 소프트웨어',1.00::numeric,120000000::bigint,120000000::bigint,30.00::numeric,10000::bigint,null,null,null,null,null::bigint,10),
    ('crm-source-ct-005','rev-service-01','revenue','service','PM',9.00::numeric,10000000::bigint,90000000::bigint,30.00::numeric,0::bigint,'글로벌팀','PM','수석','internal',null::bigint,20),
    ('crm-source-ct-005','rev-service-02','revenue','service','개발자',15.00::numeric,7000000::bigint,105000000::bigint,25.00::numeric,0::bigint,'글로벌팀','개발자','선임','internal',null::bigint,30),
    ('crm-source-ct-005','rev-service-03','revenue','service','현지PM',9.00::numeric,8000000::bigint,72000000::bigint,20.00::numeric,0::bigint,'글로벌팀','현지PM','책임','external',null::bigint,40),
    ('crm-source-ct-005','cost-product-01','cost','product','WMS 소프트웨어',1.00::numeric,84000000::bigint,84000000::bigint,null::numeric,null::bigint,null,null,null,null,120000000::bigint,50),
    ('crm-source-ct-005','cost-internal-01','cost','internal-cost','PM',9.00::numeric,7000000::bigint,63000000::bigint,null::numeric,null::bigint,'글로벌팀','PM','수석','internal',10000000::bigint,60),
    ('crm-source-ct-005','cost-internal-02','cost','internal-cost','개발자',15.00::numeric,5250000::bigint,78750000::bigint,null::numeric,null::bigint,'글로벌팀','개발자','선임','internal',7000000::bigint,70),
    ('crm-source-ct-005','cost-external-01','cost','external-cost','현지PM',9.00::numeric,6400000::bigint,57600000::bigint,null::numeric,null::bigint,'외부','현지PM','책임','external',8000000::bigint,80)
) as v(contract_code,line_code,line_kind_code,category_code,line_label,quantity,unit_price,amount,margin_rate,trunc_unit,department,member_name,grade,service_type_code,revenue_unit_price,sort_order)
  on c.contract_code = v.contract_code
on conflict (contract_id, line_code) do update set
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
  revenue_unit_price = excluded.revenue_unit_price,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now(),
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

delete from crm.crm_contract_billing_plan_d
where contract_id in (
  select contract_id from crm.crm_contract_m
  where contract_code like 'crm-source-ct-%'
)
and last_source = 'SOURCE-DEMO';

insert into crm.crm_contract_billing_plan_d (
  contract_id, billing_ym, revenue_amount, external_cost_amount, sort_order,
  is_active, created_at, updated_at, last_source, last_activity
)
select c.contract_id, v.billing_ym, v.revenue_amount, v.external_cost_amount, v.sort_order,
       true, now(), now(), 'SOURCE-DEMO', 'crm.source.contract.seed'
from crm.crm_contract_m c
join (
  values
    ('crm-source-ct-001','2025/01',18166666::bigint,13166666::bigint,10),
    ('crm-source-ct-001','2025/02',18166666::bigint,13166666::bigint,20),
    ('crm-source-ct-001','2025/03',18166666::bigint,13166666::bigint,30),
    ('crm-source-ct-001','2025/04',18166666::bigint,13166666::bigint,40),
    ('crm-source-ct-001','2025/05',18166666::bigint,13166666::bigint,50),
    ('crm-source-ct-001','2025/06',18166666::bigint,13166666::bigint,60),
    ('crm-source-ct-001','2025/07',18166666::bigint,13166666::bigint,70),
    ('crm-source-ct-001','2025/08',18166666::bigint,13166666::bigint,80),
    ('crm-source-ct-001','2025/09',18166666::bigint,13166666::bigint,90),
    ('crm-source-ct-001','2025/10',18166666::bigint,13166666::bigint,100),
    ('crm-source-ct-001','2025/11',18166666::bigint,13166666::bigint,110),
    ('crm-source-ct-001','2025/12',18166672::bigint,13166672::bigint,120),
    ('crm-source-ct-002','2025/03',30000000::bigint,22000000::bigint,10),
    ('crm-source-ct-002','2025/06',30000000::bigint,22000000::bigint,20),
    ('crm-source-ct-002','2025/09',30000000::bigint,22000000::bigint,30),
    ('crm-source-ct-002','2025/12',30000000::bigint,22000000::bigint,40),
    ('crm-source-ct-002','2026/02',30000000::bigint,22000000::bigint,50),
    ('crm-source-ct-003','2025/09',130000000::bigint,89000000::bigint,10),
    ('crm-source-ct-003','2026/01',130000000::bigint,89000000::bigint,20),
    ('crm-source-ct-003','2026/05',130000000::bigint,89000000::bigint,30),
    ('crm-source-ct-004','2026/01',14458333::bigint,0::bigint,10),
    ('crm-source-ct-004','2026/02',14458333::bigint,0::bigint,20),
    ('crm-source-ct-004','2026/03',14458333::bigint,0::bigint,30),
    ('crm-source-ct-004','2026/04',14458333::bigint,0::bigint,40),
    ('crm-source-ct-004','2026/05',14458333::bigint,0::bigint,50),
    ('crm-source-ct-004','2026/06',14458333::bigint,0::bigint,60),
    ('crm-source-ct-004','2026/07',14458333::bigint,0::bigint,70),
    ('crm-source-ct-004','2026/08',14458333::bigint,0::bigint,80),
    ('crm-source-ct-004','2026/09',14458333::bigint,0::bigint,90),
    ('crm-source-ct-004','2026/10',14458333::bigint,0::bigint,100),
    ('crm-source-ct-004','2026/11',14458333::bigint,0::bigint,110),
    ('crm-source-ct-004','2026/12',14458337::bigint,0::bigint,120),
    ('crm-source-ct-005','2026/06',150000000::bigint,111900000::bigint,10),
    ('crm-source-ct-005','2026/09',150000000::bigint,111900000::bigint,20),
    ('crm-source-ct-005','2026/12',150000000::bigint,111900000::bigint,30)
) as v(contract_code,billing_ym,revenue_amount,external_cost_amount,sort_order)
  on c.contract_code = v.contract_code
on conflict (contract_id, billing_ym) do update set
  revenue_amount = excluded.revenue_amount,
  external_cost_amount = excluded.external_cost_amount,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now(),
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

delete from crm.crm_contract_billing_actual_d
where contract_id in (
  select contract_id from crm.crm_contract_m
  where contract_code like 'crm-source-ct-%'
)
and last_source = 'SOURCE-DEMO';

insert into crm.crm_contract_billing_actual_d (
  contract_id, billing_ym, revenue_amount, external_cost_amount, sort_order,
  is_active, created_at, updated_at, last_source, last_activity
)
select c.contract_id, v.billing_ym, v.revenue_amount, v.external_cost_amount, v.sort_order,
       true, now(), now(), 'SOURCE-DEMO', 'crm.source.contract.seed'
from crm.crm_contract_m c
join (
  values
    ('crm-source-ct-001','2025/01',18166666::bigint,13166666::bigint,10),
    ('crm-source-ct-001','2025/02',18166666::bigint,13166666::bigint,20),
    ('crm-source-ct-001','2025/03',15000000::bigint,11000000::bigint,30),
    ('crm-source-ct-001','2025/04',18166666::bigint,13166666::bigint,40),
    ('crm-source-ct-005','2026/06',150000000::bigint,111900000::bigint,10)
) as v(contract_code,billing_ym,revenue_amount,external_cost_amount,sort_order)
  on c.contract_code = v.contract_code
on conflict (contract_id, billing_ym) do update set
  revenue_amount = excluded.revenue_amount,
  external_cost_amount = excluded.external_cost_amount,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now(),
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

commit;
