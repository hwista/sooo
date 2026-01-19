# Table Spec — pr_deliverable_m / pr_deliverable_h (Deliverable Master)

## 1. Purpose
프로젝트 관리/개발 방법론에서 통용되는 “표준 산출물”을 코드화해 관리한다.  
프로젝트별 요구 산출물 목록, 제출 현황, 종료 조건 검증(Validation)의 기준 데이터가 된다.

---

## 2. Tables
- Master: `pr_deliverable_m`
- History: `pr_deliverable_h`

---

## 3. Master Table — pr_deliverable_m

### 3.1 Primary Key
- `deliverable_id` (bigserial)

### 3.2 Logical Key
- unique `deliverable_code` (varchar(50))

### 3.3 Columns
- `deliverable_code` (varchar(50), required) — 산출물 코드(논리 키)
- `deliverable_name` (text, required) — 산출물명
- `description` (text, optional) — 산출물 설명
- `sort_order` (int, required, default 0)

#### Common Columns
- `is_active`, `memo`, `created_by`, `created_at`, `updated_by`, `updated_at`, `last_source`, `last_activity`, `transaction_id`

---

## 4. History Table — pr_deliverable_h
- PK: `(deliverable_id, history_seq)`
- `event_type`, `event_at` 포함
- 스냅샷 규칙: 원본 컬럼 전체 복사

---
