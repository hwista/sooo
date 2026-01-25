# Action Spec — H03 핸드오프 완료

## 구현 상태

- 상태: 미구현
- 현재 기준:
  - 관련 API/화면/서비스 미구현으로 문서가 스펙 상태입니다.


## 1) 목적
인계 완료 처리 + 필요 시 오너 변경/상태 전환 연계

## 2) Actor
- handoff_user_id(수신자)

## 3) 입력
- project_id
- (선택) 오너 변경 여부/변경 대상(보통 수신자=오너)

## 4) 상태 변경
- pr_project_m.handoff_stage_code=done
- (정책) current_owner_user_id를 수신자로 변경할 수 있음

## 5) DB 영향
- UPDATE pr_project_m (+ 히스토리)

## 6) Validation
- handoff_stage_code in {waiting, in_progress} (정책)
