# Table Spec — pr_project_m / pr_project_h (Unified Project)

## 1. Purpose
Opportunity(계약 전 기회)와 Execution(계약 후 실행)을 **단일 Project 엔티티**에서 관리한다.  
현재 흐름은 `status_code` + `stage_code`로 표현하고, 기회 종료 결과는 `done_result_code`로 구분한다.  
역할 간 인계는 별도 트랙(`handoff_*`)으로 관리한다.  
Opportunity/Execution별 상세(목표/오너/일정/종료조건)는 하위 테이블(`pr_project_phase_*`)로 분리한다.

---

## 2. Tables
- Master: `pr_project_m`
- History: `pr_project_h`

---

## 3. Master Table — pr_project_m

### 3.1 Primary Key
- `project_id` (bigserial)

### 3.2 Columns

#### Core
- `project_name` (text, required) — 프로젝트명(표시용)

#### Workflow Codes (logical FK by varchar)
- `status_code` (varchar(30), required)
  - values: `opportunity`, `execution`
- `stage_code` (varchar(30), required)
  - values: `waiting`, `in_progress`, `done`
- `project_source_code` (varchar(30), required)
  - values: `request`, `proposal`
- `done_result_code` (varchar(30), optional)
  - values: `won`, `lost`, `hold`
  - 의미 규칙: `status_code=opportunity AND stage_code=done`일 때만 사용

#### Current Owner
- `current_owner_user_id` (bigint, optional)
  - 현재 오너/책임자(리스트/리포트 편의용)
  - 내부 사용자 ID(논리 FK)

#### Handoff Track (current/last)
- `handoff_type_code` (varchar(50), optional)
  - 예: `PRE_TO_PM`, `PRE_TO_CONTRACT_OWNER`, `EXEC_TO_CONTRACT_OWNER`, `EXEC_TO_SM`
- `handoff_stage_code` (varchar(30), optional)
  - values: `waiting`, `in_progress`, `done`
- `handoff_user_id` (bigint, optional)
  - 인계 대상자(받는 사람) 내부 사용자 ID(논리 FK)

#### Optional Links (MVP-0 nullable)
- `customer_id` (bigint, optional)
- `plant_id` (bigint, optional)
- `system_instance_id` (bigint, optional)

#### Common Columns (from database/rules.md)
- `is_active` (boolean, required)
- `memo` (text)
- `created_by` (bigint)
- `created_at` (timestamptz)
- `updated_by` (bigint)
- `updated_at` (timestamptz)
- `last_source` (varchar(30))
- `last_activity` (text)
- `transaction_id` (uuid)

---

## 4. History Table — pr_project_h

### 4.1 Primary Key
- composite PK: `(project_id, history_seq)`

### 4.2 History Columns (additional)
- `history_seq` (bigint, required)
  - 동일 project_id 범위 내 1부터 증가
- `event_type` (char(1), required)
  - values: `C`, `U`, `D`
- `event_at` (timestamptz, required)
  - 권장 규칙: 원본 row의 `updated_at`과 동일 값으로 기록

### 4.3 Snapshot Rule
- `pr_project_m`의 모든 컬럼을 **동일 명칭으로 그대로 복사**하여 저장한다.

---

## 5. Constraints / Validation Rules (Logical)
- `done_result_code`는 `status_code=opportunity AND stage_code=done`일 때만 세팅한다.
- `handoff_stage_code`는 `handoff_type_code`가 있을 때만 의미가 있다.
- 물리 삭제 대신 `is_active=false`로 비활성화하고, 히스토리에 `event_type=D`로 기록한다.
- 하나의 논리 흐름에서 이벤트가 2개 발생하면(예: 기회 won 확정 → 실행 waiting 전환) 원본 row를 2회 업데이트할 수 있으며, 히스토리는 2건 누적된다.

---

## 6. Indexing (initial)
- `(status_code, stage_code)`
- `project_source_code`
- `current_owner_user_id`
- `customer_id`
- `system_instance_id`
- `(handoff_type_code, handoff_stage_code, handoff_user_id)`
- `updated_at`

---
