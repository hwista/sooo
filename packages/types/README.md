# @ssoo/types

> SSOO 서비스의 공통 타입 정의 패키지

---

## 📋 개요

`@ssoo/types`는 Server(NestJS)와 Web(Next.js) 간에 **공유되는 TypeScript 타입**을 정의하는 패키지입니다.

### 왜 이렇게 만들어졌나?

```
기존 방식 (타입 분리)
├── server/types/project.ts    ← 서버용 타입
├── web/types/project.ts       ← 웹용 타입 (복사본)
└── 문제: 동기화 안 됨, 타입 불일치 버그 발생

현재 방식 (타입 공유)
├── packages/types/            ← 단일 소스
│   └── src/project.ts
├── server → import from '@ssoo/types'
└── web → import from '@ssoo/types'
    └── 장점: 공유 기준 통일, 컴파일 타임 검증
```

---

## 📁 구조

```
packages/types/
├── src/
│   ├── index.ts        # 엔트리포인트 (common, pms re-export)
│   ├── common/         # 공통 타입
│   │   ├── index.ts
│   │   ├── api.ts      # API 관련 (ApiResponse, Pagination)
│   │   └── user.ts     # 사용자 관련 타입
│   ├── pms/            # PMS 전용 타입
│   │   ├── index.ts
│   │   ├── customer.ts # 고객 관련 타입
│   │   └── project.ts  # 프로젝트 관련 타입
│   └── dms/            # DMS 전용 타입 (예약)
├── dist/               # 빌드 결과물 (JS + d.ts)
├── package.json
└── tsconfig.json
```

---

## 🔧 포함된 타입

### common — 공통 타입

```typescript
// common/api.ts - API 응답 래퍼
import { ApiResponse, PaginationParams } from '@ssoo/types/common';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { page?: number; limit?: number; total?: number };
}

// common/user.ts - 사용자
type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateUserDto { ... }
interface UpdateUserDto { ... }
```

### customer.ts — 고객사 읽기 조회

```typescript
interface Customer {
  id: string;
  customerCode: string;
  customerName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### project.ts — 프로젝트

```typescript
// 상태 코드 (request, proposal, execution, transition)
type ProjectStatusCode = 'request' | 'proposal' | 'execution' | 'transition';

// 단계 코드
type ProjectStageCode = 'waiting' | 'in_progress' | 'done';

// 종료 결과 코드
type DoneResultCode =
  | 'accepted'
  | 'rejected'
  | 'won'
  | 'lost'
  | 'completed'
  | 'cancelled'
  | 'transferred'
  | 'hold';

interface Project {
  id: string;
  projectName: string;
  memo?: string | null;
  customerId?: string | null;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  doneResultCode?: DoneResultCode;
  currentOwnerUserId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateProjectDto { ... }
interface UpdateProjectDto { ... }
```

---

## ✅ 타입 커버리지 기준

`@ssoo/types`는 **API 계약/DTO/뷰 모델**에 초점을 둡니다.  
DB 스키마와 1:1 매핑이 아닌 경우가 있으므로, 아래 표로 범위를 관리합니다.

| 타입 | 대상 | 상태 | 비고 |
|------|------|------|------|
| `User` | Prisma `User` (cm_user_m) | partial | 인증/프로필 핵심 필드만 노출 |
| `Project` | Prisma `Project` (pr_project_m) | partial | 핵심 상태/소유자 중심 |
| `Customer` | - | planned | DB 모델 미정(삭제/통합 가능) |

> DB 필드와 1:1 매핑이 필요한 타입은 상태를 `aligned`로 명시합니다.

---

## 📦 사용 방법

### 다른 패키지에서 import

```typescript
// apps/server에서
import { Project, CreateProjectDto, ApiResponse } from '@ssoo/types';

// apps/web-pms에서
import type { Project, ApiResponse } from '@ssoo/types';
```

---

## 🛠 개발 명령어

```powershell
# 빌드 (일반 환경)
pnpm build

# 빌드 (보안 환경 - node 직접 실행)
node ./node_modules/typescript/lib/tsc.js --project tsconfig.json

# Watch 모드
pnpm dev
```

---

## 📌 타입 추가 가이드

새로운 도메인 타입 추가 시:

1. `src/` 폴더에 새 파일 생성 (예: `src/handoff.ts`)
2. 타입/인터페이스 정의
3. `src/index.ts`에 re-export 추가
4. 빌드 후 다른 패키지에서 사용

```typescript
// src/handoff.ts
export type HandoffTypeCode = 'PRE_TO_PM' | 'EXEC_TO_SM' | ...;
export interface Handoff { ... }

// src/index.ts
export * from './handoff';
```
