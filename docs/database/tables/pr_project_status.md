# Table Spec — pr_project_status_m / pr_project_status_h (Project Status Detail)

## 1. Purpose
프로젝트의 **각 status별 상세 정보**(목표/오너/예상·실제 일정/종료조건 그룹)를 관리한다.  
프로젝트 한 건에 대해 status는 최대 4개(`request`, `proposal`, `execution`, `transition`)가 존재할 수 있으며,  
각 status는 독립적으로 업데이트/히스토리 누적이 가능하다.

> **Note**: 모든 상태에 대해 행을 생성하지 않고, **해당 상태에 진입할 때 생성**한다.

---

## 2. Tables
- Master: `pr_project_status_m`
- History: `pr_project_status_h`

---

## 3. Master Table — pr_project_status_m

### 3.1 Primary Key
- composite PK: `(project_id, status_code)`

### 3.2 Columns

#### Identity
- `project_id` (bigint, required) — 원본 프로젝트 ID(논리 FK)
- `status_code` (varchar(30), required)
  - code_group: `PROJECT_STATUS`
  - values: `request`, `proposal`, `execution`, `transition`

#### Status Detail
- `status_goal` (text, required)
  - 해당 status의 목표/개요(자유 텍스트 입력)
- `status_owner_user_id` (bigint, optional)
  - 해당 status 오너(내부 사용자 ID, 논리 FK)

#### Dates (per status)
- `expected_start_at` (date, optional) — 계약/계획 기준 예상 시작일
- `expected_end_at` (date, optional) — 계약/계획 기준 예상 종료일
- `actual_start_at` (date, optional) — 실제 시작일
- `actual_end_at` (date, optional) — 실제 종료일

#### Close Condition Group
- `close_condition_group_code` (varchar(50), optional)
  - 종료조건 그룹 코드(논리 FK)
  - 실제 조건 항목은 매핑 테이블(`pr_project_close_condition_r_m`)에서 관리

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

## 4. History Table — pr_project_status_h

### 4.1 Primary Key
- composite PK: `(project_id, status_code, history_seq)`

### 4.2 History Columns (additional)
- `history_seq` (bigint, required)
  - 동일 `(project_id, status_code)` 범위 내 1부터 증가
- `event_type` (char(1), required)
  - values: `C`, `U`, `D`
- `event_at` (timestamptz, required)
  - 권장 규칙: 원본 row의 `updated_at`과 동일 값으로 기록

### 4.3 Snapshot Rule
- `pr_project_status_m`의 모든 컬럼을 **동일 명칭으로 그대로 복사**하여 저장한다.

---

## 5. Constraints / Validation Rules (Logical)
- `status_code`는 `request`, `proposal`, `execution`, `transition` 중 하나만 사용한다.
- 물리 삭제 대신 `is_active=false`로 비활성화하고, 히스토리에 `event_type=D`로 기록한다.

---

## 6. Indexing (initial)
- `status_owner_user_id`
- `(expected_start_at, expected_end_at)`
- `updated_at`

---
