# Database Overview (ssoo / 3355)

## 1) Service / Naming
- **Service Name**: `ssoo`
  - 서비스 컨셉: "삼삼오오(3355) 모여서 일한다"
- **DBMS**: PostgreSQL

---

## 2) PostgreSQL Schema 구조

### 스키마 분리 (Multi-Schema)
도메인별 테이블 분리를 위해 PostgreSQL 스키마를 사용합니다.

| 스키마 | 접두사 | 설명 | 테이블 수 |
|--------|--------|------|-----------|
| `common` | `cm_` | 공통 사용자 (모든 시스템 공유) | 2개 |
| `pms` | `cm_`, `pr_` | PMS 전용 (코드, 메뉴, 프로젝트) | 27개 |
| `dms` | `dm_` | 문서 관리 시스템 (미래 확장) | 0개 |

### Prisma multiSchema 설정
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["common", "pms", "dms"]
}
```

> **Note**: Prisma 6.x부터 `multiSchema`가 stable 기능으로 전환되어 `previewFeatures` 설정이 필요 없습니다.

---

## 3) Connection Info

### 개발 환경 (Local)
| 항목 | 값 |
|------|-----|
| Host | `localhost` |
| Port | `5432` |
| Database | `appdb` |
| User | `appuser` |
| Password | `app_pw` |
| Schemas | `common`, `pms`, `dms` |

### Connection String
```
postgresql://appuser:app_pw@localhost:5432/appdb?schema=common
```

---

## 4) Roles / Users
- **Application DB User**: `appuser`
- **Purpose**: 애플리케이션이 DB에 접속해 CRUD 수행, 테이블/스키마 운영

### User 생성
```sql
CREATE USER appuser WITH PASSWORD 'app_pw';
ALTER ROLE appuser CREATEDB;
```

### Database 생성
```sql
CREATE DATABASE appdb 
  WITH OWNER = appuser
       ENCODING = 'UTF8'
       TEMPLATE = template1;

GRANT ALL PRIVILEGES ON DATABASE appdb TO appuser;
```

### Schema 권한 부여 (중요!)
> 다중 스키마 환경에서 appuser에게 모든 스키마 권한 부여

```sql
-- 스키마 생성 및 권한 부여
CREATE SCHEMA IF NOT EXISTS common;
CREATE SCHEMA IF NOT EXISTS pms;
CREATE SCHEMA IF NOT EXISTS dms;

GRANT ALL ON SCHEMA common TO appuser;
GRANT ALL ON SCHEMA pms TO appuser;
GRANT ALL ON SCHEMA dms TO appuser;

-- 각 스키마 내 객체 권한
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA common TO appuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA common TO appuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA pms TO appuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA pms TO appuser;

-- search_path 설정
ALTER DATABASE appdb SET search_path TO common, pms, dms, public;
```

---

## 5) Prisma 설정

### .env 파일 위치
- 루트: `/.env`
- 패키지: `/packages/database/.env`

### .env 내용
```dotenv
DATABASE_URL="postgresql://appuser:app_pw@localhost:5432/appdb"
```

### Prisma 명령어 (보안 환경)
```powershell
# 환경 변수 설정 (SSL 우회 - 개발 환경만)
$env:NODE_TLS_REJECT_UNAUTHORIZED=0

# 스키마 Push (테이블 생성/동기화)
cd packages/database
node ./node_modules/prisma/build/index.js db push

# Prisma Client 생성
node ./node_modules/prisma/build/index.js generate

