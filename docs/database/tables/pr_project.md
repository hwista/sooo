# Table Spec — pr_project_m / pr_project_h (Unified Project)

## 1. Purpose
프로젝트의 전체 라이프사이클을 **단일 Project 엔티티**에서 관리한다.  
프로젝트는 4단계 상태(`request` → `proposal` → `execution` → `transition`)를 거치며,  
각 상태 내에서 `stage_code`로 진행 단계(`waiting` → `in_progress` → `done`)를 추적한다.  
역할 간 인계는 별도 트랙(`handoff_*`)으로 관리한다.  
**상태별 특화 데이터는 하위 테이블로 분리**하여 해당 상태일 때 함께 조회한다.

---

## 2. Tables
- Master: `pr_project_m`
- History: `pr_project_h`

---

## 3. Project Lifecycle (4 Stages)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           PROJECT LIFECYCLE                                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────┐     ┌──────────┐     ┌───────────┐     ┌────────────┐              │
│  │ REQUEST │ ──▶ │ PROPOSAL │ ──▶ │ EXECUTION │ ──▶ │ TRANSITION │              │
│  │  요청    │     │   제안    │     │   실행     │     │    전환     │              │
│  └─────────┘     └──────────┘     └───────────┘     └────────────┘              │
│       │               │                │                  │                      │
│   accepted        won              completed         transferred                 │
│   (수용)          (수주)            (완료)             (전환완료)                   │
│                                                                                  │
│  [하위 테이블]    [하위 테이블]     [하위 테이블]      [하위 테이블]                  │
│  - 요청 정보      - 계약 정보       - 마일스톤/태스크   - 운영 전환 체크              │
│                  - 견적 정보        - 산출물           - 인수인계 문서              │
│                                    - 이슈/리스크                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Status Codes (PROJECT_STATUS)

| status_code | 한글명 | 영문명 | 설명 | done_result 옵션 |
|-------------|--------|--------|------|-----------------|
| `request` | 요청 | Request | 고객 요청 접수 및 검토 | accepted, rejected, hold |
| `proposal` | 제안 | Proposal | 견적/제안서 작성 및 계약 협상 | won, lost, hold |
| `execution` | 실행 | Execution | 계약 체결 후 프로젝트 수행 | completed, cancelled, hold |
| `transition` | 전환 | Transition | 완료 후 운영/유지보수 전환 | transferred, cancelled |

### 3.2 Stage Codes (PROJECT_STAGE)

| stage_code | 한글명 | 영문명 | 설명 |
|------------|--------|--------|------|
| `waiting` | 대기 | Waiting | 본격 작업 전 (대기) |
| `in_progress` | 진행 | In Progress | 작업 진행 중 |
| `done` | 완료 | Done | 해당 상태 종료 |

### 3.3 State Transition Rules

| 현재 상태 | done_result | 다음 상태 |
|----------|-------------|----------|
| request + done | `accepted` | proposal + waiting |
| request + done | `rejected` | 종료 |
| proposal + done | `won` | execution + waiting |
| proposal + done | `lost` | 종료 |
| execution + done | `completed` | transition + waiting |
| execution + done | `cancelled` | 종료 |
| transition + done | `transferred` | 종료 (운영 전환 완료) |
| (any) + done | `hold` | 보류 (재개 시 같은 상태 in_progress) |

---

## 4. Master Table — pr_project_m

### 4.1 Primary Key
- `project_id` (bigserial)

### 4.2 Columns

#### Core
- `project_name` (text, required) — 프로젝트명(표시용)

#### Workflow Codes (logical FK by varchar)
- `status_code` (varchar(30), required)
  - code_group: `PROJECT_STATUS`
  - values: `request`, `proposal`, `execution`, `transition`
- `stage_code` (varchar(30), required)
  - code_group: `PROJECT_STAGE`
  - values: `waiting`, `in_progress`, `done`
- `done_result_code` (varchar(30), optional)
  - code_group: `PROJECT_DONE_RESULT`
  - values: `accepted`, `rejected`, `won`, `lost`, `completed`, `cancelled`, `transferred`, `hold`
  - 의미 규칙: `stage_code=done`일 때만 사용

#### Current Owner
- `current_owner_user_id` (bigint, optional)
  - 현재 오너/책임자(리스트/리포트 편의용)
  - 내부 사용자 ID(논리 FK)

#### Handoff Track (current/last)
- `handoff_type_code` (varchar(50), optional)
  - 예: `REQ_TO_PRE`, `PRE_TO_PM`, `PM_TO_SM`
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

## 5. History Table — pr_project_h

### 5.1 Primary Key
- composite PK: `(project_id, history_seq)`

### 5.2 History Columns (additional)
- `history_seq` (bigint, required)
  - 동일 project_id 범위 내 1부터 증가
- `event_type` (char(1), required)
  - values: `C`, `U`, `D`
- `event_at` (timestamptz, required)
  - 권장 규칙: 원본 row의 `updated_at`과 동일 값으로 기록

### 5.3 Snapshot Rule
- `pr_project_m`의 모든 컬럼을 **동일 명칭으로 그대로 복사**하여 저장한다.

---

## 6. Related Tables by Status

각 상태별로 특화된 데이터를 관리하는 하위 테이블:

| status_code | 하위 테이블 | 설명 |
|-------------|------------|------|
| `request` | `pr_project_request_m` (예정) | 요청 상세 정보 |
| `proposal` | `pr_project_contract_m` (예정) | 계약/견적 정보 |
| `execution` | `pr_project_status_m` | 실행 상세 (목표/일정/종료조건) |
| `execution` | `pr_project_deliverable_r_m` | 산출물 관리 |
| `execution` | `pr_project_close_condition_r_m` | 종료조건 체크 |
| `transition` | `pr_project_transition_m` (예정) | 전환 체크리스트 |

---

## 7. Constraints / Validation Rules (Logical)
- `done_result_code`는 `stage_code=done`일 때만 세팅한다.
- 상태별 유효한 `done_result_code` 조합을 검증한다 (Section 3.3 참조).
- `handoff_stage_code`는 `handoff_type_code`가 있을 때만 의미가 있다.
- 물리 삭제 대신 `is_active=false`로 비활성화하고, 히스토리에 `event_type=D`로 기록한다.
- 상태 전이 시 원본 row를 업데이트하고, 히스토리가 누적된다.

---

## 8. Indexing (initial)
- `(status_code, stage_code)`
- `current_owner_user_id`
- `customer_id`
- `system_instance_id`
- `(handoff_type_code, handoff_stage_code, handoff_user_id)`
- `updated_at`

---
