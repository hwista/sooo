# Table Spec — cm_code_m / cm_code_h (Common Code)

## 1. Purpose
상태/단계/결과/핸드오프 타입/종료조건 등 **운영 코드**를 중앙에서 관리한다.  
서비스 테이블에서는 FK를 걸지 않고, varchar code를 저장하여 **논리 FK**로 참조한다.  
표시명(한글/영문), 설명, 정렬 순서를 포함하여 다국어 및 운영 확장을 지원한다.

---

## 2. Tables
- Master: `cm_code_m`
- History: `cm_code_h`

---

## 3. Master Table — cm_code_m

### 3.1 Primary Key
- `code_id` (bigserial)

### 3.2 Logical Key
- unique `(code_group, code)`

### 3.3 Columns

#### Code Identity
- `code_group` (varchar(50), required) — 코드 그룹(카테고리)
- `code` (varchar(50), required) — 그룹 내 코드값(논리 키)
- `parent_code` (varchar(50), optional) — 계층 필요 시 상위 코드값

#### Display / Meaning
- `display_name_ko` (varchar(200), required) — 표시명(한글)
- `display_name_en` (varchar(200), optional) — 표시명(영문)
- `description` (text, optional) — 코드 설명
- `sort_order` (int, required, default 0) — 정렬 순서(낮을수록 우선)

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

## 4. History Table — cm_code_h

### 4.1 Primary Key
- composite PK: `(code_id, history_seq)`

### 4.2 History Columns (additional)
- `history_seq` (bigint, required)
  - 동일 code_id 범위 내 1부터 증가
- `event_type` (char(1), required)
  - values: `C`, `U`, `D`
- `event_at` (timestamptz, required)
  - 권장 규칙: 원본 row의 `updated_at`과 동일 값으로 기록

### 4.3 Snapshot Rule
- `cm_code_m`의 모든 컬럼을 **동일 명칭으로 그대로 복사**하여 저장한다.

---

## 5. Constraints / Validation Rules (Logical)
- 코드 참조는 FK가 아닌 varchar 논리 참조로 운영한다.
- 물리 삭제 대신 `is_active=false`로 비활성화하고, 히스토리에 `event_type=D`로 기록한다.

---

## 6. Indexing (initial)
- `code_group`
- `(code_group, parent_code)` — 계층 조회
- `is_active`

---
