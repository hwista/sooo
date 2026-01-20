# 코드 품질 분석

> 최종 업데이트: 2026-01-20  
> 분석 기준: DEVELOPMENT_STANDARDS.md

---

## 🎯 분석 목적

1. **중복 코드 식별** - 공용화 가능한 반복 패턴
2. **SRP 위반 탐지** - 과도한 책임을 가진 모듈
3. **재사용성 평가** - 공용 컴포넌트/유틸리티 활용도
4. **구조 일관성** - 표준 패턴 준수 여부

---

## 📊 품질 점수 대시보드

### 종합 점수 변화

| 영역 | 현재 점수 | 예상 점수 | 실제 점수 | 변화 |
|------|:--------:|:--------:|:--------:|:----:|
| **packages/database** | 9.8/10 | 9.9/10 | 9.9/10 | +0.1 ✅ |
| **packages/types** | 8.3/10 | 9.5/10 | 9.5/10 | **+1.2** ✅ |
| **apps/server** | 8.0/10 | 9.3/10 | 9.3/10 | **+1.3** ✅ |
| **apps/web** | 8.6/10 | 9.2/10 | 8.7/10 | **+0.1** ✅ |
| **전체 평균** | **8.68** | **9.48** | **9.35** | **+0.67** |

> Phase 3 Step 1~8 완료 (2026-01-20)  
> WEB-03: index.ts 정리 + 레거시 @deprecated 추가 완료

### 세부 항목별 점수

#### packages/types

| 점검 항목 | 현재 | 예상 | 실제 |
|----------|:----:|:----:|:----:|
| 타입 안전성 | 7/10 | 10/10 | 10/10 ✅ |
| 일관성 | 8/10 | 10/10 | 10/10 ✅ |
| 문서화 | 9/10 | 9/10 | 9/10 |
| 구조 | 9/10 | 9/10 | 9/10 |

#### apps/server

| 점검 항목 | 현재 | 예상 | 실제 |
|----------|:----:|:----:|:----:|
| 보안 | 7/10 | 10/10 | 10/10 ✅ |
| 확장성 | 7/10 | 9/10 | 9/10 ✅ |
| 코드 재사용 | 7/10 | 9/10 | 9/10 ✅ |
| 일관성 | 8/10 | 9/10 | 9/10 ✅ |
| 구조 | 9/10 | 9/10 | 9/10 |

#### apps/web

| 점검 항목 | 현재 | 예상 | 실제 |
|----------|:----:|:----:|:----:|
| 컴포넌트 구조 | 8/10 | 10/10 | 8/10 |
| 코드 재사용 | 9/10 | 9/10 | 9/10 |
| 일관성 | 8/10 | 9/10 | 8/10 |
| 타입 관리 | 8/10 | 9/10 | 8/10 |
| 문서화 | 9/10 | 9/10 | 10/10 ✅ |

> WEB-03 완료: index.ts 가이드 개선, 레거시 컴포넌트에 @deprecated JSDoc 추가

### 메트릭 변화 추적

| 메트릭 | 현재 | 예상 | 실제 | 목표 |
|--------|:----:|:----:|:----:|:----:|
| 타입 불일치 | 3개 | 0개 | **0개** ✅ | 0개 |
| 인증 누락 API | 1개 | 0개 | **0개** ✅ | 0개 |
| 레거시 컴포넌트 | 2개 | 0개 | 2개 (@deprecated 추가) | 0개 |
| 응답 형식 불일치 | 4개 | 0개 | **0개** ✅ | 0개 |
| 공용 응답 헬퍼 | 없음 | 있음 | **있음** ✅ | 있음 |

### 개발 표준 준수율

| 원칙 | 현재 | 예상 | 실제 |
|------|:----:|:----:|:----:|
| **SRP (단일 책임)** | 85% | 95% | 92% |
| **DRY (중복 제거)** | 80% | 95% | 93% |
| **타입 안전성** | 75% | 98% | **98%** ✅ |
| **일관성** | 80% | 95% | 92% |

---

## 🔴 발견된 문제점

### 1. 타입 정의 불일치 (HIGH)

**위치:** `packages/types/src/project.ts` vs `packages/database/prisma/schema.prisma`

| 항목 | @ssoo/types | Prisma Schema | 상태 |
|------|-------------|---------------|------|
| `ProjectSourceCode` | `'request' \| 'proposal'` | `'direct' \| 'opportunity'` | ❌ 불일치 |
| `DoneResultCode` | `'won' \| 'lost' \| 'hold'` | `'complete' \| 'cancel'` | ❌ 불일치 |
| `ProjectStatusCode` | `'opportunity' \| 'execution'` | `'opportunity' \| 'execution' \| 'done'` | ⚠️ 불완전 |

