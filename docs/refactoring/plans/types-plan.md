# Types 리팩터링 계획서

> 대상: `packages/types/`  
> 우선순위: P0 (즉시)  
> 예상 소요: 15분

---

## 🎯 목표

Prisma 스키마와 `@ssoo/types`의 타입 정의 동기화

---

## 📋 작업 목록

### TYPE-01: ProjectSourceCode 동기화 (P0)

**현재 상태:**
```typescript
// packages/types/src/project.ts (현재)
export type ProjectSourceCode = 'request' | 'proposal';
```

**Prisma 스키마:**
```prisma
// packages/database/prisma/schema.prisma
projectSourceCode String @map("project_source_code") // direct, opportunity
```

**수정 내용:**
```typescript
// packages/types/src/project.ts (수정 후)
/**
 * 프로젝트 소스 코드
 * - direct: 직접 생성 (내부 발굴)
 * - opportunity: 기회 (영업 기회)
 */
export type ProjectSourceCode = 'direct' | 'opportunity';
```

**영향 범위:**
- `apps/server/src/project/project.service.ts` - create 함수 기본값 수정 필요
- `apps/web/` - ProjectSourceCode 사용하는 컴포넌트 확인

---

### TYPE-02: DoneResultCode 동기화 (P0)

**현재 상태:**
```typescript
// packages/types/src/project.ts (현재)
export type DoneResultCode = 'won' | 'lost' | 'hold';
```

**Prisma 스키마:**
```prisma
// packages/database/prisma/schema.prisma
doneResultCode String? @map("done_result_code") // complete, cancel
```

**수정 내용:**
```typescript
// packages/types/src/project.ts (수정 후)
/**
 * 완료 결과 코드 (done 단계에서만 사용)
 * - complete: 정상 완료
 * - cancel: 취소
 */
export type DoneResultCode = 'complete' | 'cancel';
```

**영향 범위:**
- `apps/server/src/project/project.service.ts` - update 함수
- `apps/web/` - 완료 결과 선택 UI (있을 경우)

---

### TYPE-03: ProjectStatusCode 보완 (P0)

**현재 상태:**
```typescript
// packages/types/src/project.ts (현재)
export type ProjectStatusCode = 'opportunity' | 'execution';
```

**Prisma 스키마:**
```prisma
// packages/database/prisma/schema.prisma
statusCode String @map("status_code") // opportunity, execution, done
```

**수정 내용:**
```typescript
// packages/types/src/project.ts (수정 후)
/**
 * 프로젝트 상태 코드
 * - opportunity: 기회 (계약 전)
 * - execution: 실행 (계약 후)
 * - done: 완료 (종료)
 */
export type ProjectStatusCode = 'opportunity' | 'execution' | 'done';
```

**영향 범위:**
- 타입 확장이므로 기존 코드 호환
- 새로운 'done' 상태 사용 가능해짐

---

### TYPE-04: Index export 정리 (P3)

**현재 상태:**
```typescript
// packages/types/src/index.ts
export * from './common';
export * from './user';
export * from './project';
export * from './customer';
```

**검토 사항:**
- 모든 export가 필요한지 확인
- 명시적 export로 변경 여부 검토

**결정:** 현재 구조 유지 (문제 없음)

---

## 📝 실행 절차

### Step 1: 준비

```bash
# 현재 상태 확인
cd packages/types
pnpm exec tsc --noEmit

# 변경 전 커밋 (체크포인트)
git add .
git commit -m "chore: checkpoint before types refactoring"
```

### Step 2: 파일 수정

**수정 파일:** `packages/types/src/project.ts`

```typescript
/**
 * 프로젝트 상태 코드
 * - opportunity: 기회 (계약 전)
 * - execution: 실행 (계약 후)
 * - done: 완료 (종료)
 */
export type ProjectStatusCode = 'opportunity' | 'execution' | 'done';

/**
 * 프로젝트 단계 코드
 * - waiting: 대기
 * - in_progress: 진행 중
 * - done: 완료
 */
export type ProjectStageCode = 'waiting' | 'in_progress' | 'done';

/**
 * 완료 결과 코드 (done 상태에서만 사용)
 * - complete: 정상 완료
 * - cancel: 취소
 */
export type DoneResultCode = 'complete' | 'cancel';

/**
 * 프로젝트 소스 코드
 * - direct: 직접 생성 (내부 발굴)
 * - opportunity: 기회 (영업 기회)
 */
export type ProjectSourceCode = 'direct' | 'opportunity';
```

### Step 3: 검증

```bash
# 타입 체크
pnpm exec tsc --noEmit

# 의존 패키지 타입 체크
cd ../..
pnpm -r exec tsc --noEmit
```

### Step 4: 커밋

```bash
git add packages/types/
git commit -m "refactor(types): sync type definitions with Prisma schema

- ProjectSourceCode: request|proposal → direct|opportunity
- DoneResultCode: won|lost|hold → complete|cancel
- ProjectStatusCode: added 'done' status

BREAKING CHANGE: Type literal values changed to match database schema"
```

---

## ⚠️ 주의사항

1. **server 수정 필요**: `project.service.ts`의 기본값 확인
2. **web 확인 필요**: 리터럴 값을 하드코딩한 곳 확인
3. **seeds 데이터 확인**: 초기 데이터와 일치하는지 확인

---

## ✅ 완료 조건

- [ ] ProjectSourceCode 동기화
- [ ] DoneResultCode 동기화
- [ ] ProjectStatusCode 보완
- [ ] 타입 체크 통과
- [ ] 의존 패키지 빌드 통과
- [ ] 커밋 완료
