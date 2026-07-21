# SSOO 핵심 개념 (Concepts)

> 최종 업데이트: 2026-07-06

SSOO 시스템의 핵심 도메인 개념을 정의합니다.

---

## 1. Opportunity (기회)

- CRM이 소유하는 영업 기회 단위다.
- 제안/견적/협상/수주 확정은 CRM 정본에서 관리한다.
- PMS는 Opportunity를 직접 편집하거나 PMS Project와 동일한 원장으로 취급하지 않는다.
- CRM에서 실행 인계가 확정되면 PMS는 실행 프로젝트 또는 인계 스냅샷을 수령한다.

> 구현 관점: 과거 PMS 문서의 `request/proposal` 상태는 호환 단계로 남아 있지만, CRM 기회 원장을 대체하지 않는다.

---

## 2. Project (프로젝트)

- PMS가 소유하는 실행 프로젝트 단위다.
- 실행 전 접수/인계 확인을 위해 `request/proposal` 호환 상태를 가질 수 있으나, 영업 기회/견적/계약 원장은 CRM이 소유한다.
- PMS의 흐름은 `status_code` + `stage_code`로 표현한다.

### 상태 (status_code)
| 값 | 설명 |
|---|------|
| `request` | 요청 |
| `proposal` | 제안 |
| `execution` | 실행 |
| `transition` | 전환 |

### 단계 (stage_code)
| 값 | 설명 |
|---|------|
| `waiting` | 대기 |
| `in_progress` | 진행 중 |
| `done` | 완료 |

### 종료 결과 (done_result_code)
| 값 | 설명 |
|---|------|
| `accepted` | 수용 |
| `rejected` | 거부 |
| `won` | 수주 성공 |
| `lost` | 실주 |
| `completed` | 완료 |
| `cancelled` | 취소 |
| `transfer_pending` | 운영 전환 필요 |
| `transferred` | 운영 이관 완료 |
| `linked` | 다음 프로젝트 연계 |
| `hold` | 보류 |

> 사용 규칙: `status_code=request/proposal/execution/transition`에서 `stage_code=done`일 때 의미 있음

### 단계 특화 상세

공통 필드는 `pr_project_m`에 유지하고, 단계별 특화 항목은 상세 테이블로 분리한다.

| 단계 | 상세 테이블 | 설명 |
|---|---|---|
| request | `pr_project_request_d` | 내부 접수/CRM 인계 확인 등 |
| proposal | `pr_project_proposal_d` | 실행 착수 전 범위 확인, CRM 제안 스냅샷 참조 등 |
| execution | `pr_project_execution_d` | 수행 방식, 후속 프로젝트, 실행 메모. 계약/청구 값은 CRM 스냅샷 |
| transition | `pr_project_transition_d` | 운영 이관 핸드오프 관리 |

---

## 3. Handoff (핸드오프) 트랙

- 역할 간 인계는 프로젝트의 별도 트랙(`handoff_*`)으로 관리한다.
- 핸드오프는 여러 번 발생 가능하며, 필요 시 이벤트를 분리 기록해 추적성을 강화한다.

### 핸드오프 타입 (handoff_type_code)
| 값 | 설명 |
|---|------|
| `PRE_TO_PM` | CRM/내부 접수 → PM (실행 인수) |
| `PRE_TO_CONTRACT_OWNER` | CRM 계약 담당자 확인용 호환 값 |
| `EXEC_TO_CONTRACT_OWNER` | 실행 중 계약 스냅샷 확인용 호환 값 |
| `EXEC_TO_SM` | 실행 → 운영 전환 (SM) |

### 핸드오프 단계 (handoff_stage_code)
- `waiting` / `in_progress` / `done`

---

## 4. System (시스템, 운영 자산)

- 프로젝트 결과로만 생기는 개념이 아니라 "우리가 관리해야 하는 자산"으로 존재할 수 있다.
  - 예: 타사가 구축한 시스템을 우리가 **운영만 인수**하는 경우 → System은 독립적으로 등록 가능
- Project와 System은 강결합일 필요가 없고, 필요할 때 선택적으로 매핑될 수 있다.

---

## 5. Customer / Plant / System Instance

- **Customer**: 고객사 읽기용 조회. PMS는 프로젝트 실행 선택을 위해 기존 고객사 식별자를 유지하면서 공용 조직 앵커 메타데이터를 1차로 함께 보여준다. 고객사 원장 생성/수정/비활성화는 PMS 범위가 아니라 CRM/Admin/공용 조직 책임이다.
- **Plant/Site**: 고객의 공장/사이트 (다수 보유 가능)
- **System Instance**: 고객/플랜트별 시스템 인스턴스
  - 시스템은 고객에 직접 붙을 수도 있고(전사 ERP), 플랜트별 인스턴스가 존재할 수도 있다(MES)
  - 시스템은 계층 구조를 가질 수 있다 (MES 하위 DAS/HMI 등)
- **Integration**: 시스템 간 인터페이스 (ERP↔MES 등)

현재 구현은 PMS 고객사 관리 CRUD 화면/API/mutation/쓰기 DTO export 를 제거하고 프로젝트 생성·수정 및 기준정보 선택에 필요한 읽기 조회만 유지한다. 이 조회는 공용 조직 앵커 메타데이터 반환, 공용 조직 코드/명 검색, 선택지 연결 표기까지 1차 제공한다. 요청/제안/수행/전환 목록의 고객사 필터도 이 읽기 조회 결과를 선택하며 숫자 고객 ID 직접 입력이나 표시 fallback 에 의존하지 않는다. PMS 실행 자산 기준정보는 Plant/Site, System Catalog, System Instance, Integration 의 1차 조회/검색, 관리자 생성·수정·비활성화, JSON 기반 dry-run/apply 반입과 기존 코드 갱신 1차, CSV/TSV 업로드·컬럼 매핑·코드 우선 템플릿 다운로드·숫자 ID 컬럼의 기존 파일 호환 매핑·브라우저 로컬 매핑 재사용 1차, 서버 공유 매핑 프로필 CRUD/재사용·기본 지정 UI·이력 조회/복구 1차, 프로젝트 생성·수정 단계의 Plant/Site 및 System Instance 선택/정합성 검증 1차 표면까지 제공한다. 고객사 원장 편집과 공용 Organization full cutover 는 아직 남아 있다. 계약/청구/매출/원가 원장은 CRM 책임이며 이 기준정보에 포함하지 않는다.

