# 개발 표준 (Development Standards)

> 최종 업데이트: 2026-01-20  
> 상태: 초안 작성

---

## 🎯 목적

이 문서는 코드의 **재사용성, 간결성, 가독성**을 극대화하고,  
**단일 책임 원칙(SRP)**을 준수하며 **스파게티 코드를 방지**하기 위한 개발 표준입니다.

```
핵심 가치: "코드는 한 번 작성하고, 여러 번 재사용한다"
```

---

## 📐 아키텍처 원칙

### 1. 계층 구조 (Layered Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │    templates/   │  │    pages/       │  │   layout/    │ │
│  │  (페이지 템플릿)  │  │  (페이지 컴포넌트) │  │  (레이아웃)   │ │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┘ │
│           │                    │                             │
│           ▼                    ▼                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                     common/                              │ │
│  │              (재사용 가능한 복합 컴포넌트)                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                       ui/                                │ │
│  │              (shadcn/ui 원자 컴포넌트)                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Business Layer                           │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐ │
│  │   hooks/      │  │   stores/     │  │   lib/api/        │ │
│  │ (React Query) │  │ (Zustand)     │  │ (API 클라이언트)   │ │
│  └───────────────┘  └───────────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Shared Layer                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐ │
│  │ @ssoo/types   │  │@ssoo/database │  │ lib/validations/  │ │
│  │ (공유 타입)    │  │ (Prisma ORM)  │  │ (Zod 스키마)       │ │
│  └───────────────┘  └───────────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. 의존성 방향

```
templates → common → ui       (위에서 아래로)
pages → hooks → lib/api       (위에서 아래로)
hooks → stores → types        (위에서 아래로)
```

**금지된 의존성:**
- ❌ `ui/` → `common/` (역방향)
- ❌ `common/` → `pages/` (역방향)
- ❌ `lib/api/` → 컴포넌트 직접 참조
- ❌ 순환 의존성 (A → B → A)

---

## 🧩 컴포넌트 설계 원칙

### 1. 단일 책임 원칙 (SRP)

```typescript
// ❌ Bad: 여러 책임을 가진 컴포넌트
function ProjectPage() {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({});
  
  async function fetchData() { /* API 호출 */ }
  async function handleSubmit() { /* 폼 제출 */ }
  async function handleDelete() { /* 삭제 */ }
  
  return (
    <div>
      <form>{/* 필터 폼 */}</form>
      <table>{/* 데이터 테이블 */}</table>
      <div>{/* 페이지네이션 */}</div>
    </div>
  );
}

// ✅ Good: 책임이 분리된 컴포넌트들
function ProjectPage() {
  return (
    <ListPageTemplate
      header={header}
      table={tableProps}
      pagination={paginationProps}
    />
  );
}

// 데이터 페칭 로직은 훅으로
function useProjectList(filters: ProjectFilters) {
  return useQuery({ ... });
}

// UI 로직은 템플릿으로
function ListPageTemplate<TData>({ header, table, pagination }) {
  return ( ... );
}
```

### 2. 컴포넌트 크기 기준

| 구분 | 최대 라인 | 설명 |
|------|----------|------|
| 원자 컴포넌트 (ui/) | ~50줄 | 버튼, 인풋 등 |
| 복합 컴포넌트 (common/) | ~150줄 | DataTable, PageHeader 등 |
| 템플릿 (templates/) | ~200줄 | 페이지 레이아웃 |
| 페이지 컴포넌트 | ~150줄 | 조합만 담당 |

> 기준 초과 시 → 컴포넌트 분리 검토

### 3. Props 설계

```typescript
// ✅ Good: 명확한 Props 인터페이스
export interface DataTableProps<TData, TValue> {
  /** 테이블 컬럼 정의 */
  columns: ColumnDef<TData, TValue>[];
  /** 테이블 데이터 */
  data: TData[];
  /** 로딩 상태 */
  loading?: boolean;
  /** 행 클릭 핸들러 */
  onRowClick?: (row: TData) => void;
}

// ❌ Bad: any 타입 사용
export interface DataTableProps {
  columns: any[];
  data: any[];
}
```

---

## 🔄 코드 재사용 원칙

### 1. 공용화 대상 식별 기준

| 조건 | 공용화 | 로컬 유지 |
|------|--------|----------|
| 2곳 이상에서 사용 | ✅ | - |
| 도메인 특화 로직 | - | ✅ |
| 설정값만 다름 | ✅ (Props화) | - |
| 완전히 동일한 코드 | ✅ | - |

