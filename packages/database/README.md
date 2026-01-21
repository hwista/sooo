# @ssoo/database

> SSOO 서비스의 데이터베이스 스키마 및 Prisma 클라이언트 패키지

---

## 📋 개요

`@ssoo/database`는 **Prisma ORM**을 사용하여 데이터베이스 스키마를 정의하고, 타입 안전한 DB 클라이언트를 제공하는 패키지입니다.

### 왜 이렇게 만들어졌나?

```
Prisma를 별도 패키지로 분리한 이유:

1. 스키마 중앙화
   └── DB 스키마 변경이 한 곳에서만 이루어짐

2. 클라이언트 공유
   └── 여러 서비스에서 동일한 Prisma 클라이언트 사용 가능

3. 마이그레이션 관리
   └── DB 버전 관리가 독립적으로 가능
```

---

## 📁 구조

```
packages/database/
├── prisma/
│   └── schema.prisma    # 데이터베이스 스키마 정의
├── src/
│   └── index.ts         # Prisma 클라이언트 export
├── dist/                # 빌드 결과물
├── package.json
└── tsconfig.json
```

---

## 🗄️ 데이터베이스 스키마

### User (사용자)

```prisma
model User {
  id           BigInt   @id @default(autoincrement()) @map("user_id")
  loginId      String?  @unique @map("login_id")
  userName     String   @map("user_name")
  email        String   @unique
  roleCode     String   @default("viewer") @map("role_code") // admin, manager, user, viewer
  userTypeCode String   @default("internal") @map("user_type_code")
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("cm_user_m")
}
```

### Customer (고객)

```prisma
model Customer {
  id          String   @id @default(cuid())
  name        String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  projects Project[]

  @@map("customers")
}
```

### Project (프로젝트)

```prisma
model Project {
  id              BigInt   @id @default(autoincrement()) @map("project_id")
  projectName     String   @map("project_name")
  statusCode      String   @map("status_code") // request, proposal, execution, transition
  stageCode       String   @map("stage_code") // waiting, in_progress, done
  doneResultCode  String?  @map("done_result_code")
  currentOwnerUserId BigInt? @map("current_owner_user_id")
  customerId      BigInt?  @map("customer_id")
  memo            String?
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("pr_project_m")
}
```

---

## 🔧 Prisma 클라이언트

### 싱글톤 패턴

```typescript
// src/index.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';
export default prisma;
```

**왜 싱글톤인가?**
- Next.js의 Hot Reload 시 매번 새 연결 생성 방지
- 개발 환경에서 DB 연결 풀 고갈 방지

---

## 📦 사용 방법

### Server에서 사용

```typescript
// apps/server/src/project/project.service.ts
import { prisma } from '@ssoo/database';

async findAll() {
  return prisma.project.findMany({
    include: { customer: true, owner: true }
  });
}
```

---

## 🛠 개발 명령어

```powershell
# Prisma 클라이언트 생성 (일반 환경)
pnpm db:generate

# Prisma 클라이언트 생성 (보안 환경)
$env:NODE_TLS_REJECT_UNAUTHORIZED=0
node ./node_modules/prisma/build/index.js generate

# DB 스키마 적용 (개발용 - 마이그레이션 없이)
pnpm db:push

# 마이그레이션 생성 및 적용
pnpm db:migrate

# Prisma Studio (DB GUI)
pnpm db:studio

# TypeScript 빌드 (보안 환경)
node ./node_modules/typescript/lib/tsc.js --project tsconfig.json
```

---

## 🔗 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@prisma/client` | ^6.x | Prisma ORM 클라이언트 |
| `prisma` | ^6.x | Prisma CLI (개발용) |
| `typescript` | ^5.x | TypeScript 컴파일러 |
| `@types/node` | ^22.x | Node.js 타입 정의 |

---

## 📌 스키마 변경 가이드

1. `prisma/schema.prisma` 수정
2. Prisma 클라이언트 재생성: `pnpm db:generate`
3. DB에 적용: `pnpm db:push` (개발) 또는 `pnpm db:migrate` (운영)
4. 필요시 `@ssoo/types`에 해당 타입 추가

---

## 🌱 Seed 데이터

초기 데이터는 `prisma/seeds/` 폴더에서 관리됩니다.

### 파일 구조

| 파일 | 설명 |
|------|------|
| `00_user_code.sql` | 사용자 유형/상태 코드 |
| `01_project_status_code.sql` | 프로젝트 상태 코드 |
| `02_project_deliverable_status.sql` | 산출물 제출 상태 |
| `03_project_close_condition.sql` | 종료조건 코드 |
| `04_project_handoff_type.sql` | 핸드오프 유형 |
| `05_menu_data.sql` | 메뉴 마스터 데이터 |
| `06_role_menu_permission.sql` | 역할별 메뉴 권한 |
| `07_user_menu_permission.sql` | 사용자별 메뉴 권한 |
| `99_user_initial_admin.sql` | 초기 관리자 계정 |
| `apply_all_seeds.sql` | 전체 실행 스크립트 |

### 실행 방법

```powershell
# 전체 실행
psql -U <user> -d <database> -f prisma/seeds/apply_all_seeds.sql

# 개별 실행
psql -U <user> -d <database> -f prisma/seeds/00_user_code.sql
```
