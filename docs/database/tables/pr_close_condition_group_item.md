# Table Spec — pr_close_condition_group_item_r_m / pr_close_condition_group_item_r_h (Close Condition Group-Item Mapping)

## 1. Purpose
종료조건 템플릿 그룹(`group_code`)과 종료조건 항목(`condition_code`)의 매핑을 관리한다.  
프로젝트에 템플릿 그룹을 적용할 때 이 매핑을 기준으로 `pr_project_close_condition_r_m`에 조건 항목들이 생성된다.

---

## 2. Tables
- Master(Relation): `pr_close_condition_group_item_r_m`
- History(Relation): `pr_close_condition_group_item_r_h`

---

## 3. Master Table — pr_close_condition_group_item_r_m

### 3.1 Primary Key
- composite PK: `(group_code, condition_code)`

### 3.2 Columns
- `group_code` (varchar(50), required)
  - 논리 FK: `pr_close_condition_group_m.group_code`
- `condition_code` (varchar(50), required)
  - 논리 FK: `cm_code_m` where `code_group='PROJECT_CLOSE_CONDITION_ITEM'`
- `sort_order` (int, required, default 0) — 그룹 내 항목 순서

#### Common Columns
- `is_active`, `memo`, `created_by`, `created_at`, `updated_by`, `updated_at`, `last_source`, `last_activity`, `transaction_id`

---

## 4. History Table — pr_close_condition_group_item_r_h

### 4.1 Primary Key
- composite PK: `(group_code, condition_code, history_seq)`

### 4.2 History Columns
- `history_seq`, `event_type`, `event_at` + 스냅샷 컬럼 전체

### 4.3 Snapshot Rule
- `pr_close_condition_group_item_r_m`의 모든 컬럼을 동일 명칭으로 복사하여 저장한다.

---
