-- =========================================================
-- Seed: 15_demo_issues.sql
-- Retired legacy Issue demo baseline
--
-- Launch baseline:
-- - Do not create active rows in pms.pr_issue_m.
-- - Seed open demo work into canonical control tables.
-- - Keep the original legacy Issue snapshots in pms.pr_legacy_issue_archive_m.
-- =========================================================

begin;

create temporary table _pms_retired_legacy_issue_seed (
  source_issue_id bigint primary key,
  project_id bigint not null,
  issue_code varchar(50) not null,
  issue_title text not null,
  description text,
  issue_type_code text not null,
  status_code text not null,
  priority_code text not null,
  reported_by_user_id bigint,
  assignee_user_id bigint,
  reported_at date not null,
  due_at date,
  resolved_at date,
  resolution text,
  sort_order integer not null
) on commit drop;

insert into _pms_retired_legacy_issue_seed (
  source_issue_id,
  project_id,
  issue_code,
  issue_title,
  description,
  issue_type_code,
  status_code,
  priority_code,
  reported_by_user_id,
  assignee_user_id,
  reported_at,
  due_at,
  resolved_at,
  resolution,
  sort_order
)
values
  (1, 900001, 'I1-001', 'ERP 인터페이스 규격 미확정', '레거시 ERP 시스템 인터페이스 규격이 아직 확정되지 않아 설계 진행 불가', 'impediment', 'open', 'high', 6, 2, '2026-03-05', '2026-03-15', null, null, 1),
  (2, 900001, 'I1-002', '데이터 마이그레이션 범위 변경', '고객사에서 마이그레이션 대상 테이블 20개 추가 요청', 'requirement_change', 'in_progress', 'normal', 4, 3, '2026-03-08', '2026-03-25', null, null, 2),
  (3, 900001, 'I1-003', '개발 서버 환경 구성 지연', '클라우드 인프라 프로비저닝 지연으로 개발 환경 1주 지연', 'impediment', 'resolved', 'high', 3, 5, '2026-02-20', '2026-03-01', null, null, 3),
  (4, 900002, 'I2-001', '접근성 기준 상향', 'WCAG 2.1 AA -> AAA 수준으로 접근성 기준 상향 요청', 'requirement_change', 'open', 'high', 4, 3, '2026-03-10', '2026-03-20', null, null, 1),
  (5, 900002, 'I2-002', 'IE11 호환성 이슈', '일부 고객사에서 IE11 사용 확인, 폴리필 대응 필요', 'bug', 'deferred', 'low', 3, 3, '2026-03-12', null, null, null, 2),
  (6, 900003, 'I3-001', '결제 모듈 연동 방식 미확정', '결제 PG사 선정 지연으로 연동 규격 확정 불가', 'impediment', 'open', 'critical', 2, 4, '2026-02-28', '2026-03-10', null, null, 1),
  (7, 900003, 'I3-002', '오프라인 모드 요구사항 추가', '현장 네트워크 불안정 지역 대응을 위한 오프라인 모드 추가 요청', 'requirement_change', 'open', 'normal', 6, 3, '2026-03-03', '2026-03-20', null, null, 2),
  (8, 900003, 'I3-003', '재고 조회 API 응답 지연', '기존 ERP 재고 조회 API가 3초 이상 소요, 성능 개선 필요', 'bug', 'in_progress', 'high', 3, 3, '2026-03-05', '2026-03-15', null, null, 3),
  (9, 900004, 'I4-001', '소스 시스템 접근 권한 미부여', 'MES 시스템 DB 접근 권한 요청 후 2주째 미승인', 'impediment', 'resolved', 'high', 3, 2, '2026-02-15', '2026-02-28', null, null, 1),
  (10, 900004, 'I4-002', 'Kafka 클러스터 장애', '개발 환경 Kafka 클러스터 OOM으로 일시 중단', 'bug', 'closed', 'critical', 3, 5, '2026-03-10', '2026-03-12', null, null, 2),
  (11, 900004, 'I4-003', '데이터 정합성 기준 정의 필요', '품질 검증 기준(오류율, 완전성, 일관성) 정의 미비', 'inquiry', 'open', 'normal', 6, 2, '2026-03-15', '2026-03-25', null, null, 3),
  (12, 900004, 'I4-004', '개인정보 마스킹 요구사항 추가', 'GDPR 대응을 위한 PII 데이터 마스킹 처리 추가', 'requirement_change', 'in_progress', 'high', 4, 3, '2026-03-18', '2026-04-05', null, null, 4),
  (13, 900005, 'I5-001', '센서 프로토콜 비호환', 'A라인 설비 센서가 Modbus TCP 미지원, 별도 게이트웨이 필요', 'impediment', 'in_progress', 'high', 5, 3, '2026-02-25', '2026-03-10', null, null, 1),
  (14, 900005, 'I5-002', '알람 임계값 기준 정의 지연', '현장 담당자와 임계값 합의 미완료', 'inquiry', 'open', 'normal', 2, 5, '2026-03-01', '2026-03-15', null, null, 2),
  (15, 900006, 'I6-001', '레거시 CRM 문자셋 이슈', '기존 CRM이 EUC-KR 인코딩 사용, UTF-8 변환 시 일부 문자 깨짐', 'bug', 'resolved', 'high', 3, 3, '2026-02-20', '2026-03-05', '2026-03-03', 'iconv 변환 스크립트로 해결, 깨진 3건은 수동 보정', 1),
  (16, 900006, 'I6-002', '고객 연락처 중복 데이터 처리', '동일 고객 다건 중복 존재, 정합 기준 필요', 'inquiry', 'in_progress', 'normal', 6, 2, '2026-03-05', '2026-03-20', null, null, 2),
  (17, 900006, 'I6-003', '이관 후 레포트 불일치 위험', '마이그레이션 후 기존 리포트와 수치 차이 발생 가능성', 'risk', 'open', 'high', 2, 3, '2026-03-10', '2026-04-01', null, null, 3);

