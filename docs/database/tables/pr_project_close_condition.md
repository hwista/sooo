# Table Spec — pr_project_close_condition_r_m / pr_project_close_condition_r_h (Close Condition Mapping)

## 1. Purpose
프로젝트의 종료 조건은 다수(1:N)일 수 있으므로, 프로젝트/상태(status)별로 **종료 조건 항목**을 매핑한다.  
각 조건 항목의 충족 여부(`is_checked`)를 저장하여 “종료조건 체크리스트/진행률” 리포트가 가능하도록 한다.  
또한 종료조건이 산출물 제출을 요구하는 경우(`requires_deliverable=true`), 산출물 제출 상태가 충족되어야만 종료조건 체크를 허용하는 UI/업무 Validation에 활용한다.

---

## 2. Tables
- Master(Relation): `pr_project_close_condition_r_m`
- History(Relation): `pr_project_close_condition_r_h`

---

## 3. Master Table — pr_project_close_condition_r_m

### 3.1 Primary Key
- composite PK: `(project_id, status_code, condition_code)`

### 3.2 Columns

#### Identity
- `project_id` (bigint, required) — 원본 프로젝트 ID(논리 FK)
- `status_code` (varchar(30), required)
  - values: `opportunity`, `execution`
- `condition_code` (varchar(50), required)
  - 종료 조건 “항목” 코드(논리 FK, code_group 예: `PROJECT_CLOSE_CONDITION_ITEM`)

#### Deliverable Requirement
- `requires_deliverable` (boolean, required, default false)
  - 의미: 해당 종료조건 체크 시 **산출물 제출이 선행되어야 함**
  - 실제 제출 여부 판단은 `pr_project_deliverable_r_m.submission_status_code`로 수행
  - (권장) UI에서 `requires_deliverable=true`이면 산출물 제출 상태가 “확정”일 때만 체크 허용

#### Completion Tracking
- `is_checked` (boolean, required, default false) — 조건 충족 여부
- `checked_at` (timestamptz, optional) — 충족 처리 시각
- `checked_by` (bigint, optional) — 충족 처리자(내부 사용자 ID, 논리 FK)
- `sort_order` (int, required, default 0) — 항목 정렬 순서

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

## 4. History Table — pr_project_close_condition_r_h

### 4.1 Primary Key
- composite PK: `(project_id, status_code, condition_code, history_seq)`

### 4.2 History Columns (additional)
- `history_seq` (bigint, required)
  - 동일 `(project_id, status_code, condition_code)` 범위 내 1부터 증가
- `event_type` (char(1), required)
  - values: `C`, `U`, `D`
- `event_at` (timestamptz, required)
  - 권장 규칙: 원본 row의 `updated_at`과 동일 값으로 기록

### 4.3 Snapshot Rule
- `pr_project_close_condition_r_m`의 모든 컬럼을 **동일 명칭으로 그대로 복사**하여 저장한다.
- `requires_deliverable`도 스냅샷에 포함한다.

---

## 5. Constraints / Validation Rules (Logical)
- 종료 조건 항목은 코드 테이블에서 관리하며, 서비스 테이블에서는 varchar로 논리 참조한다(FK 미사용).
- `requires_deliverable=true`인 조건은 산출물 제출 상태가 충족되어야 `is_checked=true`가 가능하다.
- 물리 삭제 대신 `is_active=false`로 비활성화하고, 히스토리에 `event_type=D`로 기록한다.

---

## 6. Indexing (initial)
- `(project_id, status_code, is_checked)` — 체크리스트 진행률/미충족 조회
- `condition_code` — 조건 항목별 조회
- `updated_at`

---
