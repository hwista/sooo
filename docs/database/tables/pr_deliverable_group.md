# Table Spec — pr_deliverable_group_m / pr_deliverable_group_h (Deliverable Template Group)

## 1. Purpose
방법론/프로젝트 유형별로 “산출물 세트(템플릿)”를 제공하기 위한 그룹 마스터이다.  
프로젝트에 그룹을 적용하면 그룹에 속한 산출물들을 `pr_project_deliverable_r_m`에 자동 생성(Apply)할 수 있다.

---

## 2. Tables
- Master: `pr_deliverable_group_m`
- History: `pr_deliverable_group_h`

---

## 3. Master Table — pr_deliverable_group_m
- PK: `deliverable_group_id` (bigserial)
- Logical Key: unique `group_code`

### Columns
- `group_code` (varchar(50), required) — 템플릿 그룹 코드
- `group_name` (text, required) — 그룹명
- `description` (text, optional)
- `sort_order` (int, required, default 0)

#### Common Columns
- `is_active`, `memo`, `created_by`, `created_at`, `updated_by`, `updated_at`, `last_source`, `last_activity`, `transaction_id`

---

## 4. History Table — pr_deliverable_group_h
- PK: `(deliverable_group_id, history_seq)`
- `event_type`, `event_at` 포함
- 스냅샷 규칙: 원본 컬럼 전체 복사

---