-- Fresh launch seed keeps active work in canonical ProjectIssue.
insert into pms.pr_project_issue_m (
  project_id,
  issue_code,
  issue_title,
  description,
  issue_type_code,
  status_code,
  priority_code,
  reported_by_user_id,
  owner_user_id,
  reported_at,
  due_at,
  resolved_at,
  resolution,
  sort_order,
  memo,
  created_by,
  updated_by,
  created_at,
  updated_at,
  last_source,
  last_activity
)
select
  project_id,
  concat('PI-LEG-', source_issue_id)::varchar(50),
  issue_title,
  concat_ws(E'\n\n', description, concat('전환 원본: 기존 Issue ', issue_code)),
  issue_type_code,
  status_code,
  priority_code,
  reported_by_user_id,
  assignee_user_id,
  reported_at,
  due_at,
  resolved_at,
  resolution,
  sort_order,
  '기존 Issue seed baseline에서 정식 이슈로 전환',
  reported_by_user_id,
  assignee_user_id,
  current_timestamp,
  current_timestamp,
  'SEED',
  'demo_legacy_issue_canonical_seed'
from _pms_retired_legacy_issue_seed
where issue_type_code in ('bug', 'impediment', 'inquiry', 'improvement')
  and status_code not in ('resolved', 'closed')
on conflict (project_id, issue_code) do update
set issue_title = excluded.issue_title,
    description = excluded.description,
    issue_type_code = excluded.issue_type_code,
    status_code = excluded.status_code,
    priority_code = excluded.priority_code,
    reported_by_user_id = excluded.reported_by_user_id,
    owner_user_id = excluded.owner_user_id,
    reported_at = excluded.reported_at,
    due_at = excluded.due_at,
    resolved_at = excluded.resolved_at,
    resolution = excluded.resolution,
    sort_order = excluded.sort_order,
    memo = excluded.memo,
    updated_by = excluded.updated_by,
    updated_at = current_timestamp,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity
