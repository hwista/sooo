# README.md (Service) — ssoo

## 1. 서비스 한 줄 정의
**ssoo**는 SI/SM 조직(영업/AM/PM/SM)이 수행하는 일을 **Opportunity(기회)–Project(프로젝트)–System(운영 자산)** 관점에서 한 곳에 모아(SSOT)  
**핸드오프에 의한 맥락 단절과 수작업 보고 비용을 최소화**하는 사내 업무 허브이다.

> 컨셉: “삼삼오오(3355) 모여서 일한다” → 서비스명 `ssoo`

---

## 2. 배경과 문제 정의

### 2.1 조직/사업 특성
- 사내 IT 회사, SI 사업 및 SM(운영/유지보수) 수행
- 사업부 구성: **영업 / AM / PM / SM**
- 업무는 결국 “프로젝트”로 연결되어야 하나, 단계별 참여자가 달라 맥락이 끊기기 쉬움

### 2.2 현재 문제
1) **영업/AM → PM 인계 시 히스토리 단절**
- PM이 프로젝트를 인계받는 시점에 “왜/무엇/누가/전제/리스크”를 충분히 모르고 시작하게 됨

2) **기회(파이프라인) 가시성 부족**
- 영업/AM이 기회를 개별 관리 → PM은 다음 프로젝트를 사전에 알기 어려움

3) **팀장/사업부장 보고의 수작업 비용**
- 각자 관리 현황을 PPT로 작성 → 취합 → 보고 반복
- 현황 데이터가 시스템에 쌓이지 않아 “보고를 위한 보고”가 발생

---

## 3. 목표(What we optimize for)

### 3.1 핵심 목표
- 사업부가 관리하는 **대상(고객/시스템/기회/프로젝트)**을 먼저 한 곳에 모아 SSOT를 만든다.
- 이후 단계/핸드오프/산출물/종료조건/태스크를 점진 적용해 **소통 비용과 보고 비용을 감소**시킨다.

### 3.2 성공 기준(초기)
- 고객/시스템/기회/프로젝트가 **검색/필터/연결 조회** 가능
- “누가 들고 있는지(Owner)”가 항상 보임
- 프로젝트/기회/운영 대상 시스템을 한 화면에서 연결해 파악 가능
- 데이터가 쌓이며 **자연스러운 집계/보고**가 가능해짐

---

## 4. 핵심 개념(Concepts)

### 4.1 Opportunity(기회)
- “프로젝트가 될 가능성이 있는 일(계약 전)”을 담는 단위
- **자동 생성하지 않는다.**
  - 영업/AM의 모든 컨택 채널을 시스템이 모니터링할 수 없으므로 **영업/AM이 직접 등록**한다.
- 제안/요청 검토/딜/협상 과정이 여기에서 관리된다.
- 계약이 성사되면 **Execution(실행) 상태로 전환**된다.
  - 추적성 강화를 위해 “기회 완료(won) 이벤트”와 “실행 전환(waiting) 이벤트”를 분리해 순차 기록할 수 있다.

> 구현 관점: Opportunity는 별도 엔티티 분리 없이 **Project의 상태(status_code=opportunity)** 로 표현한다.

---

### 4.2 Project(프로젝트) — 단일 엔티티(통합)
- “기회(계약 전)”와 “실행(계약 후)”을 **단일 Project 엔티티**로 통합 관리한다.
- 흐름은 `status_code` + `stage_code`로 표현한다.

#### 상태(status_code)
- `opportunity`: 계약 전 기회
- `execution`: 계약 후 실행

#### 단계(stage_code)
- `waiting` → `in_progress` → `done`

#### 기회 종료 결과(done_result_code)
- `won` / `lost` / `hold`
- 사용 규칙: `status_code=opportunity AND stage_code=done`일 때만 의미 있음

---

### 4.3 Handoff(핸드오프) 트랙
- 역할 간 인계는 프로젝트의 별도 트랙(`handoff_*`)으로 관리한다.
- 핸드오프는 여러 번 발생 가능하며, 필요 시 이벤트를 분리 기록해 추적성을 강화한다.

예시 타입(`handoff_type_code`)
- `PRE_TO_PM`: 기회→PM(실행 인수)
- `PRE_TO_CONTRACT_OWNER`: 기회→계약담당(AM 등)
- `EXEC_TO_CONTRACT_OWNER`: 실행 중 계약이행(중도금/정산 등)
- `EXEC_TO_SM`: 실행→운영 전환(SM)