---

## 6. User (사용자) — 단일 테이블

- 조직 내/외 모든 "사람"을 단일 테이블(`cm_user_m`)에서 관리한다.
- 프로젝트 리소스, 이해관계자, 담당자 등으로 매핑될 수 있다.
- **시스템 로그인 가능 여부**는 `is_system_user` 플래그로 구분한다.

### 사용자 유형 (user_type_code)
| 값 | 설명 |
|---|------|
| `internal` | 내부 직원 (우리 회사) |
| `external` | 외부 이해관계자 (고객사 담당자, 협력사 등) |

### 시스템 사용 여부 (is_system_user)
| 값 | 설명 |
|---|------|
| `false` (기본) | 프로젝트 리소스/이해관계자로만 기록됨. 로그인 불가. |
| `true` | 시스템 로그인 가능. login_id/password 필요. |

### 사용자 상태 (user_status_code)
| 값 | 설명 |
|---|------|
| `registered` | 리소스로만 등록됨 (시스템 미사용) |
| `invited` | 시스템 사용 초대됨 (아직 가입 미완료) |
| `active` | 정상 사용 중 |
| `inactive` | 일시 비활성 (휴직 등) |
| `suspended` | 정지됨 (보안 이슈 등) |

### 초대 플로우
```
registered(리소스 등록) → invited(초대 발송) → active(초대 수락/계정 설정)
```

---

## 7. Deliverable (산출물)

- "표준 산출물 사전"을 별도 마스터로 관리한다.
- 프로젝트에서는 "프로젝트 + 상태(status) + 산출물" 단위로 제출 상태/업로드 파일을 관리한다.
- 산출물 템플릿 그룹(방법론/유형별 세트)을 제공하여 프로젝트 산출물 목록을 자동 구성할 수 있다.

### 산출물 제출 상태
| 값 | 설명 |
|---|------|
| `not_submitted` | 제출 전 |
| `submitted` | 제출 |
| `confirmed` | 확정 (고객 검수/확정 반영) |
| `approved` | 승인 완료 |
| `not_required` | 해당 산출물 면제 |
| `rejected` | 반려 |

호환 입력:
- `before_submit`은 저장 시 `not_submitted`로 정규화한다.
- `final`은 저장 시 `confirmed`로 정규화한다.

---

## 8. Close Condition (종료조건)

- 프로젝트 종료를 객관화하기 위해 종료조건 체크리스트를 관리한다.
- 종료조건 템플릿 그룹을 제공하여 프로젝트+상태별 종료조건 목록을 자동 구성할 수 있다.

### 산출물 기반 종료 검증 (Validation)
- 종료조건 항목에 `requires_deliverable=true`가 설정된 경우:
  - 해당 프로젝트+상태의 산출물 제출 상태가 **confirmed/approved/not_required** 완료 판정을 만족해야만
  - UI/업무 로직에서 해당 종료조건 `is_checked=true` 처리를 허용한다.

---

## 9. 데이터 모델 요약 (High-level)

```
Customer(read-only lookup) 1:N Plant
System Catalog (parent-child 계층)
Customer/Plant → System Instance
System Instance ↔ Integration (인터페이스)
Project → Customer (필수), Plant/System Instance (선택)
User → Project/System (오너/담당)
CRM Opportunity -> PMS Project handoff/snapshot
PMS Project = execution management record
```

---

## 관련 문서

- [service-overview.md](service-overview.md) - 서비스 소개
- [actions/](actions/) - 액션 명세
- [workflows/](workflows/) - 워크플로우 명세
- [database-guide.md](../../common/guides/database-guide.md) - 데이터베이스 가이드 (공용)

## Changelog

| Date | Change |
|------|--------|
| 2026-07-06 | PMS 요청/제안/수행/전환 목록의 고객사 필터를 읽기용 고객 조회 선택으로 전환하고 숫자 고객 ID 직접 입력/표시 fallback 에 의존하지 않도록 현행화했다. |
| 2026-07-06 | PMS 실행 자산 기준정보 CSV/TSV 반입 템플릿을 고객사/사이트/시스템 코드 우선으로 정리하고 숫자 ID 컬럼은 호환 매핑으로만 유지하도록 현행화했다. |
| 2026-07-06 | PMS 고객사 읽기 조회가 공용 조직 앵커 메타데이터를 1차로 함께 반환/검색/표기하도록 현행화했다. 고객사 원장 편집과 공용 Organization full cutover 는 계속 미구현 범위로 남긴다. |
| 2026-07-06 | PMS 고객사 원장 쓰기 표면을 제거하고 Customer 를 프로젝트 실행 선택용 읽기 조회로 재정의했다. 고객사 원장 편집과 공용 Organization cutover 는 계속 미구현 범위로 남긴다. |
| 2026-07-03 | CRM 분리 이후 Opportunity를 CRM 정본으로 재정의하고, PMS Project는 실행 프로젝트 원장과 호환 상태로 설명하도록 현행화했다. |
| 2026-02-09 | Add changelog section. |
