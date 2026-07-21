# Action Spec — C01 종료조건 템플릿 적용(프로젝트+status)

## 구현 상태

- 상태: 🔄 부분 구현
- 최종 검증일: 2026-07-10
- 현재 기준:
  - 프로젝트 현재 단계 종료조건 기본 템플릿 적용 API와 화면 버튼은 구현됨
  - 종료조건 템플릿 그룹 목록 조회, 현재 목록 기반 그룹 저장, 저장된 그룹 선택 적용 1차가 구현됨
  - 서버는 종료조건 그룹 마스터가 있으면 우선 사용하고, 없으면 상태별 기본 종료조건 세트를 적용함
  - 적용 모드는 append/replace 를 지원하며, replace 는 템플릿 밖 기존 활성 종료조건을 소프트 비활성화함
  - 그룹 항목은 산출물 필요 여부를 정식 필드로 저장하며, 기존 `DELIVERABLE_SUBMITTED` 조건은 호환 보정으로도 산출물 필요 조건으로 해석함
  - 저장 시 같은 그룹의 빠진 항목은 비활성화하고 현재 화면 목록을 활성 항목 세트로 저장함
  - 전용 관리자 템플릿 화면/API에서 종료조건 그룹 초안·승인·보관, 버전 증가, 이력 조회·복구 운영이 구현됨
  - 프로젝트 종료조건별 1~5단계 승인선 저장과 지정 승인자 승인/반려가 구현됨. 전사 결재 엔진과 DMS 파일 검토 연동은 후속


## 1) 목적
템플릿 그룹 선택으로 종료조건 체크리스트 자동 생성

## 2) Actor
- PM(실행), 영업/AM(요청/제안) — 정책 결정

## 3) 입력
- project_id
- status_code(request|proposal|execution|transition)
- close_condition_group_code (템플릿 그룹 코드)

## 4) DB 영향(권장 로직)
- pr_close_condition_group_item_r_m에서 (group_code=입력값) 목록 조회
- 각 condition_code를 pr_project_close_condition_r_m에 UPSERT
  - 기본: is_checked=false, requires_deliverable=템플릿/정책값
  - append: 기존 활성 항목은 유지하고, 비활성 항목은 복구하며, 없는 항목만 신규 생성
  - replace: 템플릿에 없는 기존 활성 항목은 is_active=false 로 소프트 비활성화

## 5) Validation
- 해당 status_code row가 존재해야 함(프로젝트_스테이터스 row)
- 기존 생성된 조건이 있을 경우 append/replace 적용 모드를 명시해 운영

## Changelog

| Date | Change |
|------|--------|
| 2026-07-10 | Add project-member based close-condition approval route setup and assigned-approver decision flow. Enterprise approval-engine and DMS file-review integration remain future scope. |
| 2026-07-10 | Add append/replace apply policy for close-condition templates and verify soft-deactivation of template-excluded active rows. |
| 2026-07-09 | Add close-condition template admin workflow for approval status, versioning, history lookup/restore, archive, and deliverable-required policy visibility. |
| 2026-07-09 | Add close-condition template group lookup/save, selected group apply, and persisted deliverable-required policy. Closeout approval routes were added in the later 2026-07-10 entry. |
| 2026-07-09 | Add launch-facing default template apply API/UI and clarify remaining template-management scope. |
| 2026-02-09 | Add changelog section. |
