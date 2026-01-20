# Action Spec — A02 기회 진행 시작(opportunity in_progress)

## 1) 목적
RFP/제안서 작업 등 “실제 일이 발생”하는 시점부터 진행으로 전환

## 2) Actor
- 영업/AM(기회 오너)

## 3) 입력
- project_id
- (선택) 스테이터스 상세 갱신(goal, expected dates 등)

## 4) 상태 변경
- pr_project_m: stage_code = in_progress (status_code=opportunity 유지)

## 5) DB 영향
- UPDATE pr_project_m
- INSERT pr_project_h (U)

## 6) Validation
- 현재 status_code=opportunity
- 현재 stage_code in {waiting, in_progress} (idempotent 허용 여부 정책 결정)
