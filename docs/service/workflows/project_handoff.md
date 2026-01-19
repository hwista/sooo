# Workflow Spec — Project Lifecycle (Opportunity ↔ Execution)

## 1. 범위
- 대상 테이블
  - pr_project_m / pr_project_h
  - pr_project_status_m(or phase) / pr_project_status_h (너가 만든 프로젝트_스테이터스)
  - pr_project_close_condition_r_m / pr_project_close_condition_r_h
  - pr_project_deliverable_r_m / pr_project_deliverable_r_h
- 관련 코드(예시)
  - PROJECT_STATUS: opportunity, execution
  - PROJECT_STAGE: waiting, in_progress, done
  - PROJECT_SOURCE: request, proposal
  - PROJECT_DONE_RESULT: won, lost, hold

## 2. 핵심 원칙
1) Project는 단일 엔티티(통합)이며, 현재 상태는 `pr_project_m.status_code + stage_code`가 표현한다.  
2) 상태 전환 이벤트는 **추적성**을 위해 한 번에 뭉치지 않고 **필요 시 2회 업데이트**로 쪼개어 기록한다.
   - 예) opportunity done(won) → execution waiting 전환은 2개의 업데이트(2개의 히스토리 스냅샷)
3) 상세(목표/오너/일정/종료조건/산출물)는 status별 하위 테이블(프로젝트_스테이터스, 릴레이션)에서 관리한다.

## 3. 상태 머신(상태/단계)
- opportunity: waiting → in_progress → done(won|lost|hold)
- execution: waiting → in_progress → done

## 4. 주요 액션(요약)
- A01. 프로젝트(기회) 등록
- A02. 기회 진행 시작
- A03. 기회 종료 처리(won/lost/hold)
- A04. 계약 확정(기회→실행 전환: execution waiting)
- A05. 실행 착수(킥오프/PM 인수: execution in_progress)
- A06. 실행 종료(완료: execution done)