단계(`handoff_stage_code`)
- `waiting` / `in_progress` / `done`

---

### 4.4 System(시스템, 운영 자산)
- 프로젝트 결과로만 생기는 개념이 아니라 “우리가 관리해야 하는 자산”으로 존재할 수 있다.
  - 예: 타사가 구축한 시스템을 우리가 **운영만 인수**하는 경우 → System은 독립적으로 등록 가능
- Project와 System은 강결합일 필요가 없고, 필요할 때 선택적으로 매핑될 수 있다.

---

### 4.5 Customer / Plant / Customer-System Instance / Integration
- 고객은 다수의 **Plant/Site(공장/사이트)**를 가질 수 있다.
- 시스템은 고객에 직접 붙을 수도 있고(전사 ERP), 플랜트별 인스턴스가 존재할 수도 있다(MES).
- 시스템은 계층 구조를 가질 수 있다(MES 하위 DAS/HMI 등).
- 시스템 간 인터페이스(ERP↔MES 등)는 관계로 관리 가능하다.

---

### 4.6 User(사용자) — 단일 테이블, 시스템 사용 여부로 구분
- 조직 내/외 모든 "사람"을 단일 테이블(`cm_user_m`)에서 관리한다.
- 프로젝트 리소스, 이해관계자, 담당자 등으로 매핑될 수 있다.
- **시스템 로그인 가능 여부**는 `is_system_user` 플래그로 구분한다.

#### 사용자 유형(user_type_code)
- `internal`: 내부 직원 (우리 회사)
- `external`: 외부 이해관계자 (고객사 담당자, 협력사 등)

#### 시스템 사용 여부(is_system_user)
- `false` (기본): 프로젝트 리소스/이해관계자로만 기록됨. 로그인 불가.
- `true`: 시스템 로그인 가능. login_id/password 필요.

#### 사용자 상태(user_status_code)
- `registered`: 리소스로만 등록됨 (시스템 미사용)
- `invited`: 시스템 사용 초대됨 (아직 가입 미완료)
- `active`: 정상 사용 중
- `inactive`: 일시 비활성 (휴직 등)
- `suspended`: 정지됨 (보안 이슈 등)

#### 초대 플로우
```
registered(리소스 등록) → invited(초대 발송) → active(초대 수락/계정 설정)
```
- 관리자/매니저가 초대 → 이메일 발송 → 사용자가 링크 클릭 → ID/PW 설정 → 로그인 가능

> 이 구조를 통해 "프로젝트에는 매핑되어 있지만 시스템은 사용하지 않는 사람"과  
> "실제로 시스템에 로그인하여 업무를 수행하는 사용자"를 하나의 테이블에서 관리한다.

---

### 4.7 Deliverable(산출물) — 표준 사전 + 프로젝트 제출 관리 + 템플릿
- “표준 산출물 사전”을 별도 마스터로 관리한다.
- 프로젝트에서는 “프로젝트 + 상태(status) + 산출물” 단위로 제출 상태/업로드 파일을 관리한다.
- 산출물 템플릿 그룹(방법론/유형별 세트)을 제공하여 프로젝트 산출물 목록을 자동 구성할 수 있다.

산출물 제출 상태(3단계)
- `before_submit`(제출 전) → `submitted`(제출) → `confirmed`(확정, 고객 검수/확정 반영)

---

### 4.8 Close Condition(종료조건) — 체크리스트 + 템플릿 + Validation
- 프로젝트 종료를 객관화하기 위해 종료조건 체크리스트를 관리한다.
- 종료조건 템플릿 그룹을 제공하여 프로젝트+상태별 종료조건 목록을 자동 구성할 수 있다.

산출물 기반 종료 검증(Validation)
- 종료조건 항목에 `requires_deliverable=true`가 설정된 경우:
  - 해당 프로젝트+상태의 산출물 제출 상태가 **confirmed**를 만족해야만
  - UI/업무 로직에서 해당 종료조건 `is_checked=true` 처리를 허용한다.

---

## 5. 운영 프로세스 라이프사이클(합의된 흐름)

