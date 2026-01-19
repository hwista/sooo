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
    └── 장점: 타입 100% 동기화, 컴파일 타임 검증
```

---

## 📁 구조

```
packages/types/
├── src/
│   ├── index.ts        # 엔트리포인트 (모든 타입 re-export)
│   ├── common.ts       # 공통 타입 (ApiResponse, Pagination 등)
│   ├── user.ts         # 사용자 관련 타입/DTO
│   ├── customer.ts     # 고객 관련 타입/DTO
│   └── project.ts      # 프로젝트 관련 타입/DTO
├── dist/               # 빌드 결과물 (JS + d.ts)
├── package.json
└── tsconfig.json
```

---

## 🔧 포함된 타입

### common.ts — 공통 타입

```typescript
// API 응답 래퍼
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { page?: number; limit?: number; total?: number };
}

// 페이지네이션 파라미터
interface PaginationParams {
  page?: number;
  limit?: number;
}
```

### user.ts — 사용자

```typescript
type UserRole = 'sales' | 'am' | 'pm' | 'sm' | 'admin';

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

### customer.ts — 고객

```typescript
interface Customer {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateCustomerDto { ... }
interface UpdateCustomerDto { ... }
```

### project.ts — 프로젝트

```typescript
// 상태 코드 (opportunity: 기회, execution: 실행)
type ProjectStatusCode = 'opportunity' | 'execution';

// 단계 코드
type ProjectStageCode = 'waiting' | 'in_progress' | 'done';

// 기회 종료 결과 (opportunity + done일 때만)
type DoneResultCode = 'won' | 'lost' | 'hold';

interface Project {
  id: string;
  name: string;
  description?: string;
  customerId: string;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  doneResultCode?: DoneResultCode;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateProjectDto { ... }
interface UpdateProjectDto { ... }
```

---

## 📦 사용 방법

### 다른 패키지에서 import

```typescript
// apps/server에서
import { Project, CreateProjectDto, ApiResponse } from '@ssoo/types';

// apps/web에서
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
