# Database 패키지 명세서

> 📅 기준일: 2026-02-02  
> 📦 패키지명: `@ssoo/database` v0.0.1

---

## 1. 개요

| 항목 | 값 |
|------|-----|
| **프로젝트명** | @ssoo/database |
| **경로** | `packages/database/` |
| **용도** | Prisma ORM 및 DB 스키마 관리 |
| **DBMS** | PostgreSQL 15+ |
| **모듈 타입** | ESM (`"type": "module"`) |

---

## 2. Prisma ORM

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `prisma` | ^6.2.0 | Prisma CLI (dev) |
| `@prisma/client` | ^6.2.0 | Prisma 클라이언트 |

---

## 3. 데이터베이스

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `pg` | ^8.17.1 | PostgreSQL 드라이버 |
| `dotenv` | ^17.2.3 | 환경 변수 로드 |

---

## 4. 문서화 도구

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `prisma-dbml-generator` | ^0.12.0 | Prisma → DBML 변환 |
| `@dbml/cli` | ^5.4.1 | DBML CLI 도구 |
| `@softwaretechnik/dbml-renderer` | ^1.0.31 | DBML → SVG/PNG 렌더링 |

---

## 5. 개발 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `typescript` | ^5.7.0 | 타입 시스템 |
| `@types/node` | ^22.0.0 | Node.js 타입 |
| `@types/pg` | ^8.16.0 | PostgreSQL 타입 |
| `rimraf` | ^6.0.0 | 디렉토리 삭제 유틸 |

---

## 6. 멀티스키마 구조

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["common", "pms", "dms"]
}
```

| 스키마 | 접두사 | 용도 |
|--------|--------|------|
| `common` | `cm_user_*` | 공통 사용자 관리 |
| `pms` | `cm_*`, `pr_*` | PMS 전용 |
| `dms` | `dm_*` | DMS 전용 (예정) |

---

## 7. Export 구조

```typescript
// src/index.ts
export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';
```

---

## 8. 스크립트

```json
{
  "build": "tsc",
  "clean": "rimraf dist",
  "dev": "tsc --watch",
  "db:generate": "prisma generate",
  "db:push": "prisma db push",
  "db:migrate": "prisma migrate dev",
  "db:studio": "prisma studio",
  "docs:db:dbml": "prisma generate --schema prisma/schema.prisma",
  "docs:db:split": "node scripts/split-dbml.js",
  "docs:db:export": "node scripts/export-dbml.js",
  "docs:db:render": "node scripts/render-dbml.js",
  "docs:db": "pnpm run docs:db:dbml && pnpm run docs:db:split && pnpm run docs:db:export && pnpm run docs:db:render"
}
```

---

## 9. 디렉토리 구조

```
packages/database/
├── prisma/
│   ├── schema.prisma       # 메인 스키마
│   ├── seeds/              # 초기 데이터 SQL
│   └── triggers/           # 히스토리 트리거 SQL
├── scripts/
│   ├── split-dbml.js       # DBML 분리 스크립트
│   ├── export-dbml.js      # DBML 내보내기
│   └── render-dbml.js      # ERD 렌더링
├── src/
│   └── index.ts            # 엔트리포인트
├── dist/                   # 빌드 결과물
└── package.json
```

---

## 10. 테이블 네이밍 규칙

### 테이블명 패턴

```
{스키마접두사}_{도메인}_{유형}

예: cm_user_m, pr_project_m, pr_project_member_r
```

| 유형 | 접미사 | 설명 | 예시 |
|------|--------|------|------|
| 마스터 | `_m` | 주요 엔티티 | `cm_user_m`, `pr_project_m` |
| 상세 | `_d` | 마스터의 상세 정보 | `pr_project_d` |
| 히스토리 | `_h` | 변경 이력 | `cm_user_h`, `pr_project_h` |
| 관계 | `_r` | N:M 매핑 테이블 | `pr_project_member_r` |
| 관계 마스터 | `_r_m` | N:M 매핑 + 추가 속성 | `pr_deliverable_group_item_r_m` |
| 관계 히스토리 | `_r_h` | 관계 테이블 변경 이력 | `pr_deliverable_group_item_r_h` |

### 스키마별 접두사

| 스키마 | 접두사 | 예시 |
|--------|--------|------|
| `common` | `cm_` | `cm_user_m`, `cm_code_m` |
| `pms` | `pr_` | `pr_project_m`, `pr_menu_m` |
| `dms` | `dm_` | `dm_document_m` (예정) |

### 컬럼명 규칙

```
snake_case

공통 컬럼 (모든 마스터 테이블 필수):
- id: BIGINT, PK, Auto Increment
- created_at: TIMESTAMP, DEFAULT NOW()
- updated_at: TIMESTAMP, ON UPDATE
- created_by: BIGINT, FK to cm_user_m
- updated_by: BIGINT, FK to cm_user_m
```

---

## 11. 새 테이블 추가 체크리스트

새 테이블 추가 시 다음 8단계를 순서대로 수행합니다:

### 체크리스트

- [ ] **1. Prisma 모델 정의** - `prisma/schema.prisma`에 모델 추가
- [ ] **2. 히스토리 모델 정의** - 변경 추적 필요 시 `_h` 테이블 추가
- [ ] **3. db:push 실행** - `pnpm --filter database db:push`
- [ ] **4. 트리거 SQL 작성** - `prisma/triggers/`에 히스토리 트리거 추가
- [ ] **5. 트리거 등록** - `prisma/triggers/install-triggers.sql`에 추가
- [ ] **6. 트리거 설치** - SQL 실행하여 트리거 적용
- [ ] **7. 문서 업데이트** - ERD 재생성 (`pnpm docs:db`)
- [ ] **8. Changelog 추가** - 변경 이력 기록

### 트리거 SQL 템플릿

```sql
-- 히스토리 트리거 함수
CREATE OR REPLACE FUNCTION {schema}.fn_{table}_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    INSERT INTO {schema}.{table}_h (
      -- 원본 테이블 컬럼들
      history_action,
      history_at
    ) VALUES (
      -- OLD 값들
      TG_OP,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trg_{table}_history
AFTER UPDATE OR DELETE ON {schema}.{table}
FOR EACH ROW EXECUTE FUNCTION {schema}.fn_{table}_history();
```

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-27 | 초기 작성 - 현행 패키지 기준 |
| 2026-02-05 | 테이블 네이밍 규칙, 새 테이블 추가 체크리스트 추가 |