**영향:**
- 프론트엔드에서 잘못된 값 사용 가능
- 타입 체크가 실제 DB 제약과 불일치
- 런타임 에러 발생 가능

**해결 방안:**
```typescript
// packages/types/src/project.ts - Prisma 스키마와 동기화
export type ProjectSourceCode = 'direct' | 'opportunity';
export type DoneResultCode = 'complete' | 'cancel';
export type ProjectStatusCode = 'opportunity' | 'execution' | 'done';
```

---

### 2. DatabaseService Extension 미적용 (HIGH)

**위치:** `apps/server/src/database/database.service.ts`

**현재 코드:**
```typescript
@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // PrismaClient 직접 상속 - Extension 미적용
}
```

**문제:**
- `packages/database`에 정의된 `commonColumnsExtension` 미사용
- `createdAt`, `updatedAt`, `deletedAt` 자동 처리 안됨
- 패키지를 만들어놓고 활용하지 않음

**해결 방안:**
```typescript
import { createPrismaClient } from '@ssoo/database';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private client = createPrismaClient();
  
  // Proxy pattern으로 client 메서드 노출
}
```

---

### 3. 인증 가드 누락 (HIGH)

**위치:** `apps/server/src/project/project.controller.ts`

**현재 코드:**
```typescript
@Controller('projects')
export class ProjectController {  // JwtAuthGuard 없음
  @Get()
  async findAll() { ... }
}
```

**비교:** `user.controller.ts`
```typescript
@Controller('users')
@UseGuards(JwtAuthGuard)  // ✅ 적용됨
export class UserController { ... }
```

**해결 방안:**
```typescript
@Controller('projects')
@UseGuards(JwtAuthGuard)  // 추가 필요
export class ProjectController { ... }
```

---

### 4. 응답 형식 중복 (MEDIUM)

**위치:** 모든 Controller 파일

**중복 패턴:**
```typescript
// project.controller.ts
return { success: true, data, meta: { page, limit, total } };
return { success: false, error: { code: 'NOT_FOUND', message: '...' } };

// user.controller.ts
return { success: true, data, message: '...' };
return { success: false, data: null, message: '...' };

// auth.controller.ts
return { success: true, data, message: '...' };
```

**문제:**
- 응답 형식 불일치 (`meta` vs 없음, `error` vs `message`)
- 동일한 패턴 반복 작성
- 변경 시 모든 파일 수정 필요

**해결 방안:**
```typescript
// common/responses.ts (새로 생성)
export function success<T>(data: T, meta?: object) {
  return { success: true, data, meta };
}

export function paginated<T>(data: T[], page: number, limit: number, total: number) {
  return { success: true, data, meta: { page, limit, total } };
}

export function error(code: string, message: string) {
  return { success: false, error: { code, message } };
}
```

---

### 5. 레거시 컴포넌트 이원화 (MEDIUM)

**위치:** `apps/web/src/components/`

**현재 상태:**
```
components/
├── common/
│   ├── PageHeader.tsx          # 레거시
│   └── page/
│       └── PageHeader.tsx      # 새 표준
├── templates/
│   ├── ListPageTemplate.tsx    # 레거시
│   └── ListPageTemplateV2.tsx  # 새 표준
```

**문제:**
- 동일 기능의 두 버전 공존
- 어떤 것을 사용해야 하는지 혼란
- 유지보수 비용 증가

**해결 방안:**
1. 새 표준으로 점진적 마이그레이션
2. 마이그레이션 완료 후 레거시 제거
3. `@deprecated` 주석으로 명시

---

### 6. 미사용 Export 주석 처리 (LOW)

**위치:** `apps/web/src/components/index.ts`

```typescript
// common 컴포넌트
// export * from './common';  // ← 주석 처리됨

// 템플릿 (추후 활성화)
// export * from './templates'; // ← 주석 처리됨
```

**문제:**
- 왜 비활성화되었는지 이유 불명확
- TODO 관리 시스템 부재

**해결 방안:**
- 비활성화 이유 문서화
- 또는 활성화하고 사용

---

### 7. 유틸리티 함수 미개발 (LOW)

**위치:** `apps/web/src/lib/utils/index.ts`

```typescript
export { cn } from './cn';
export * from './icons';

// 추후 추가될 유틸리티들
// export * from './date';
// export * from './format';
// export * from './storage';
```

**현재 상태:**
- `cn()` 함수 하나만 존재
- 날짜, 포맷, 스토리지 유틸리티 미구현

**해결 방안:**
- 필요 시 점진적 추가
- 현재는 문제 아님 (미래 계획)

---

## 🟢 잘 된 점 (Good Practices)

### 1. 중앙집중식 API 클라이언트 ✅

**위치:** `apps/web/src/lib/api/index.ts`

