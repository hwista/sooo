# Database 패키지 명세서

> 📅 기준일: 2026-01-27  
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

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-27 | 초기 작성 - 현행 패키지 기준 |