### 5.1 영업 베이스 프로젝트
1) 영업: 제안/기회 등록 (opportunity waiting)
2) 영업: 기회 관리 (필요 시 AM 또는 PM 참여) (opportunity in_progress)
3) 영업 또는 AM: 계약
4) 기회 종료: opportunity done + (won/lost/hold)
5) 계약 확정 시 실행 전환: execution waiting
6) PM: 실행 전환(Execution) 및 핸드오프 수령
7) PM: 프로젝트 실행 (execution in_progress)
8) PM: 실행 중 중도금/중간보고 등 필요 시 AM(또는 계약 담당자)에 핸드오프
9) AM(또는 계약 담당자): 중도금 등 계약 이행
10) PM: 프로젝트 종료(execution done) 및 (필요 시) 운영 전환 핸드오프 준비
11) AM: 최종 잔금 및 계약 관계 마무리
12) (조건부) SM: 운영 전환 프로젝트의 경우 핸드오프 수령 후 운영

### 5.2 고객 요청 베이스 프로젝트
1) 고객: 요청
2) AM: 요청 확인 후 opportunity로 관리(검토/딜/제안)
3) AM: 계약
4) 이후 PM으로 넘어가는 프로세스는 동일

> 운영 전환 여부는 프로젝트 종료(Close) 이벤트에서 결정한다.  
> 운영 전환이면 SM이 인계를 받고, 아니면 결과를 남기고 종료한다.

---

## 6. 제품 전략: 단계별 구축(Progressive Delivery)

### 6.1 MVP-0: “일을 모으는 마스터 허브”
보고/템플릿/자동화보다 먼저 아래 목록을 한 곳에 모아 검색/필터/연결 조회가 가능하도록 한다.

마스터 오브젝트(최초 범위)
1) Customer(고객)
2) Plant/Site(플랜트/사이트)
3) System Catalog(시스템 종류/계층)
4) System Instance(고객/플랜트별 시스템 인스턴스 + 운영 주체 구분)
5) Integration(시스템 간 인터페이스)
6) Project(통합 단일 엔티티: opportunity/execution을 상태로 표현)
7) User(사람: 내부 직원 + 외부 이해관계자, 시스템 사용 여부로 구분)

> MVP-0에서는 “단계/핸드오프/종료조건/산출물/태스크”를 강하게 도입하지 않는다.  
> 우선 “어디에 어떤 일이 있고 누가 들고 있는지”를 보이게 한다.

### 6.2 MVP-1: 상태/단계 + 전환/종료 이벤트 적용
- `status_code(opportunity/execution)` + `stage_code(waiting/in_progress/done)` 적용
- 기회 완료 시 `done_result(won/lost/hold)`로 결과 구분
- 계약 체결 시 execution으로 전환
- 종료 시점에 운영 전환 여부 선택(운영 전환이면 SM 지정)

### 6.3 MVP-2: 핸드오프(Handoff) 트랙/로그 적용
- 기회→PM(실행 인계)
- 기회→계약담당(AM 등) (계약 진행 인계)
- 실행→계약이행 담당(중도금/정산 등)
- 실행→SM(운영 전환)
- 필요 시 인계 패킷/체크리스트로 확장

### 6.4 MVP-3: 산출물/종료조건(프로젝트 관리 실체화)
- 산출물 마스터/템플릿/프로젝트 제출 상태 관리
- 종료조건 체크리스트/템플릿 관리
- `requires_deliverable=true` 종료조건에 대해 산출물 `confirmed` 기반 검증(Validation) 적용

### 6.5 MVP-4: 태스크/이슈/리스크 + 자동 리포트/대시보드
- 마일스톤/태스크/이슈/리스크는 “핵심 프로젝트부터” 단계적으로 적용
- 데이터가 쌓이면 수작업 PPT 취합/보고 비용이 자연스럽게 감소한다.

---

## 7. 데이터/모델링 요약(High-level)
- Customer 1:N Plant
- System Catalog는 parent-child 계층 가능
- Customer/Plant 기준으로 System Instance 생성
- System Instance 간 Integration(인터페이스) 관계 생성 가능
- Project는 Customer 필수 연결, Plant/System Instance는 선택 연결
- 내부 User는 Project/System의 오너/담당으로 할당된다
- 외부 User(고객사 담당자 등)도 프로젝트 이해관계자로 매핑될 수 있으며, 필요 시 초대를 통해 시스템 사용 가능
- Opportunity는 별도 테이블이 아니라 Project의 상태(status_code=opportunity)로 표현된다

---

## 8. 문서/DB 규칙
- DB 및 테이블 설계 룰은 `docs/database/rules.md`를 따른다.
- DB 생성 및 접속 정보는 `docs/database/README.md`를 따른다.
- 문서 전체 네비게이션(경로 인덱스)은 `docs/service/navigation.md`에서 관리한다.