where pms.pr_project_issue_m.last_source = 'SEED'
   or pms.pr_project_issue_m.issue_code like 'PI-LEG-%';

-- Fresh launch seed keeps active risk work in canonical ProjectRisk.
insert into pms.pr_risk_m (
  project_id,
  risk_code,
  risk_title,
  description,
  status_code,
  impact_code,
  likelihood_code,
  response_plan,
  owner_user_id,
  due_at,
  sort_order,
  memo,
  created_by,
  updated_by,
  created_at,
  updated_at,
  last_source,
  last_activity
)
select
  project_id,
  concat('RK-LEG-', source_issue_id)::varchar(50),
  issue_title,
  concat_ws(E'\n\n', description, concat('전환 원본: 기존 Issue ', issue_code)),
  case when status_code = 'in_progress' then 'monitoring' else 'identified' end,
  case when priority_code in ('critical', 'high') then 'high' else 'medium' end,
  'medium',
  resolution,
  assignee_user_id,
  due_at,
  sort_order,
  '기존 Issue seed baseline에서 정식 리스크로 전환',
  reported_by_user_id,
  assignee_user_id,
  current_timestamp,
  current_timestamp,
  'SEED',
  'demo_legacy_issue_canonical_seed'
from _pms_retired_legacy_issue_seed
where issue_type_code = 'risk'
  and status_code not in ('resolved', 'closed')
on conflict (project_id, risk_code) do update
set risk_title = excluded.risk_title,
    description = excluded.description,
    status_code = excluded.status_code,
    impact_code = excluded.impact_code,
    likelihood_code = excluded.likelihood_code,
    response_plan = excluded.response_plan,
    owner_user_id = excluded.owner_user_id,
    due_at = excluded.due_at,
    sort_order = excluded.sort_order,
    memo = excluded.memo,
    updated_by = excluded.updated_by,
    updated_at = current_timestamp,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity
where pms.pr_risk_m.last_source = 'SEED'
   or pms.pr_risk_m.risk_code like 'RK-LEG-%';

-- Fresh launch seed keeps active change work in canonical ProjectChangeRequest.
insert into pms.pr_change_request_m (
  project_id,
  change_code,
  change_title,
  description,
  status_code,
  priority_code,
  requested_at,
  owner_user_id,
  sort_order,
  memo,
  created_by,
  updated_by,
  created_at,
  updated_at,
  last_source,
  last_activity
)
select
  project_id,
  concat('CHG-LEG-', source_issue_id)::varchar(50),
  issue_title,
  concat_ws(E'\n\n', description, concat('전환 원본: 기존 Issue ', issue_code)),
  case when status_code = 'in_progress' then 'reviewing' else 'requested' end,
  priority_code,
  reported_at,
  assignee_user_id,
  sort_order,
  '기존 Issue seed baseline에서 정식 변경요청으로 전환',
  reported_by_user_id,
  assignee_user_id,
  current_timestamp,
  current_timestamp,
  'SEED',
  'demo_legacy_issue_canonical_seed'
from _pms_retired_legacy_issue_seed
where issue_type_code = 'requirement_change'
  and status_code not in ('resolved', 'closed')
on conflict (project_id, change_code) do update
set change_title = excluded.change_title,
    description = excluded.description,
    status_code = excluded.status_code,
    priority_code = excluded.priority_code,
    requested_at = excluded.requested_at,
    owner_user_id = excluded.owner_user_id,
    sort_order = excluded.sort_order,
    memo = excluded.memo,
    updated_by = excluded.updated_by,
    updated_at = current_timestamp,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity
where pms.pr_change_request_m.last_source = 'SEED'
   or pms.pr_change_request_m.change_code like 'CHG-LEG-%';

