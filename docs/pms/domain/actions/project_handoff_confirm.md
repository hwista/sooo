# Action Spec — H02 핸드오프 수락/착수

## 구현 상태

- 상태: 미구현
- 현재 기준:
  - 관련 API/화면/서비스 미구현으로 문서가 스펙 상태입니다.


## 1) 목적
수신자가 인계를 수락하여 진행 단계로 전환

## 2) Actor
- handoff_user_id(수신자)

## 3) 입력
- project_id

## 4) 상태 변경
- pr_project_m.handoff_stage_code=in_progress

## 5) DB 영향
- UPDATE pr_project_m (+ 히스토리)

## 6) Validation
- 현재 handoff_stage_code=waiting
- 요청자가 아닌 수신자만 수행 가능