### 2. 공용화 위치

```
재사용 범위              → 배치 위치
─────────────────────────────────────────
전체 프로젝트 (types)   → packages/types/
백엔드 전용             → apps/server/src/common/
프론트엔드 전용         → apps/web/pms/src/lib/
UI 컴포넌트             → apps/web/pms/src/components/common/
특정 도메인 내          → 해당 도메인 폴더 내
```

### 3. 중복 코드 제거 패턴

```typescript
// ❌ Bad: 반복되는 API 응답 형식
// project.controller.ts
return { success: true, data, message: '조회 성공' };

// user.controller.ts
return { success: true, data, message: '조회 성공' };

// ✅ Good: 공용 응답 헬퍼
// common/responses.ts
export function successResponse<T>(data: T, message?: string) {
  return { success: true, data, message };
}

export function errorResponse(code: string, message: string) {
  return { success: false, error: { code, message } };
}
```

---

## 📁 파일/폴더 구조 표준

### 1. 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 파일 | PascalCase | `DataTable.tsx` |
| 훅 파일 | camelCase | `useProjectList.ts` |
| 유틸리티 파일 | camelCase | `formatDate.ts` |
| 상수 파일 | camelCase | `constants.ts` |
| 타입 파일 | camelCase | `project.ts` |
| 폴더명 | kebab-case 또는 camelCase | `project/`, `lib/api/` |

### 2. Index 파일 패턴

```typescript
// ✅ Good: 명시적 re-export
// components/common/index.ts
export { DataTable } from './DataTable';
export type { DataTableProps } from './DataTable';

export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

// ❌ Bad: 와일드카드 export
export * from './DataTable';
export * from './PageHeader';
```

### 3. 모듈 폴더 구조 (NestJS)

```
project/
├── project.module.ts      # 모듈 정의
├── project.controller.ts  # HTTP 엔드포인트
├── project.service.ts     # 비즈니스 로직
├── dto/                   # Data Transfer Objects
│   ├── create-project.dto.ts
│   └── update-project.dto.ts
└── interfaces/            # 타입/인터페이스 (선택)
    └── project.interface.ts
```

---

## 🔐 타입 관리 표준

### 1. 타입 정의 위치

```
타입 종류                 → 위치
─────────────────────────────────────────
API DTO, 공유 엔티티     → @ssoo/types
Prisma 생성 타입         → @ssoo/database (generated)
컴포넌트 Props           → 해당 컴포넌트 파일 내
페이지 로컬 타입         → 해당 페이지 파일 내
```

### 2. 타입 vs 인터페이스

```typescript
// interface: 확장 가능한 객체 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
}

// type: 유니온, 리터럴, 복잡한 조합
export type ProjectStatusCode = 'request' | 'proposal' | 'execution' | 'transition';
export type ProjectStageCode = 'waiting' | 'in_progress' | 'done';
```

### 3. 타입 동기화 원칙

```
⚠️ 중요: @ssoo/types는 "API 계약/DTO/뷰 모델" 중심이다.

1. DB와 1:1 매핑 타입 → 반드시 Prisma와 동기화
2. 부분 노출 타입 → packages/types/README.md에 커버리지 상태 명시
3. 코드 값(리터럴)은 한 곳에서 정의 (Single Source of Truth)
```

**커버리지 관리 기준**
- `aligned`: DB 스키마와 필드가 동일
- `partial`: API에 필요한 부분만 노출
- `planned`: 스키마/도메인 확정 전

---

## 📝 주석 및 문서화 표준

### 1. JSDoc 필수 대상

```typescript
// ✅ 공개 API, 컴포넌트, 훅
/**
 * 프로젝트 목록을 페이지네이션하여 조회합니다.
 * 
 * @param params - 페이지네이션 파라미터
 * @returns 프로젝트 목록과 총 개수
 */
async findAll(params: PaginationParams) { ... }

/**
 * 목록 페이지 표준 템플릿
 * 
 * @example
 * ```tsx
 * <ListPageTemplate
 *   header={{ title: '프로젝트 목록' }}
 *   table={{ columns, data }}
 * />
 * ```
 */
export function ListPageTemplate<TData>({ ... }) { ... }
```

### 2. 불필요한 주석