# 마이그레이션 생성
node ./node_modules/prisma/build/index.js migrate dev --name <migration_name>
```

---

## 6) 테이블 목록

### 현재 테이블 (Prisma 관리)

#### 공통 사용자 테이블 - `common` 스키마
> 모든 시스템(PMS, DMS)에서 공유하는 사용자 정보

| Prisma Model | 테이블명 | 설명 | 정의서 |
|--------------|----------|------|--------|
| `User` | `cm_user_m` | 사용자 마스터 | [cm_user.md](./tables/cm_user.md) |
| `UserHistory` | `cm_user_h` | 사용자 히스토리 | - |

#### PMS 전용 테이블 - `pms` 스키마
> PMS에서만 사용하는 테이블 (DMS는 별도 코드/메뉴 테이블 사용 예정)

**공통 코드 (CM)**
| Prisma Model | 테이블명 | 설명 | 정의서 |
|--------------|----------|------|--------|
| `CmCode` | `cm_code_m` | 공통 코드 마스터 | [cm_code.md](./tables/cm_code.md) |
| `CmCodeHistory` | `cm_code_h` | 공통 코드 히스토리 | - |

**메뉴 (CM)**
| Prisma Model | 테이블명 | 설명 | 정의서 |
|--------------|----------|------|--------|
| `Menu` | `cm_menu_m` | 메뉴 마스터 | [cm_menu.md](./tables/cm_menu.md) |
| `MenuHistory` | `cm_menu_h` | 메뉴 히스토리 | - |
| `RoleMenu` | `cm_role_menu_r` | 역할별 메뉴 권한 | [cm_role_menu.md](./tables/cm_role_menu.md) |
| `RoleMenuHistory` | `cm_role_menu_h` | 역할별 메뉴 권한 히스토리 | - |
| `UserMenu` | `cm_user_menu_r` | 사용자별 메뉴 권한 예외 | [cm_user_menu.md](./tables/cm_user_menu.md) |
| `UserMenuHistory` | `cm_user_menu_h` | 사용자별 메뉴 권한 히스토리 | - |
| `UserFavorite` | `cm_user_favorite_r` | 사용자 즐겨찾기 메뉴 | [cm_user_favorite.md](./tables/cm_user_favorite.md) |

**프로젝트 (PR)**
| Prisma Model | 테이블명 | 설명 | 정의서 |
|--------------|----------|------|--------|
| `Project` | `pr_project_m` | 프로젝트 마스터 | [pr_project.md](./tables/pr_project.md) |
| `ProjectStatus` | `pr_project_status_m` | 프로젝트 상태 상세 | [pr_project_status.md](./tables/pr_project_status.md) |
| `Deliverable` | `pr_deliverable_m` | 산출물 마스터 | [pr_deliverable.md](./tables/pr_deliverable.md) |
| `DeliverableGroup` | `pr_deliverable_group_m` | 산출물 그룹 템플릿 | [pr_deliverable_group.md](./tables/pr_deliverable_group.md) |
| `DeliverableGroupItem` | `pr_deliverable_group_item_r_m` | 산출물 그룹-항목 매핑 | [pr_deliverable_group_item.md](./tables/pr_deliverable_group_item.md) |
| `CloseConditionGroup` | `pr_close_condition_group_m` | 종료조건 그룹 템플릿 | [pr_close_condition_group.md](./tables/pr_close_condition_group.md) |
| `CloseConditionGroupItem` | `pr_close_condition_group_item_r_m` | 종료조건 그룹-항목 매핑 | [pr_close_condition_group_item.md](./tables/pr_close_condition_group_item.md) |
| `ProjectDeliverable` | `pr_project_deliverable_r_m` | 프로젝트 산출물 관리 | [pr_project_deliverable.md](./tables/pr_project_deliverable.md) |
| `ProjectCloseCondition` | `pr_project_close_condition_r_m` | 프로젝트 종료조건 관리 | [pr_project_close_condition.md](./tables/pr_project_close_condition.md) |

### 테이블 생성 방식
> **Prisma 스키마 기반으로 테이블을 관리합니다.**
> - 새 환경에서는 `prisma db push`로 모든 테이블 생성
> - DDL 파일은 참조용 문서로 유지

### DDL 파일 위치 (참조용)
- `docs/pms/database/tables/ddl/`

### Seed 데이터 위치
- `docs/pms/database/tables/seeds/`
  - `user_code.sql` - 사용자 관련 코드 (USER_TYPE, USER_STATUS, USER_ROLE 등)
  - `user_initial_admin.sql` - 초기 관리자 계정
  - `project_stauts_code.sql` - 프로젝트 상태 코드
  - `project_deliverable_status.sql` - 산출물 제출 상태 코드
  - `project_close_condition.sql` - 종료조건 항목 코드
  - `project_handoff_type.sql` - 핸드오프 타입 코드
  - `menu_data.sql` - 초기 메뉴 구조
  - `role_menu_permission.sql` - 역할별 메뉴 권한 매핑

---

## 6) 새 환경 셋업 가이드

### Step 1: PostgreSQL DB/User 생성
```sql
-- 사용자 생성
CREATE USER appuser WITH PASSWORD 'app_pw';
ALTER ROLE appuser CREATEDB;

-- DB 생성
CREATE DATABASE appdb 
  WITH OWNER = appuser
       ENCODING = 'UTF8';