-- Keep legacy source snapshots reviewable without re-opening the legacy table.
insert into pms.pr_legacy_issue_archive_m (
  source_issue_id,
  project_id,
  issue_code,
  issue_title,
  description,
  issue_type_code,
  status_code,
  priority_code,
  reported_by_user_id,
  assignee_user_id,
  reported_at,
  due_at,
  resolved_at,
  resolution,
  sort_order,
  source_is_active,
  archived_reason_code,
  archived_at,
  source_created_by,
  source_created_at,
  source_updated_by,
  source_updated_at,
  source_last_source,
  source_last_activity,
  memo,
  created_by,
  updated_by,
  created_at,
  updated_at,
  last_source,
  last_activity
)
select
  source_issue_id,
  project_id,
  issue_code,
  issue_title,
  description,
  issue_type_code,
  status_code,
  priority_code,
  reported_by_user_id,
  assignee_user_id,
  reported_at,
  due_at,
  resolved_at,
  resolution,
  sort_order,
  true,
  case when status_code in ('resolved', 'closed') then 'hidden_cleanup' else 'canonicalized_cleanup' end,
  current_timestamp,
  reported_by_user_id,
  current_timestamp,
  assignee_user_id,
  current_timestamp,
  'SEED',
  'demo_legacy_issue_retired_seed',
  '기존 Issue seed baseline 보존 스냅샷',
  reported_by_user_id,
  assignee_user_id,
  current_timestamp,
  current_timestamp,
  'SEED',
  'demo_legacy_issue_retired_seed'
from _pms_retired_legacy_issue_seed
on conflict (source_issue_id) do update
set project_id = excluded.project_id,
    issue_code = excluded.issue_code,
    issue_title = excluded.issue_title,
    description = excluded.description,
    issue_type_code = excluded.issue_type_code,
    status_code = excluded.status_code,
    priority_code = excluded.priority_code,
    reported_by_user_id = excluded.reported_by_user_id,
    assignee_user_id = excluded.assignee_user_id,
    reported_at = excluded.reported_at,
    due_at = excluded.due_at,
    resolved_at = excluded.resolved_at,
    resolution = excluded.resolution,
    sort_order = excluded.sort_order,
    source_is_active = excluded.source_is_active,
    archived_reason_code = excluded.archived_reason_code,
    source_updated_by = excluded.source_updated_by,
    source_updated_at = excluded.source_updated_at,
    source_last_source = excluded.source_last_source,
    source_last_activity = excluded.source_last_activity,
    memo = excluded.memo,
    updated_by = excluded.updated_by,
    updated_at = current_timestamp,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity;

-- If this seed is applied over an older database, retire the old seed-created
-- compatibility rows instead of leaving active cleanup debt behind.
update pms.pr_issue_m
set is_active = false,
    updated_at = current_timestamp,
    last_source = 'SEED',
    last_activity = 'demo_legacy_issue_retired_seed'
where issue_id in (select source_issue_id from _pms_retired_legacy_issue_seed)
  and coalesce(last_source, 'SEED') = 'SEED';

select setval(
  pg_get_serial_sequence('pms.pr_project_issue_m', 'project_issue_id'),
  greatest(
    (select coalesce(max(project_issue_id), 0) from pms.pr_project_issue_m),
    1
  )
);

select setval(
  pg_get_serial_sequence('pms.pr_risk_m', 'risk_id'),
  greatest(
    (select coalesce(max(risk_id), 0) from pms.pr_risk_m),
    1
  )
);

select setval(
  pg_get_serial_sequence('pms.pr_change_request_m', 'change_request_id'),
  greatest(
    (select coalesce(max(change_request_id), 0) from pms.pr_change_request_m),
    1
  )
);

select setval(
  pg_get_serial_sequence('pms.pr_legacy_issue_archive_m', 'archive_id'),
  greatest(
    (select coalesce(max(archive_id), 0) from pms.pr_legacy_issue_archive_m),
    1
  )
);

commit;
