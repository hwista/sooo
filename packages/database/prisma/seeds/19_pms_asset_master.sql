-- =========================================================
-- Seed: 19_pms_asset_master.sql
-- PMS execution asset master: Plant/Site, System Catalog,
-- System Instance, Integration
--
-- CRM owns opportunity/quote/contract/billing/revenue/cost ledgers.
-- This seed only creates PMS execution anchors and links demo projects.
-- =========================================================

begin;

insert into pms.pr_site_m (
  site_id, customer_id, site_code, site_name, site_type_code, region_code,
  address, timezone, operation_owner_name,
  is_active, created_at, updated_at, last_source, last_activity
)
values
  (2001, 1001, 'SITE-LS-ANYANG', 'LS일렉트릭 안양 사업장', 'plant', 'KR-GG', '경기도 안양시 동안구', 'Asia/Seoul', 'LS DX 운영팀', true, now(), now(), 'SEED', 'pms_asset_master'),
  (2002, 1002, 'SITE-KDB-YEOUIDO', '한국산업은행 본점', 'office', 'KR-SEL', '서울특별시 영등포구', 'Asia/Seoul', 'KDB IT기획부', true, now(), now(), 'SEED', 'pms_asset_master'),
  (2003, 1003, 'SITE-CJ-SEOUL', 'CJ올리브네트웍스 서울센터', 'office', 'KR-SEL', '서울특별시 중구', 'Asia/Seoul', 'CJ 디지털서비스팀', true, now(), now(), 'SEED', 'pms_asset_master'),
  (2004, 1004, 'SITE-POSCO-SONGDO', '포스코ICT 송도 데이터센터', 'data_center', 'KR-ICN', '인천광역시 연수구', 'Asia/Seoul', '포스코ICT 플랫폼팀', true, now(), now(), 'SEED', 'pms_asset_master'),
  (2005, 1005, 'SITE-MECAPION-ANYANG', 'LS메카피온 안양 공장', 'plant', 'KR-GG', '경기도 안양시 동안구', 'Asia/Seoul', 'LS메카피온 설비운영팀', true, now(), now(), 'SEED', 'pms_asset_master'),
  (2006, 1006, 'SITE-LGU-YONGSAN', 'LG유플러스 용산 사옥', 'office', 'KR-SEL', '서울특별시 용산구', 'Asia/Seoul', 'LGU+ IT전환팀', true, now(), now(), 'SEED', 'pms_asset_master')
on conflict (site_id) do update
set
  customer_id = excluded.customer_id,
  site_code = excluded.site_code,
  site_name = excluded.site_name,
  site_type_code = excluded.site_type_code,
  region_code = excluded.region_code,
  address = excluded.address,
  timezone = excluded.timezone,
  operation_owner_name = excluded.operation_owner_name,
  is_active = excluded.is_active,
  updated_at = excluded.updated_at,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

select setval(
  pg_get_serial_sequence('pms.pr_site_m', 'site_id'),
  greatest((select coalesce(max(site_id), 0) from pms.pr_site_m), 2006)
);

insert into pms.pr_system_catalog_m (
  system_catalog_id, parent_system_catalog_id, catalog_code, catalog_name,
  category_code, vendor_name, description,
  is_active, created_at, updated_at, last_source, last_activity
)
values
  (3001, null, 'SYS-ERP', 'ERP', 'business_core', null, '전사 기준정보·구매·회계·영업 실행 시스템', true, now(), now(), 'SEED', 'pms_asset_master'),
  (3002, null, 'SYS-MES', 'MES', 'manufacturing', null, '제조 실행과 생산 실적 수집 시스템', true, now(), now(), 'SEED', 'pms_asset_master'),
  (3003, null, 'SYS-PORTAL', '통합 포털', 'workplace', null, '내부/외부 사용자가 진입하는 업무 포털', true, now(), now(), 'SEED', 'pms_asset_master'),
  (3004, null, 'SYS-MOBILE-ORDER', '모바일 오더', 'customer_channel', null, '모바일 주문과 승인 흐름을 처리하는 채널 시스템', true, now(), now(), 'SEED', 'pms_asset_master'),
  (3005, null, 'SYS-DATA-LAKE', '데이터 레이크', 'data_platform', null, '운영 데이터 수집·정제·분석 기반', true, now(), now(), 'SEED', 'pms_asset_master'),
  (3006, null, 'SYS-FACILITY-MON', '설비 모니터링', 'operations', null, '현장 설비 상태와 알람을 관제하는 시스템', true, now(), now(), 'SEED', 'pms_asset_master'),
  (3007, null, 'SYS-LEGACY-CRM', '레거시 고객관리', 'migration_source', null, '고객 데이터 전환 대상 레거시 시스템', true, now(), now(), 'SEED', 'pms_asset_master')
on conflict (system_catalog_id) do update
set
  parent_system_catalog_id = excluded.parent_system_catalog_id,
  catalog_code = excluded.catalog_code,
  catalog_name = excluded.catalog_name,
  category_code = excluded.category_code,
  vendor_name = excluded.vendor_name,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = excluded.updated_at,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

select setval(
  pg_get_serial_sequence('pms.pr_system_catalog_m', 'system_catalog_id'),
  greatest((select coalesce(max(system_catalog_id), 0) from pms.pr_system_catalog_m), 3007)
);