---

## 9. 기술 스택 및 환경

### 데이터베이스
- **DBMS**: PostgreSQL
- **ORM**: Prisma 6.x
- **스키마 관리**: `packages/database/prisma/schema.prisma`
  - Prisma `db push`로 테이블 생성/동기화
  - 새 환경 배포 시: DB/User 생성 → `prisma db push` → Seed 데이터 삽입
- **히스토리 관리**: 하이브리드 방식 (DB 트리거 + Prisma Extension)
  - Prisma 6.x에서 `$use()` deprecated → `$extends()` Extension 사용

### 개발 환경 실행

```powershell
# 루트에서 전체 실행 (백엔드 + 프론트엔드)
cd c:\WorkSpace\dev\source\hwista-ssoo
pnpm run dev

# 개별 실행
pnpm run dev:server   # 백엔드만 (http://localhost:4000)
pnpm run dev:web      # 프론트엔드만 (http://localhost:3000)
```

### 서비스 URL
| 서비스 | URL | 설명 |
|--------|-----|------|
| Frontend | http://localhost:3000 | Next.js 웹 애플리케이션 |
| Backend | http://localhost:4000 | NestJS API 서버 |
| API Docs | http://localhost:4000/api/docs | Swagger UI |

### Prisma 모델 (현재 정의)

**Master Tables (마스터)**
| 도메인 | 모델 | 테이블 |
|--------|------|--------|
| 공통 | `CmCode` | cm_code_m |
| 사용자 | `User` | cm_user_m |
| 프로젝트 | `Project`, `ProjectStatus` | pr_project_m, pr_project_status_m |
| 산출물 | `Deliverable`, `DeliverableGroup`, `DeliverableGroupItem` | pr_deliverable_m, pr_deliverable_group_m, pr_deliverable_group_item_r_m |
| 종료조건 | `CloseConditionGroup`, `CloseConditionGroupItem` | pr_close_condition_group_m, pr_close_condition_group_item_r_m |
| 프로젝트 관계 | `ProjectDeliverable`, `ProjectCloseCondition` | pr_project_deliverable_r_m, pr_project_close_condition_r_m |

**History Tables (히스토리)**
| 도메인 | 모델 | 테이블 |
|--------|------|--------|
| 공통 | `CmCodeHistory` | cm_code_h |
| 사용자 | `UserHistory` | cm_user_h |
| 프로젝트 | `ProjectHistory`, `ProjectStatusHistory` | pr_project_h, pr_project_status_h |
| 산출물 | `DeliverableHistory`, `DeliverableGroupHistory`, `DeliverableGroupItemHistory` | pr_deliverable_h, pr_deliverable_group_h, pr_deliverable_group_item_r_h |
| 종료조건 | `CloseConditionGroupHistory`, `CloseConditionGroupItemHistory` | pr_close_condition_group_h, pr_close_condition_group_item_r_h |
| 프로젝트 관계 | `ProjectDeliverableHistory`, `ProjectCloseConditionHistory` | pr_project_deliverable_r_h, pr_project_close_condition_r_h |

---

## 10. 용어집(Glossary)
- **Opportunity**: 계약 전 기회(요청/제안 기반의 프로젝트 가능성)
- **Project**: 단일 엔티티(상태로 opportunity/execution을 표현)
- **System**: 운영 대상/관리 자산(프로젝트와 독립적으로도 존재)
- **Handoff**: 역할 간 인계 이벤트(영업/AM/PM/SM)
- **User**: 조직 내/외 사람. 시스템 사용 여부(`is_system_user`)로 로그인 가능 여부 구분
- **System User**: `is_system_user=true`인 사용자. 로그인하여 시스템 기능 사용 가능
- **Close Condition**: 종료 조건 체크리스트(템플릿 적용 가능, 산출물 기반 검증 가능)
- **Deliverable**: 표준 산출물 + 프로젝트 제출/확정 관리(템플릿 적용 가능)
- **SSOT**: Single Source of Truth, 한 곳에서 연결/현황을 확인할 수 있는 기준 데이터
- **Prisma Extension**: Prisma 6.x에서 클라이언트 동작을 확장하는 방식 (`$extends()`)
- **History Trigger**: 마스터 테이블 변경 시 자동으로 히스토리 테이블에 기록하는 DB 트리거
