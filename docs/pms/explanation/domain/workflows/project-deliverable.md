# Workflow Spec — Deliverable Workflow

## 구현 상태

- 상태: 🔄 부분 구현
- 최종 검증일: 2026-07-10
- 현재 기준:
  - 프로젝트 산출물 목록/등록·수정/삭제, 제출 상태 변경, 이벤트 연결, 모바일 카드 목록은 구현됨
  - 현재 단계 기본 템플릿 적용 API와 화면 버튼은 구현됨
  - 템플릿 적용은 그룹 마스터 우선, 없으면 상태별 기본 세트로 동작함
  - append/replace 적용 모드를 지원하며, replace 는 템플릿 밖 기존 활성 산출물을 소프트 비활성화함
  - 산출물 탭에서 저장된 템플릿 그룹을 선택 적용하고, 현재 목록을 새 그룹 템플릿으로 저장하는 1차 UX가 구현됨
  - 전용 관리자 템플릿 화면에서 산출물 그룹 편집, 초안·승인·보관, 버전 증가, 이력 조회·복구가 구현됨
  - 제출 상태 어휘는 `confirmed`/`approved`/`not_required`를 완료로 인정하고 `before_submit`/`final` 입력을 표준 상태로 정규화함
  - 파일 업로드 스토리지 미구현
  - 산출물별 1~5단계 승인선 저장과 지정 승인자 승인/반려가 구현됨. 모든 활성 단계가 승인되면 산출물 승인 상태로 반영됨
  - 전사 결재 엔진과 DMS 파일 검토 연동은 후속


## 1. 범위
- pr_deliverable_m: 산출물 사전(표준 정의)
- pr_deliverable_group_m + pr_deliverable_group_item_r_m: 산출물 템플릿 그룹
- pr_project_deliverable_r_m: 프로젝트+status별 산출물 관리(업로드/상태)

## 2. 산출물 제출 상태
- not_submitted: 제출 전
- submitted: 제출(내부 제출/고객 전달 포함)
- confirmed: 확정(고객 검수/확정 완료 반영)
- approved: 승인 완료
- not_required: 산출물 면제
- rejected: 반려
- before_submit: 호환 입력. 저장 시 not_submitted로 정규화
- final: 호환 입력. 저장 시 confirmed로 정규화

## 3. 주요 액션(요약)
- D01. 산출물 템플릿 적용(프로젝트+status 산출물 자동 생성)
- D02. 산출물 파일 업로드/교체(storage_object_key 갱신)
- D03. 산출물 상태 변경(not_submitted→submitted→confirmed/approved/not_required)

## Changelog

| Date | Change |
|------|--------|
| 2026-07-10 | Add deliverable approval routes with project-member approvers, assigned-approver decisions, and approved submission status application after final approval. |
| 2026-07-10 | Add append/replace apply mode to deliverable templates, including launch verification for soft-deactivation outside the selected group. |
| 2026-07-09 | Align deliverable status workflow with runtime completion vocabulary and compatibility input normalization. |
| 2026-07-09 | Add deliverable template admin screen/API with draft, approval, archive, version, history, and restore workflow. |
| 2026-07-09 | Add launch-facing deliverable template group lookup/save and selected group apply UX. |
| 2026-07-09 | Update implementation status for deliverable CRUD/mobile/event linkage and default template application. |
| 2026-02-09 | Add changelog section. |
