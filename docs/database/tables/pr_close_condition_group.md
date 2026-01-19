# Table Spec — pr_close_condition_group_m / pr_close_condition_group_h (Close Condition Template Group)

## 1. Purpose
종료 조건 항목들을 “템플릿 그룹”으로 묶어 관리한다.  
프로젝트/상태에 그룹을 선택하면, 그룹에 속한 조건 항목들을 `pr_project_close_condition_r_m`에 자동 생성(Apply)할 수 있다.

---

## 2. Tables
- Master: `pr_close_condition_group_m`
- History: `pr_close_condition_group_h`

---

## 3. Master Table — pr_close_condition_group_m

### 3.1 Primary Key
- `close_condition_group_id` (bigserial)

### 3.2 Logical Key
- unique `group_code` (varchar(50))

### 3.3 Columns
- `group_code` (varchar(50), required) — 템플릿 그룹 코드(논리 키)
- `group_name` (text, required) — 그룹명
- `description` (text, optional) — 설명
- `sort_order` (int, required, default 0) — 정렬

#### Common Columns
- `is_active`, `memo`, `created_by`, `created_at`, `updated_by`, `updated_at`, `last_source`, `last_activity`, `transaction_id`

---

## 4. History Table — pr_close_condition_group_h

### 4.1 Primary Key
- composite PK: `(close_condition_group_id, history_seq)`

### 4.2 History Columns (additional)
- `history_seq` (bigint)
- `event_type` (char(1): C/U/D)
- `event_at` (timestamptz)

### 4.3 Snapshot Rule
- `pr_close_condition_group_m`의 모든 컬럼을 동일 명칭으로 복사하여 저장한다.

---