insert into pms.pr_system_instance_m (
  system_instance_id, customer_id, site_id, system_catalog_id,
  instance_code, instance_name, environment_code, operation_owner_type_code,
  operation_owner_name, lifecycle_status_code,
  is_active, created_at, updated_at, last_source, last_activity
)
values
  (4001, 1001, 2001, 3001, 'INST-LS-ERP-PRD', 'LS일렉트릭 ERP 운영', 'prod', 'customer', 'LS DX 운영팀', 'active', true, now(), now(), 'SEED', 'pms_asset_master'),
  (4002, 1001, 2001, 3002, 'INST-LS-MES-PRD', 'LS일렉트릭 MES 운영', 'prod', 'customer', 'LS 제조IT팀', 'active', true, now(), now(), 'SEED', 'pms_asset_master'),
  (4003, 1002, 2002, 3003, 'INST-KDB-PORTAL-PRD', '한국산업은행 통합 포털', 'prod', 'customer', 'KDB IT기획부', 'active', true, now(), now(), 'SEED', 'pms_asset_master'),
  (4004, 1003, 2003, 3004, 'INST-CJ-MOBILE-ORDER', 'CJ 모바일 오더', 'prod', 'customer', 'CJ 디지털서비스팀', 'active', true, now(), now(), 'SEED', 'pms_asset_master'),
  (4008, 1003, 2003, 3001, 'INST-CJ-ERP-PRD', 'CJ ERP 운영', 'prod', 'customer', 'CJ 디지털서비스팀', 'active', true, now(), now(), 'SEED', 'pms_asset_master'),
  (4005, 1004, 2004, 3005, 'INST-POSCO-DATALAKE', '포스코ICT 데이터 레이크', 'prod', 'partner', '포스코ICT 플랫폼팀', 'active', true, now(), now(), 'SEED', 'pms_asset_master'),
  (4006, 1005, 2005, 3006, 'INST-MECAPION-MON', 'LS메카피온 설비 모니터링', 'prod', 'customer', 'LS메카피온 설비운영팀', 'active', true, now(), now(), 'SEED', 'pms_asset_master'),
  (4007, 1006, 2006, 3007, 'INST-LGU-LEGACY-CRM', 'LG유플러스 레거시 고객관리', 'prod', 'customer', 'LGU+ IT전환팀', 'active', true, now(), now(), 'SEED', 'pms_asset_master')
on conflict (system_instance_id) do update
set
  customer_id = excluded.customer_id,
  site_id = excluded.site_id,
  system_catalog_id = excluded.system_catalog_id,
  instance_code = excluded.instance_code,
  instance_name = excluded.instance_name,
  environment_code = excluded.environment_code,
  operation_owner_type_code = excluded.operation_owner_type_code,
  operation_owner_name = excluded.operation_owner_name,
  lifecycle_status_code = excluded.lifecycle_status_code,
  is_active = excluded.is_active,
  updated_at = excluded.updated_at,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

select setval(
  pg_get_serial_sequence('pms.pr_system_instance_m', 'system_instance_id'),
  greatest((select coalesce(max(system_instance_id), 0) from pms.pr_system_instance_m), 4008)
);

insert into pms.pr_integration_m (
  integration_id, integration_code, integration_name,
  source_system_instance_id, target_system_instance_id,
  direction_code, interface_type_code, status_code, description,
  is_active, created_at, updated_at, last_source, last_activity
)
values
  (5001, 'INT-LS-ERP-MES-MASTER', 'LS ERP-MES 기준정보 연계', 4001, 4002, 'source_to_target', 'api', 'active', '품목·BOM·작업지시 기준정보 연계', true, now(), now(), 'SEED', 'pms_asset_master'),
  (5002, 'INT-LS-MES-ERP-RESULT', 'LS MES-ERP 생산실적 연계', 4002, 4001, 'source_to_target', 'batch', 'active', '생산실적·불량·재공 데이터를 ERP로 전달', true, now(), now(), 'SEED', 'pms_asset_master'),
  (5003, 'INT-CJ-ORDER-ERP', 'CJ 모바일 오더-ERP 주문 연계', 4004, 4008, 'source_to_target', 'api', 'planned', '모바일 주문 데이터를 ERP 수주 흐름으로 전달하는 샘플 인터페이스', true, now(), now(), 'SEED', 'pms_asset_master')
on conflict (integration_id) do update
set
  integration_code = excluded.integration_code,
  integration_name = excluded.integration_name,
  source_system_instance_id = excluded.source_system_instance_id,
  target_system_instance_id = excluded.target_system_instance_id,
  direction_code = excluded.direction_code,
  interface_type_code = excluded.interface_type_code,
  status_code = excluded.status_code,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = excluded.updated_at,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

select setval(
  pg_get_serial_sequence('pms.pr_integration_m', 'integration_id'),
  greatest((select coalesce(max(integration_id), 0) from pms.pr_integration_m), 5003)
);

update pms.pr_project_m
set
  plant_id = case project_id
    when 900001 then 2001
    when 900002 then 2002
    when 900003 then 2003
    when 900004 then 2004
    when 900005 then 2005
    when 900006 then 2006
    else plant_id
  end,
  system_instance_id = case project_id
    when 900001 then 4001
    when 900002 then 4003
    when 900003 then 4004
    when 900004 then 4005
    when 900005 then 4006
    when 900006 then 4007
    else system_instance_id
  end,
  updated_at = now(),
  last_source = 'SEED',
  last_activity = 'pms_asset_master'
where project_id in (900001, 900002, 900003, 900004, 900005, 900006);

commit;
