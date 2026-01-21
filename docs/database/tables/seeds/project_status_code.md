# Seed Data — 프로젝트 상태 코드

> 파일: `packages/database/prisma/seeds/01_project_status_code.sql`

## 1. PROJECT_STATUS (프로젝트 상태 - 4단계)

프로젝트 라이프사이클의 4단계 상태를 정의합니다.

| code_value | 한글명 | 영문명 | 설명 | sort_order |
|------------|--------|--------|------|------------|
| `request` | 요청 | Request | 고객 요청 접수 및 검토 단계 | 10 |
| `proposal` | 제안 | Proposal | 견적/제안서 작성 및 계약 협상 단계 | 20 |
| `execution` | 실행 | Execution | 계약 체결 후 프로젝트 수행 단계 | 30 |
| `transition` | 전환 | Transition | 프로젝트 완료 후 운영/유지보수 전환 단계 | 40 |

### 상태 흐름

```
request → proposal → execution → transition
(요청)    (제안)      (실행)       (전환)
```

---

## 2. PROJECT_STAGE (진행 단계)

각 상태 내에서의 진행 단계를 정의합니다.

| code_value | 한글명 | 영문명 | 설명 | sort_order |
|------------|--------|--------|------|------------|
| `waiting` | 대기 | Waiting | 아직 본격 작업 전 (대기) | 10 |
| `in_progress` | 진행 | In Progress | 작업 진행 중 | 20 |
| `done` | 완료 | Done | 해당 상태의 종료 | 30 |

---

## 3. PROJECT_DONE_RESULT (종료 결과)

각 상태가 `done`일 때 사용되는 결과 코드입니다.

| code_value | 한글명 | 영문명 | 설명 | 적용 상태 | sort_order |
|------------|--------|--------|------|----------|------------|
| `accepted` | 수용 | Accepted | 요청 수용 (제안 단계 전환 대상) | request | 10 |
| `rejected` | 거부 | Rejected | 요청 거부 (종료) | request | 15 |
| `won` | 수주 | Won | 계약 성사 (실행 전환 대상) | proposal | 20 |
| `lost` | 실주 | Lost | 무산/패배 | proposal | 25 |
| `completed` | 완료 | Completed | 프로젝트 정상 완료 (전환 단계 전환 대상) | execution | 30 |
| `cancelled` | 취소 | Cancelled | 프로젝트 취소 | execution, transition | 35 |
| `transferred` | 전환완료 | Transferred | 운영/유지보수 전환 완료 | transition | 40 |
| `hold` | 보류 | Hold | 보류 (추후 재개 가능) | 모든 상태 | 50 |

### 상태별 유효 결과

| 현재 상태 | 유효한 done_result |
|----------|-------------------|
| `request` | `accepted`, `rejected`, `hold` |
| `proposal` | `won`, `lost`, `hold` |
| `execution` | `completed`, `cancelled`, `hold` |
| `transition` | `transferred`, `cancelled` |

### 상태 전이 규칙

| 현재 상태 | done_result | 다음 상태 |
|----------|-------------|----------|
| request + done | `accepted` | proposal + waiting |
| request + done | `rejected` | **종료** |
| proposal + done | `won` | execution + waiting |
| proposal + done | `lost` | **종료** |
| execution + done | `completed` | transition + waiting |
| execution + done | `cancelled` | **종료** |
| transition + done | `transferred` | **종료** (운영 전환 완료) |
| (any) + done | `hold` | **보류** (재개 시 같은 상태 in_progress) |

---

## 4. 사용 예시

### 프로젝트 생성 (요청 접수)
```sql
INSERT INTO pr_project_m (project_name, status_code, stage_code)
VALUES ('고객사A 시스템 구축', 'request', 'waiting');
```

### 요청 수용 → 제안 단계 전환
```sql
-- 1. 요청 단계 완료
UPDATE pr_project_m 
SET stage_code = 'done', done_result_code = 'accepted'
WHERE project_id = 1;

-- 2. 제안 단계로 전환
UPDATE pr_project_m 
SET status_code = 'proposal', stage_code = 'waiting', done_result_code = NULL
WHERE project_id = 1;
```

### 수주 → 실행 단계 전환
```sql
-- 1. 제안 단계 완료 (수주)
UPDATE pr_project_m 
SET stage_code = 'done', done_result_code = 'won'
WHERE project_id = 1;

-- 2. 실행 단계로 전환
UPDATE pr_project_m 
SET status_code = 'execution', stage_code = 'waiting', done_result_code = NULL
WHERE project_id = 1;
```

---

## 5. 관련 테이블

| 테이블 | 사용 컬럼 | 설명 |
|--------|----------|------|
| `pr_project_m` | `status_code`, `stage_code`, `done_result_code` | 프로젝트 마스터 |
| `pr_project_status_m` | `status_code` | 상태별 상세 정보 |
| `pr_project_deliverable_r_m` | `status_code` | 상태별 산출물 |
| `pr_project_close_condition_r_m` | `status_code` | 상태별 종료조건 |

---

## 6. 참고

- 이전 설계의 `PROJECT_SOURCE` (request/proposal) 코드 그룹은 **삭제**됨
  - 프로젝트 시작은 이제 항상 `request` 상태로 시작
- `opportunity`/`execution` 2단계 → `request`/`proposal`/`execution`/`transition` 4단계로 변경
