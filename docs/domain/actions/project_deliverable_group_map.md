# Action Spec — D01 산출물 템플릿 적용(프로젝트+status)

## 1) 목적
템플릿 그룹 선택으로 프로젝트 산출물 목록 자동 생성

## 2) Actor
- PM(실행), 영업/AM(기회) — 정책 결정

## 3) 입력
- project_id
- status_code(opportunity|execution)
- deliverable_group_code

## 4) DB 영향
- pr_deliverable_group_item_r_m에서 (group_code=입력값) 산출물 목록 조회
- 각 deliverable_code를 pr_project_deliverable_r_m에 UPSERT
  - 기본 submission_status_code=before_submit

## 5) Validation
- deliverable_code는 pr_deliverable_m에 존재해야 함(논리 검증)
