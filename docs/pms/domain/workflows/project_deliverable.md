# Workflow Spec — Deliverable Workflow

## 1. 범위
- pr_deliverable_m: 산출물 사전(표준 정의)
- pr_deliverable_group_m + pr_deliverable_group_item_r_m: 산출물 템플릿 그룹
- pr_project_deliverable_r_m: 프로젝트+status별 산출물 관리(업로드/상태)

## 2. 산출물 제출 상태(3단계)
- before_submit: 제출 전
- submitted: 제출(내부 제출/고객 전달 포함)
- confirmed: 확정(고객 검수/확정 완료 반영)

## 3. 주요 액션(요약)
- D01. 산출물 템플릿 적용(프로젝트+status 산출물 자동 생성)
- D02. 산출물 파일 업로드/교체(storage_object_key 갱신)
- D03. 산출물 상태 변경(before_submit→submitted→confirmed)