```typescript
// ❌ Bad: 코드를 그대로 설명
// 사용자 이름을 가져온다
const userName = user.name;

// ✅ Good: 왜 필요한지 설명
// BigInt는 JSON 직렬화 불가능하므로 string으로 변환
const userId = user.id.toString();
```

---

## 🧪 에러 처리 표준

### 1. 백엔드 에러 처리

#### 1.0 전역 예외 필터
- Nest `APP_FILTER`에 등록된 `GlobalHttpExceptionFilter`가 모든 예외를 `{ success: false, error: { code, message, path }, timestamp }` 포맷으로 응답한다.
- 컨트롤러는 200 응답 객체를 직접 반환하지 말고 Nest 예외(`NotFoundException`, `UnauthorizedException` 등)를 `throw` 한다.
- 성공 응답만 `success / paginated / deleted` 헬퍼를 사용한다.

```typescript
// ✅ Good: NestJS 표준 예외 사용
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

if (!user) {
  throw new NotFoundException('사용자를 찾을 수 없습니다.');
}

if (!isValid) {
  throw new UnauthorizedException('인증에 실패했습니다.');
}
```

### 2. 프론트엔드 에러 처리

```typescript
// ✅ Good: TanStack Query 에러 처리
const { data, error, isError } = useProjectList();

if (isError) {
  return <ErrorState message={error.message} onRetry={refetch} />;
}
```

---

## 🚀 성능 표준

### 1. React 최적화

```typescript
// ✅ memo: 자주 렌더링되는 리스트 아이템
const ProjectRow = memo(function ProjectRow({ project }: Props) {
  return <tr>...</tr>;
});

// ✅ useCallback: 자식에 전달되는 핸들러
const handleClick = useCallback((id: string) => {
  router.push(`/projects/${id}`);
}, [router]);

// ❌ 과도한 최적화 금지
// 단순 컴포넌트에 불필요한 memo
```

### 2. 데이터 페칭 최적화

```typescript
// ✅ Good: 적절한 staleTime 설정
useQuery({
  queryKey: ['projects', filters],
  queryFn: () => api.projects.list(filters),
  staleTime: 5 * 60 * 1000, // 5분
});
```

---

## ✅ 코드 리뷰 체크리스트

### 필수 확인 항목

- [ ] SRP 준수: 하나의 컴포넌트/함수가 하나의 책임만 가지는가?
- [ ] DRY 원칙: 중복 코드가 없는가?
- [ ] 타입 안전성: `any` 타입이 없는가?
- [ ] 에러 처리: 예외 상황이 처리되었는가?
- [ ] 네이밍: 명확하고 일관된 이름인가?
- [ ] 문서화: 공개 API에 JSDoc이 있는가?
- [ ] 의존성 방향: 역방향 의존이 없는가?

---

## 📌 금지 사항

| 금지 | 이유 | 대안 |
|------|------|------|
| `any` 타입 | 타입 안전성 상실 | 구체적 타입 또는 `unknown` |
| `// @ts-ignore` | 타입 오류 무시 | 타입 수정 |
| 인라인 스타일 | 일관성 저해 | Tailwind CSS |
| `console.log` (프로덕션) | 보안/성능 | 조건부 로깅 |
| Magic Number | 가독성 저하 | 상수 정의 |
| 깊은 중첩 (4단계+) | 가독성 저하 | Early return |

---

## 📚 참고 자료

- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [NestJS Best Practices](https://docs.nestjs.com/faq/common-errors)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)


## DB 접근 & BigInt 처리

- Prisma 접근은 새 코드에서 db.client.<model> 사용을 권장합니다. 기존 db.user 등 getter는 호환용입니다.
- ID는 BigInt로 저장하고, API 응답에서는 문자열로 직렬화합니다.
- 헬퍼: pps/server/src/common/utils/bigint.util.ts (	oBigInt, 	oIdString, serializeBigIntShallow).
- DTO/응답 타입은 @ssoo/types에 정의한 후 컨트롤러에서 직렬화해 반환합니다.


## 모듈 경계 강제 (ESLint)

- 규칙: pms 모듈이 common을 참조하는 것만 허용, common → pms 참조 금지.
- 도구: eslint-plugin-import의 import/no-restricted-paths로 계층 위반 시 lint 오류.
- 위치: pps/server/eslint.config.mjs (zones 설정).
- CI/프리커밋: pnpm --filter server lint에서 위반 시 실패.
