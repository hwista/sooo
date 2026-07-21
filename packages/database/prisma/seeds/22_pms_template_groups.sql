-- =========================================================
-- PMS deliverable / close-condition template groups
-- =========================================================

INSERT INTO pms.pr_deliverable_m (
  deliverable_code,
  deliverable_name,
  description,
  sort_order,
  is_active,
  created_at,
  updated_at,
  last_source
) VALUES
  ('DLV-REQ-001', '요구사항 정의서', '고객 요구사항을 정리한 문서', 1, true, now(), now(), 'SEED'),
  ('DLV-REQ-002', '요청 검토 보고서', '요청 단계 검토 결과 보고서', 2, true, now(), now(), 'SEED'),
  ('DLV-PRO-001', '제안서', '고객 제안 문서', 1, true, now(), now(), 'SEED'),
  ('DLV-PRO-002', '견적서', '견적 금액 및 상세 내역서', 2, true, now(), now(), 'SEED'),
  ('DLV-PRO-003', '프로젝트 계획서', '프로젝트 수행 계획 문서', 3, true, now(), now(), 'SEED'),
  ('DLV-EXE-001', '설계서', '시스템/화면 설계 문서', 1, true, now(), now(), 'SEED'),
  ('DLV-EXE-002', '테스트 결과 보고서', '테스트 수행 및 결과 보고서', 2, true, now(), now(), 'SEED'),
  ('DLV-EXE-003', '사용자 매뉴얼', '최종 사용자 가이드 문서', 3, true, now(), now(), 'SEED'),
  ('DLV-TRN-001', '인수인계서', '운영 전환 인수인계 문서', 1, true, now(), now(), 'SEED'),
  ('DLV-TRN-002', '운영 가이드', '시스템 운영/유지보수 가이드', 2, true, now(), now(), 'SEED')
ON CONFLICT (deliverable_code) DO UPDATE SET
  deliverable_name = EXCLUDED.deliverable_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now(),
  last_source = EXCLUDED.last_source;

INSERT INTO pms.pr_deliverable_group_m (
  group_code,
  group_name,
  description,
  sort_order,
  approval_status_code,
  version_no,
  approved_at,
  is_active,
  created_at,
  updated_at,
  last_source
) VALUES
  ('request-default', '요청 기본 산출물', '요청 단계 기본 산출물 템플릿', 10, 'approved', 1, now(), true, now(), now(), 'SEED'),
  ('proposal-default', '제안 기본 산출물', '제안 단계 기본 산출물 템플릿', 20, 'approved', 1, now(), true, now(), now(), 'SEED'),
  ('execution-default', '수행 기본 산출물', '수행 단계 기본 산출물 템플릿', 30, 'approved', 1, now(), true, now(), now(), 'SEED'),
  ('transition-default', '전환 기본 산출물', '전환 단계 기본 산출물 템플릿', 40, 'approved', 1, now(), true, now(), now(), 'SEED')
ON CONFLICT (group_code) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  approval_status_code = EXCLUDED.approval_status_code,
  approved_at = COALESCE(pr_deliverable_group_m.approved_at, EXCLUDED.approved_at),
  is_active = true,
  updated_at = now(),
  last_source = EXCLUDED.last_source;

INSERT INTO pms.pr_deliverable_group_item_r_m (
  group_code,
  deliverable_code,
  sort_order,
  is_active,
  created_at,
  updated_at,
  last_source
) VALUES
  ('request-default', 'DLV-REQ-001', 1, true, now(), now(), 'SEED'),
  ('request-default', 'DLV-REQ-002', 2, true, now(), now(), 'SEED'),
  ('proposal-default', 'DLV-PRO-001', 1, true, now(), now(), 'SEED'),
  ('proposal-default', 'DLV-PRO-002', 2, true, now(), now(), 'SEED'),
  ('proposal-default', 'DLV-PRO-003', 3, true, now(), now(), 'SEED'),
  ('execution-default', 'DLV-EXE-001', 1, true, now(), now(), 'SEED'),
  ('execution-default', 'DLV-EXE-002', 2, true, now(), now(), 'SEED'),
  ('execution-default', 'DLV-EXE-003', 3, true, now(), now(), 'SEED'),
  ('transition-default', 'DLV-TRN-001', 1, true, now(), now(), 'SEED'),
  ('transition-default', 'DLV-TRN-002', 2, true, now(), now(), 'SEED')
ON CONFLICT (group_code, deliverable_code) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now(),
  last_source = EXCLUDED.last_source;

INSERT INTO pms.pr_close_condition_group_m (
  group_code,
  group_name,
  description,
  sort_order,
  approval_status_code,
  version_no,
  approved_at,
  is_active,
  created_at,
  updated_at,
  last_source
) VALUES
  ('request-default', '요청 기본 종료조건', '요청 단계 기본 종료조건 템플릿', 10, 'approved', 1, now(), true, now(), now(), 'SEED'),
  ('proposal-default', '제안 기본 종료조건', '제안 단계 기본 종료조건 템플릿', 20, 'approved', 1, now(), true, now(), now(), 'SEED'),
  ('execution-default', '수행 기본 종료조건', '수행 단계 기본 종료조건 템플릿', 30, 'approved', 1, now(), true, now(), now(), 'SEED'),
  ('transition-default', '전환 기본 종료조건', '전환 단계 기본 종료조건 템플릿', 40, 'approved', 1, now(), true, now(), now(), 'SEED')
ON CONFLICT (group_code) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  approval_status_code = EXCLUDED.approval_status_code,
  approved_at = COALESCE(pr_close_condition_group_m.approved_at, EXCLUDED.approved_at),
  is_active = true,
  updated_at = now(),
  last_source = EXCLUDED.last_source;

INSERT INTO pms.pr_close_condition_group_item_r_m (
  group_code,
  condition_code,
  requires_deliverable,
  sort_order,
  memo,
  is_active,
  created_at,
  updated_at,
  last_source
) VALUES
  ('request-default', 'DELIVERABLE_SUBMITTED', true, 1, '필요 산출물 제출 상태 확인', true, now(), now(), 'SEED'),
  ('request-default', 'CUSTOMER_ACCEPTANCE_SIGNED', false, 2, '고객 검수 또는 요청 접수 확인', true, now(), now(), 'SEED'),
  ('proposal-default', 'DELIVERABLE_SUBMITTED', true, 1, '제안서와 견적서 제출 상태 확인', true, now(), now(), 'SEED'),
  ('proposal-default', 'CUSTOMER_ACCEPTANCE_SIGNED', false, 2, '고객 제안 수락 또는 계약 전환 확인', true, now(), now(), 'SEED'),
  ('execution-default', 'DELIVERABLE_SUBMITTED', true, 1, '수행 산출물 승인 상태 확인', true, now(), now(), 'SEED'),
  ('execution-default', 'FINAL_REPORT_DONE', false, 2, '종료 보고 및 최종 결과 정리', true, now(), now(), 'SEED'),
  ('transition-default', 'DELIVERABLE_SUBMITTED', true, 1, '전환 산출물 승인 상태 확인', true, now(), now(), 'SEED'),
  ('transition-default', 'HANDOVER_COMPLETED', false, 2, '운영 또는 차기 담당자 인수인계 확인', true, now(), now(), 'SEED')
ON CONFLICT (group_code, condition_code) DO UPDATE SET
  requires_deliverable = EXCLUDED.requires_deliverable,
  sort_order = EXCLUDED.sort_order,
  memo = EXCLUDED.memo,
  is_active = true,
  updated_at = now(),
  last_source = EXCLUDED.last_source;
