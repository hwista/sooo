# Table Spec — pr_deliverable_group_item_r_m / pr_deliverable_group_item_r_h (Deliverable Group-Item Mapping)

## 1. Purpose
산출물 템플릿 그룹(`group_code`)과 산출물(`deliverable_code`)의 매핑을 관리한다.  
프로젝트에 템플릿 그룹을 적용할 때 이 매핑을 기준으로 `pr_project_deliverable_r_m`에 산출물이 생성된다.

---

## 2. Tables
- Master(Relation): `pr_deliverable_group_item_r_m`
- History(Relation): `pr_deliverable_group_item_r_h`

---

## 3. Master Table — pr_deliverable_group_item_r_m
- PK: `(group_code, deliverable_code)`

### Columns
- `group_code` (varchar(50), required)
  - 논리 FK: `pr_deliverable_group_m.group_code`
- `deliverable_code` (varchar(50), required)
  - 논리 FK: `pr_deliverable_m.deliverable_code`
- `sort_order` (int, required, default 0)

#### Common Columns
- `is_active`, `memo`, `created_by`, `created_at`, `updated_by`, `updated_at`, `last_source`, `last_activity`, `transaction_id`

---

## 4. History Table — pr_deliverable_group_item_r_h
- PK: `(group_code, deliverable_code, history_seq)`
- `event_type`, `event_at` 포함
- 스냅샷 규칙: 원본 컬럼 전체 복사

---