```typescript
export const api = {
  auth: authApi,
  projects: projectApi,
  menus: menuApi,
} as const;
```

**장점:**
- 일관된 API 호출 패턴
- 자동완성 지원
- 중앙에서 인터셉터/에러 처리 가능

---

### 2. Zod 스키마 공용화 ✅

**위치:** `apps/web/src/lib/validations/common.ts`

```typescript
// 재사용 가능한 기본 스키마
export const emailSchema = z.string().email('올바른 이메일...');
export const passwordSchema = z.string().min(8, '...');
export const idSchema = z.string().min(1, '...');

// 조합하여 사용
export const loginFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
```

**장점:**
- 검증 로직 중복 제거
- 일관된 에러 메시지
- 변경 시 한 곳만 수정

---

### 3. 컴포넌트 계층 구조 명확 ✅

**위치:** `apps/web/src/components/`

```
ui/          (Level 1 - 원자)
  ↓
common/      (Level 2 - 분자)
  ↓
templates/   (Level 3 - 유기체)
  ↓
pages/       (Level 4 - 페이지별)
```

**장점:**
- 명확한 책임 분리
- 재사용성 극대화
- 테스트 용이

---

### 4. 상태 관리 분리 ✅

**위치:** `apps/web/src/stores/`

| Store | 책임 |
|-------|------|
| `authStore` | 인증 상태 |
| `tabStore` | 탭 네비게이션 |
| `menuStore` | 메뉴 상태 |
| `sidebarStore` | 사이드바 상태 |
| `layoutStore` | 레이아웃 상태 |

**장점:**
- 단일 책임 원칙 준수
- 상태 격리
- 독립적 테스트 가능

---

### 5. Prisma Extension 패턴 ✅

**위치:** `packages/database/src/extensions/`

```typescript
export const commonColumnsExtension = Prisma.defineExtension({
  model: {
    $allModels: {
      async softDelete() { ... },
    },
  },
});
```

**장점:**
- 공통 로직 확장으로 분리
- 재사용 가능한 DB 기능
- 비즈니스 로직과 분리

---

## 📋 개선 작업 우선순위

### P0: 즉시 수정 (기능 영향)

| # | 작업 | 영향도 | 난이도 |
|---|------|--------|--------|
| 1 | 타입 정의 동기화 | HIGH | LOW |
| 2 | DatabaseService Extension 적용 | HIGH | MEDIUM |
| 3 | Project Controller 인증 추가 | HIGH | LOW |

### P1: 단기 개선 (품질 향상)

| # | 작업 | 영향도 | 난이도 |
|---|------|--------|--------|
| 4 | 응답 헬퍼 함수 공용화 | MEDIUM | LOW |
| 5 | 레거시 컴포넌트 마이그레이션 계획 | MEDIUM | MEDIUM |

### P2: 장기 개선 (유지보수성)

| # | 작업 | 영향도 | 난이도 |
|---|------|--------|--------|
| 6 | 미사용 export 정리 | LOW | LOW |
| 7 | 유틸리티 함수 확장 | LOW | LOW |

---

## 🔍 중복 코드 상세 분석

### Controller 응답 패턴

**파일별 응답 형식:**

| Controller | 성공 형식 | 실패 형식 |
|------------|----------|----------|
| `project.controller.ts` | `{ success, data, meta }` | `{ success, error: { code, message } }` |
| `user.controller.ts` | `{ success, data, message }` | `{ success, data: null, message }` |
| `auth.controller.ts` | `{ success, data, message }` | NestJS Exception |
| `menu.controller.ts` | `{ success, data }` | - |

**권장 통일 형식:**
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { page?: number; limit?: number; total?: number };
}
```

---

## 📈 품질 메트릭 추적

### 현재 상태

| 메트릭 | 현재 | 목표 |
|--------|------|------|
| `any` 타입 사용 | 0개 | 0개 ✅ |
| `@ts-ignore` 사용 | 0개 | 0개 ✅ |
| 타입 불일치 | 3개 | 0개 |
| 인증 누락 API | 1개 | 0개 |
| 레거시 컴포넌트 | 2개 | 0개 |
| 공용 응답 헬퍼 | 없음 | 있음 |

---

## ✅ 결론

### 강점
- 전체적으로 **잘 구조화된 코드베이스**
- **계층 구조와 책임 분리** 잘 되어 있음
- **공용 컴포넌트/스키마** 활용 우수

### 개선 필요
- **타입 정의 동기화** (Prisma ↔ @ssoo/types)
- **DB Extension 실제 적용**
- **일관된 응답 형식** 통일
- **레거시 마이그레이션** 계획 수립

### 다음 단계
1. Phase 2 계획서에 위 개선사항 반영
2. P0 작업부터 순차적 실행
3. 각 변경 후 검증 게이트 통과 확인
