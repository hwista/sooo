# Action Spec — D01 산출물 템플릿 적용(프로젝트+status)

## 구현 상태

- 상태: 🔄 부분 구현
- 최종 검증일: 2026-07-10
- 현재 기준:
  - 프로젝트 현재 단계 산출물 기본 템플릿 적용 API와 화면 버튼은 구현됨
  - 산출물 템플릿 그룹 목록 조회, 현재 목록 기반 그룹 저장, 저장된 그룹 선택 적용 1차가 구현됨
  - 서버는 산출물 그룹 마스터가 있으면 우선 사용하고, 없으면 상태별 기본 산출물 세트를 적용함
  - 적용 모드는 append/replace 를 지원하며, replace 는 템플릿 밖 기존 활성 산출물을 소프트 비활성화함
  - 저장 시 같은 그룹의 빠진 항목은 비활성화하고 현재 화면 목록을 활성 항목 세트로 저장함
  - 전용 관리자 템플릿 화면/API에서 산출물 그룹 초안·승인·보관, 버전 증가, 이력 조회·복구 운영이 구현됨
  - 프로젝트 산출물별 1~5단계 승인선 저장과 지정 승인자 승인/반려가 구현됨. 전사 결재 엔진과 DMS 파일 검토 연동은 후속


## 1) 목적
템플릿 그룹 선택으로 프로젝트 산출물 목록 자동 생성

## 2) Actor
- PM(실행), 영업/AM(요청/제안) — 정책 결정

## 3) 입력
- project_id
- status_code(request|proposal|execution|transition)
- deliverable_group_code

## 4) DB 영향
- pr_deliverable_group_item_r_m에서 (group_code=입력값) 산출물 목록 조회
- 각 deliverable_code를 pr_project_deliverable_r_m에 UPSERT
  - 현재 런타임 기본 submission_status_code=`not_submitted`
  - append: 기존 활성 항목은 유지하고, 비활성 항목은 복구하며, 없는 항목만 신규 생성
  - replace: 템플릿에 없는 기존 활성 항목은 is_active=false 로 소프트 비활성화

## 5) Validation
- deliverable_code는 pr_deliverable_m에 존재해야 함(논리 검증)

## Changelog

| Date | Change |
|------|--------|
| 2026-07-10 | Add project-member based deliverable approval route setup and assigned-approver decision flow. Enterprise approval-engine and DMS file-review integration remain future scope. |
| 2026-07-10 | Add append/replace apply policy for deliverable templates and verify soft-deactivation of template-excluded active rows. |
| 2026-07-09 | Add deliverable template admin workflow for approval status, versioning, history lookup/restore, and archive. |
| 2026-07-09 | Add template group lookup/save and selected group apply API/UI. Closeout approval routes were added in the later 2026-07-10 entry. |
| 2026-07-09 | Add launch-facing default template apply API/UI and clarify remaining template-management scope. |
| 2026-02-09 | Add changelog section. |