GRANT ALL PRIVILEGES ON DATABASE appdb TO appuser;
```

### Step 2: Prisma로 테이블 생성
```powershell
cd packages/database
$env:NODE_TLS_REJECT_UNAUTHORIZED=0
node ./node_modules/prisma/build/index.js db push
```

### Step 3: 히스토리 트리거 설치
```powershell
cd packages/database
npx ts-node scripts/apply-triggers.ts
```

### Step 4: Seed 데이터 삽입
```powershell
# psql 또는 DBeaver에서 seeds/*.sql 실행
```

---

## 7) 히스토리 관리 (Hybrid Approach)

### 개요
SSOO는 **하이브리드 방식**으로 히스토리를 관리합니다:
- **DB 트리거**: INSERT/UPDATE/DELETE 시 자동으로 히스토리 테이블에 기록
- **Prisma Extension**: 공통 컬럼(transactionId, lastSource, lastActivity) 자동 세팅

> **Note**: Prisma 6.x부터 `$use()` 미들웨어가 deprecated되어 `$extends()` Extension으로 변경됨

### 히스토리 트리거

#### 트리거 파일 위치
`packages/database/prisma/triggers/`

| 파일명 | 대상 테이블 | 히스토리 테이블 |
|--------|-------------|-----------------|
| `01_cm_code_h_trigger.sql` | `cm_code_m` | `cm_code_h` |
| `02_cm_user_h_trigger.sql` | `cm_user_m` | `cm_user_h` |
| `03_pr_project_h_trigger.sql` | `pr_project_m` | `pr_project_h` |
| `04_pr_project_status_h_trigger.sql` | `pr_project_status_m` | `pr_project_status_h` |
| `05_pr_deliverable_h_trigger.sql` | `pr_deliverable_m` | `pr_deliverable_h` |
| `06_pr_deliverable_group_h_trigger.sql` | `pr_deliverable_group_m` | `pr_deliverable_group_h` |
| `07_pr_deliverable_group_item_r_h_trigger.sql` | `pr_deliverable_group_item_r_m` | `pr_deliverable_group_item_r_h` |
| `08_pr_close_condition_group_h_trigger.sql` | `pr_close_condition_group_m` | `pr_close_condition_group_h` |
| `09_pr_close_condition_group_item_r_h_trigger.sql` | `pr_close_condition_group_item_r_m` | `pr_close_condition_group_item_r_h` |
| `10_pr_project_deliverable_r_h_trigger.sql` | `pr_project_deliverable_r_m` | `pr_project_deliverable_r_h` |
| `11_pr_project_close_condition_r_h_trigger.sql` | `pr_project_close_condition_r_m` | `pr_project_close_condition_r_h` |
| `12_cm_menu_h_trigger.sql` | `cm_menu_m` | `cm_menu_h` |
| `13_cm_role_menu_h_trigger.sql` | `cm_role_menu_r` | `cm_role_menu_h` |
| `14_cm_user_menu_h_trigger.sql` | `cm_user_menu_r` | `cm_user_menu_h` |

#### 트리거 동작
1. **INSERT**: `event_type='C'`로 히스토리에 스냅샷 저장
2. **UPDATE**: `event_type='U'`로 히스토리에 스냅샷 저장
3. **DELETE**: `event_type='D'`로 삭제 전 데이터 스냅샷 저장

#### 트리거 설치/재설치
```powershell
cd packages/database
npx ts-node scripts/apply-triggers.ts
```

#### SQL 스크립트 실행
```powershell
cd packages/database
# 파일 실행
npx ts-node scripts/run-sql.ts --file ../../docs/pms/database/tables/seeds/menu_data.sql

# 쿼리 실행
npx ts-node scripts/run-sql.ts --query "SELECT * FROM cm_menu_m"
```

### Prisma Extension

#### 위치
`packages/database/src/extensions/common-columns.extension.ts`

#### 기능
- `commonColumnsExtension`: CREATE/UPDATE 시 공통 컬럼 자동 세팅 (Prisma 6.x)
  - `transactionId`: 요청 컨텍스트에서 UUID 가져오기
  - `lastSource`: 변경 출처 (API, BATCH 등)
  - `lastActivity`: 마지막 활동 정보
  - `createdBy`, `updatedBy`: 사용자 ID

### NestJS 인터셉터

#### 위치
`apps/server/src/common/interceptors/request-context.interceptor.ts`

#### 기능
- 요청마다 고유 `transactionId` 생성
- JWT에서 사용자 ID 추출하여 컨텍스트에 저장
- `AsyncLocalStorage`를 통해 요청 스코프 격리

---

## 8) 확장 예정 테이블

> 현재 Prisma 스키마에는 포함되지 않으며, 필요 시 도입한다.

| 테이블 | 설명 | 정의서 |
|--------|------|--------|
| `cm_dept_menu_r` | 부서별 메뉴 권한 (확장용) | [cm_dept_menu.md](./tables/cm_dept_menu.md) |

---

## 9) 참고 문서
- [Database Design Rules](./rules.md)
- [History Management Guide](./history-management.md)
- [Prisma Schema](../../../packages/database/prisma/schema.prisma)
- [User Invitation Flow](../domain/actions/user_invitation.md)
- [User Login Flow](../domain/actions/user_login.md)

---

## Backlog

> 이 영역 관련 개선/추가 예정 항목

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| DB-01 | 인덱스 최적화 검토 | P3 | 🔲 대기 |
| DB-02 | 소프트 딜리트 정책 수립 | P2 | 🔲 대기 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | cm_user_favorite_r 테이블에 soft delete (is_active) 적용 |
| 2026-01-20 | 데이터베이스 문서 최초 작성 |
