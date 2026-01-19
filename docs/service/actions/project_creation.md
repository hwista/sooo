# Action Spec — A01 프로젝트(기회) 등록

## 1) 목적
영업/AM이 신규 기회를 시스템에 등록하여 SSOT에 “일을 모으는” 시작점 생성

## 2) Actor
- 영업, AM

## 3) 입력(필수/선택)
- 필수: project_name, project_source_code(request|proposal)
- 선택: customer_id, plant_id, system_instance_id
- 선택: current_owner_user_id(기본=등록자)

## 4) 상태 변경
- pr_project_m:
  - status_code=opportunity
  - stage_code=waiting
  - done_result_code=NULL
  - current_owner_user_id=등록자(또는 지정값)

## 5) DB 영향
- INSERT pr_project_m (1 row)
- INSERT pr_project_h (C 스냅샷 1 row)
- (권장) 프로젝트_스테이터스(pr_project_status_m): (project_id, opportunity) 상세 row 1개 생성
  - goal/owner/예상일정 등 기본값 세팅

## 6) Validation
- project_name non-empty
- project_source_code in {request, proposal}

## 7) 실패/에러
- 중복 등록 방지는 MVP에서는 강제하지 않되, 추후 customer+name+기간 유사도 경고 가능
