-- =========================================================
-- Seed: 21_demo_project_statuses.sql
-- PMS demo project status detail baseline
-- =========================================================

begin;

insert into pms.pr_project_status_m (
  project_id,
  status_code,
  status_goal,
  status_owner_user_id,
  expected_start_at,
  expected_end_at,
  actual_start_at,
  actual_end_at,
  memo,
  is_active,
  created_by,
  updated_at,
  last_source,
  last_activity
)
values
  (
    900001,
    'request',
    '실행 전 접수 또는 CRM 인계 정보를 확인합니다.',
    3,
    '2026-02-01',
    '2026-02-14',
    null,
    null,
    '데모 요청 상태 기준선: ERP 고도화 접수 검토',
    true,
    3,
    current_timestamp,
    'SEED',
    'demo_project_status_baseline'
  ),
  (
    900002,
    'request',
    '실행 전 접수 또는 CRM 인계 정보를 확인합니다.',
    2,
    '2026-02-03',
    '2026-02-18',
    '2026-02-03',
    null,
    '데모 요청 상태 기준선: 포털 리뉴얼 요구사항 검토 진행',
    true,
    2,
    current_timestamp,
    'SEED',
    'demo_project_status_baseline'
  ),
  (
    900003,
    'request',
    '실행 전 접수 또는 CRM 인계 정보를 확인합니다.',
    5,
    '2026-02-04',
    '2026-02-19',
    null,
    null,
    '데모 요청 상태 기준선: 모바일 오더 요청 접수',
    true,
    5,
    current_timestamp,
    'SEED',
    'demo_project_status_baseline'
  ),
  (
    900004,
    'request',
    '실행 전 접수 또는 CRM 인계 정보를 확인합니다.',
    2,
    '2026-02-05',
    '2026-02-20',
    '2026-02-05',
    '2026-02-20',
    '데모 요청 상태 기준선: 데이터 레이크 요청 검토 완료',
    true,
    2,
    current_timestamp,
    'SEED',
    'demo_project_status_baseline'
  ),
  (
    900005,
    'request',
    '실행 전 접수 또는 CRM 인계 정보를 확인합니다.',
    5,
    '2026-02-06',
    '2026-02-21',
    '2026-02-06',
    null,
    '데모 요청 상태 기준선: 현장 설비 모니터링 범위 검토 진행',
    true,
    5,
    current_timestamp,
    'SEED',
    'demo_project_status_baseline'
  ),
  (
    900006,
    'request',
    '실행 전 접수 또는 CRM 인계 정보를 확인합니다.',
    4,
    '2026-02-07',
    '2026-02-22',
    null,
    null,
    '데모 요청 상태 기준선: CRM 마이그레이션 접수 검토',
    true,
    4,
    current_timestamp,
    'SEED',
    'demo_project_status_baseline'
  )
on conflict (project_id, status_code) do update
set status_goal = excluded.status_goal,
    status_owner_user_id = excluded.status_owner_user_id,
    expected_start_at = excluded.expected_start_at,
    expected_end_at = excluded.expected_end_at,
    actual_start_at = excluded.actual_start_at,
    actual_end_at = excluded.actual_end_at,
    memo = excluded.memo,
    is_active = excluded.is_active,
    updated_at = current_timestamp,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity
where pms.pr_project_status_m.last_source = 'SEED';

commit;
