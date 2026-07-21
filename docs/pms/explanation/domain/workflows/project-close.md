# Workflow Spec — Close Condition Workflow

## 구현 상태

- 상태: 🔄 부분 구현
- 최종 검증일: 2026-07-10
- 현재 기준:
  - 프로젝트 종료조건 목록/등록·수정/삭제, 체크/해제, 이벤트 연결, 산출물 필요 조건 검증, 카드형 체크리스트는 구현됨
  - 현재 단계 기본 템플릿 적용 API와 화면 버튼은 구현됨
  - 템플릿 적용은 그룹 마스터 우선, 없으면 상태별 기본 세트로 동작함
  - append/replace 적용 모드를 지원하며, replace 는 템플릿 밖 기존 활성 종료조건을 소프트 비활성화함
  - 종료조건 탭에서 저장된 템플릿 그룹을 선택 적용하고, 현재 목록과 산출물 필요 여부를 새 그룹 템플릿으로 저장하는 1차 UX가 구현됨
  - 전용 관리자 템플릿 화면에서 종료조건 그룹 편집, 초안·승인·보관, 버전 증가, 이력 조회·복구가 구현됨
  - 산출물 필요 종료조건은 `confirmed`/`approved`/`not_required` 완료 판정을 통과한 경우 체크 허용함
  - 종료조건별 1~5단계 승인선 저장과 지정 승인자 승인/반려가 구현됨. 모든 활성 단계가 승인되면 종료조건 완료 상태로 반영됨
  - 전사 결재 엔진과 DMS 파일 검토 연동은 후속


## 1. 범위
- pr_project_close_condition_r_m: 종료 조건 체크리스트(프로젝트+status별)
- pr_close_condition_group_m + pr_close_condition_group_item_r_m: 종료조건 템플릿 그룹

## 2. 핵심 규칙(Validation)
- requires_deliverable = true 인 종료 조건은
  - 현재 런타임 완료 판정(`confirmed`/`approved`/`not_required`)을 만족해야만 `is_checked=true` 허용
  - `before_submit` 호환 입력은 `not_submitted`로, `final` 호환 입력은 `confirmed`로 정규화

## 3. 주요 액션(요약)
- C01. 종료조건 템플릿 적용(프로젝트+status에 조건 자동 생성)
- C02. 종료조건 체크(검증 통과 시)
- C03. 종료조건 체크 해제(옵션)

## Changelog

| Date | Change |
|------|--------|
| 2026-07-10 | Add close-condition approval routes with project-member approvers, assigned-approver decisions, and checked-state application after final approval. |
| 2026-07-10 | Add append/replace apply mode to close-condition templates, including launch verification for soft-deactivation outside the selected group. |
| 2026-07-09 | Align close-condition deliverable guard with unified runtime completion vocabulary. |
| 2026-07-09 | Add close-condition template admin screen/API with draft, approval, archive, version, history, restore, and deliverable-required policy visibility. |
| 2026-07-09 | Add launch-facing close-condition template group lookup/save, selected group apply UX, and persisted deliverable-required policy. |
| 2026-07-09 | Update implementation status for close-condition CRUD/check guard/event linkage and default template application. |
| 2026-02-09 | Add changelog section. |
