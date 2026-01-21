# SSOO 프론트엔드 표준

> 최종 업데이트: 2026-01-20

프론트엔드 개발 시 준수해야 할 표준 구조와 패턴을 정의합니다.

---

## 컴포넌트 계층 구조

```
components/
├── ui/              # Level 1 - Primitive (원자) - shadcn/ui
├── common/          # Level 2 - Composite (분자) - 재사용 가능한 조합
├── templates/       # Level 3 - Organism (유기체) - 페이지 템플릿
├── layout/          # App Layout - Header, Sidebar, TabBar, ContentArea
├── pages/           # 비즈니스 페이지 (라우팅 제외)
└── index.ts         # 통합 export
```

---

## Level 2 공통 컴포넌트 (common/)

| 컴포넌트 | 용도 | Props |
|----------|------|-------|
| `PageHeader` | 페이지 제목 + 브레드크럼 + 액션 | title, breadcrumb, actions |
| `DataTable` | 정렬/선택/페이지네이션 테이블 | columns, data, loading, pagination |
| `Pagination` | 페이지 네비게이션 | page, pageSize, total, onChange |
| `FormSection` | 폼 섹션 제목 + 필드 그룹 | title, description, children |
| `FormActions` | 저장/취소/삭제 버튼 | onSubmit, onCancel, loading |
| `FormField` | 라벨 + 에러 래퍼 | label, required, error, hint |
| `EmptyState` | 데이터 없음 표시 | icon, title, description, action |
| `LoadingState` | 로딩 상태 표시 | message |
| `ErrorState` | 에러 상태 표시 | error, onRetry |

---

## Level 3 페이지 템플릿 (templates/)

| 템플릿 | 용도 | 주요 Props |
|--------|------|-----------|
| `ListPageTemplate` | 목록 페이지 | header, filterFields, columns, data, pagination |
| `FormPageTemplate` | 등록/수정 페이지 | header, sections[], onSubmit, onCancel |
| `DetailPageTemplate` | 상세 페이지 | header, sections[], DetailFields |

---

## API 클라이언트 구조 (lib/api/)

```
lib/api/
├── client.ts        # Axios 인스턴스 (인터셉터: 토큰 자동 주입, 401 리프레시)
├── types.ts         # ApiResponse, PaginatedResponse, ApiError
├── auth.ts          # 인증 API (login, logout, refresh, me)
├── endpoints/       # 도메인별 API 함수
│   ├── projects.ts
│   ├── menus.ts
│   └── index.ts
└── index.ts         # 통합 export (api 객체)
```

### 사용 패턴

```typescript
import { api } from '@/lib/api';

// API 호출
const result = await api.projects.list({ page: 1 });
```

---

## 상태 관리 (stores/)

```
stores/
├── auth.store.ts    # 인증 상태 (persist)
├── menu.store.ts    # 메뉴 트리, 즐겨찾기
├── tab.store.ts     # MDI 탭 (persist, sessionStorage)
├── sidebar.store.ts # 사이드바 UI 상태
├── layout.store.ts  # 디바이스 타입 감지
└── index.ts
```

---

## Validation 스키마 (lib/validations/)

```
lib/validations/
├── common.ts        # 공통 필드 (requiredString, emailField, phoneField...)
├── auth.ts          # 인증 스키마 (loginSchema)
├── project.ts       # 프로젝트 스키마
└── index.ts
```

### 사용 패턴

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema } from '@/lib/validations';

const form = useForm({
  resolver: zodResolver(createProjectSchema),
});
```

---

## React Query 훅 (hooks/queries/)

```
hooks/
├── queries/
│   ├── useProjects.ts  # useProjectList, useProjectDetail, useCreateProject...
│   ├── useMenus.ts     # useMyMenus
│   └── index.ts
└── index.ts
```

### 사용 패턴

```typescript
import { useProjectList } from '@/hooks/queries';

const { data, isLoading, error } = useProjectList({ status: 'active' });
```

---

## 타입 정의 (types/)

```
types/
├── menu.ts          # MenuType, AccessType, MenuItem
├── tab.ts           # TabItem, TabStoreState
├── sidebar.ts       # SidebarSection, SidebarState
├── layout.ts        # DeviceType, BREAKPOINTS, LAYOUT_SIZES
└── index.ts
```

---

## 설치된 라이브러리

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| @tanstack/react-query | ^5.62.0 | 서버 상태 관리, 캐싱 |
| @tanstack/react-table | ^8.21.3 | 데이터 테이블 |
| @tanstack/react-virtual | ^3.13.18 | 가상 스크롤링 |
| react-hook-form | ^7.54.0 | 폼 상태 관리 |
| @hookform/resolvers | ^3.9.0 | Zod 연동 |
| zod | ^3.24.0 | 스키마 유효성 검증 |
| axios | ^1.7.0 | HTTP 클라이언트 |
| recharts | ^3.6.0 | 차트 |
| xlsx | ^0.18.5 | 엑셀 Export |

---

## shadcn/ui 컴포넌트

| 컴포넌트 | 용도 |
|----------|------|
| button, input, label | 기본 폼 요소 |
| select, checkbox | 선택 요소 |
| table, card | 데이터 표시 |
| skeleton, badge | 상태 표시 |
| dialog, sheet | 오버레이 |
| dropdown-menu, tooltip | 인터랙션 |

---

## 관련 문서

- [tech-stack.md](tech-stack.md) - 기술 스택
- [tech-decisions.md](tech-decisions.md) - 기술 결정 사항
- [../ui-design/design-system.md](../ui-design/design-system.md) - 디자인 시스템

---

## Backlog

> 이 영역 관련 개선/추가 예정 항목

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| FES-01 | 에러 바운더리 컴포넌트 표준화 | P2 | 🔲 대기 |
| FES-02 | 폼 컴포넌트 표준 가이드 작성 | P2 | 🔲 대기 |
| FES-03 | 테스트 코드 표준 추가 | P3 | 🔲 대기 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | Backlog/Changelog 섹션 추가 |
| 2026-01-20 | 프론트엔드 표준 문서 작성 |
