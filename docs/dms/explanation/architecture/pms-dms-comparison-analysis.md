```mdc
# PMS vs DMS 비교 분석 보고서

> 📅 작성일: 2026-01-29
> 📌 최종 업데이트: 2026-02-02
> 📌 목적: 리팩터링 후 PMS-DMS 간 차이점 종합 분석
> 📂 분석 대상: `apps/web/pms/`, `apps/web/dms/`

---

## 1️⃣ 패키지 차이 분석

### 1.1 package.json 기본 정보

| 항목 | PMS | DMS | 비고 |
|------|-----|-----|------|
| **name** | `web-pms` | `markdown-wiki` | ⚠️ DMS 이름 불일치 (권장: `web-dms`) |
| **version** | `0.0.1` | `0.1.0` | - |
| **패키지 매니저** | pnpm (workspace) | npm (독립) | ✅ 의도적 |

### 1.2 Scripts 비교

| Script | PMS | DMS | 분석 |
|--------|-----|-----|------|
| `dev` | `next dev --port 3000` | `next dev` | ⚠️ DMS 포트 미지정 (기본 3000) |
| `build` | ✅ | ✅ | 동일 |
| `start` | ✅ | ✅ | 동일 |
| `lint` | ✅ `next lint` | ❌ 없음 | ⚠️ **추가 필요** |
| `storybook` | ✅ | ❌ 없음 | 선택적 |
| `docs:typedoc` | ✅ | ❌ 없음 | 선택적 |

### 1.3 공통 Dependencies

| 패키지 | 용도 | PMS 버전 | DMS 버전 |
|--------|------|----------|----------|
| `next` | 프레임워크 | ^15.1.0 | ^15.1.0 |
| `react` | UI 라이브러리 | ^19.2.4 | 19.2.0 |
| `zustand` | 상태 관리 | ^5.0.0 | ^5.0.10 |
| `zod` | 스키마 검증 | ^3.24.0 | ^3.25.76 |
| `react-hook-form` | 폼 관리 | ^7.54.0 | ^7.71.1 |
| `@hookform/resolvers` | 폼 검증 | ^3.9.0 | ^3.10.0 |
| `sonner` | 토스트 | ^1.7.0 | ^1.7.4 |
| `lucide-react` | 아이콘 | ^0.548.0 | ^0.548.0 |
| `tailwind-merge` | CSS 병합 | ^2.6.0 | ^2.6.0 |
| `class-variance-authority` | CSS 변형 | ^0.7.1 | ^0.7.1 |
| `clsx` | 클래스 병합 | ^2.1.0 | ^2.1.1 |

### 1.4 PMS 전용 Dependencies (DMS 없음)

| 패키지 | 용도 | 분석 |
|--------|------|------|
| `@ssoo/types` | 공용 타입 | ✅ **의도적 제외** (독립성 원칙) |
| `@tanstack/react-query` | 서버 상태 | 📋 도입 검토 (Phase 4+) |
| `@tanstack/react-table` | 테이블 | 필요시 도입 |
| `@tanstack/react-virtual` | 가상화 | 필요시 도입 |
| `axios` | HTTP 클라이언트 | 📋 도입 검토 |
| `dayjs` | 날짜 처리 | 📋 도입 검토 |
| `recharts` | 차트 | 필요시 도입 |
| `socket.io-client` | 실시간 | 필요시 도입 |
| `numeral` | 숫자 포맷 | 필요시 도입 |
| `xlsx` | 엑셀 처리 | 필요시 도입 |

### 1.5 DMS 전용 Dependencies (핵심 도메인)

| 패키지 | 용도 | 비고 |
|--------|------|------|
| `@tiptap/*` (15개) | 리치 텍스트 에디터 | **핵심 기능** |
| `@google/generative-ai` | Gemini AI | AI 기능 |
| `@lancedb/lancedb` | 벡터 DB | RAG 검색 |
| `@mui/x-tree-view` | 트리 뷰 | 파일 탐색기 |
| `@mui/material` | UI 컴포넌트 | Phase 6에서 검토 |
| `@emotion/*` | CSS-in-JS | MUI 의존성 |
| `marked` | 마크다운 파싱 | 문서 처리 |
| `react-markdown` | 마크다운 렌더링 | 문서 표시 |
| `turndown` | HTML→MD 변환 | 문서 변환 |
| `lowlight` | 코드 하이라이팅 | 에디터 |

### 1.6 Radix UI 비교

| 컴포넌트 | PMS | DMS |
|----------|-----|-----|
| `dialog` | ✅ | ✅ |
| `dropdown-menu` | ✅ | ✅ |
| `slot` | ✅ | ✅ |
| `tooltip` | ✅ | ✅ |
| `checkbox` | ✅ | ❌ |
| `label` | ✅ | ❌ |
| `select` | ✅ | ❌ |
| `separator` | ✅ | ❌ |
| `context-menu` | ❌ | ✅ |
| `progress` | ❌ | ✅ |

---

## 2️⃣ 소스 디렉토리 구조 차이

### 2.1 최상위 구조 비교

| 디렉토리 | PMS | DMS | 비고 |
|----------|-----|-----|------|
| `src/app/` | ✅ | ✅ | 동일 |
| `src/components/` | ✅ | ✅ | 동일 |
| `src/hooks/` | ✅ | ✅ | 동일 |
| `src/lib/` | ✅ | ✅ | 동일 |
| `src/stores/` | ✅ | ✅ | 동일 |
| `src/types/` | ✅ | ✅ | 동일 |
| `src/middleware.ts` | ✅ | ✅ | 동일 |

**✅ 결론: 최상위 구조 100% 일치**

### 2.2 components/ 세부 비교

#### PMS components/
```
components/
├── common/           # 공통 UI (DataTable, FormComponents, Pagination 등)
├── index.ts          # 배럴 export
├── layout/           # 레이아웃 (AppLayout, Header, MainSidebar 등)
├── pages/            # 페이지별 (execution/, home/, proposal/ 등)
├── templates/        # 페이지 템플릿
└── ui/               # 기본 UI (button, card, input 등)
```

#### DMS components/
```
components/
├── common/           # 공통 UI 컴포넌트
├── index.ts          # 배럴 export
├── layout/           # 레이아웃
│   ├── AppLayout.tsx
│   ├── ContentArea.tsx
│   ├── Header.tsx
│   ├── TabBar.tsx
│   └── sidebar/      # 사이드바 컴포넌트
│       ├── Sidebar.tsx
│       ├── Search.tsx
│       ├── Bookmarks.tsx
│       ├── OpenTabs.tsx
│       ├── FileTree.tsx
│       └── Section.tsx
├── pages/            # 페이지별 (ai/, wiki/)
├── templates/        # 페이지 템플릿
└── ui/               # 기본 UI
```

### 2.3 사이드바 컴포넌트 구조

**PMS MainSidebar/**
```
components/layout/
├── MainSidebar.tsx       # 메인 컨테이너
├── CollapsedSidebar.tsx  # 접힌 상태 (아이콘만)
├── ExpandedSidebar.tsx   # 펼친 상태
├── FloatingPanel.tsx     # hover 플로팅
└── SidebarSection.tsx    # 공통 섹션
```

**DMS sidebar/**
```
components/layout/sidebar/
├── Sidebar.tsx           # 메인 컨테이너
├── Search.tsx            # 검색
├── Bookmarks.tsx         # 책갈피
├── OpenTabs.tsx          # 열린 탭
├── FileTree.tsx          # 파일 트리
├── Section.tsx           # 공통 섹션
└── constants.ts          # 상수
```

### 2.4 stores/ 비교

#### PMS stores/ (6개)
```
stores/
├── auth.store.ts      # 인증
├── index.ts
├── layout.store.ts    # 레이아웃
├── menu.store.ts      # 메뉴
├── sidebar.store.ts   # 사이드바
└── tab.store.ts       # 탭
```

#### DMS stores/ (6개)
```
stores/
├── confirm.store.ts    # 확인 모달 (DMS 전용)
├── editor.store.ts     # 에디터 상태 (DMS 전용)
├── file.store.ts       # 파일 트리 (DMS 전용)
├── index.ts
├── layout.store.ts     # 레이아웃
├── sidebar.store.ts    # 사이드바 UI 상태 (DMS 전용)
└── tab.store.ts        # 탭
```

**공통 Store:**
- `layout.store.ts` ✅ (유사한 역할)
- `tab.store.ts` ✅ (동일 패턴)

**PMS 전용:**
- `auth.store.ts` - 인증 (DMS는 인증 없음)
- `menu.store.ts` - 메뉴 (DMS는 파일 트리)
- `sidebar.store.ts` - 사이드바 상태

**DMS 전용:**
- `confirm.store.ts` - 확인 모달
- `editor.store.ts` - 에디터 상태
- `file.store.ts` - 파일 시스템
- `sidebar.store.ts` - 사이드바 UI 상태

### 2.5 types/ 비교

#### PMS types/ (5개)
```
types/
├── index.ts
├── layout.ts
├── menu.ts
├── sidebar.ts
└── tab.ts
```

#### DMS types/ (5개)
```
types/
├── file.ts         # 파일 시스템 (PMS menu.ts 대응)
├── index.ts
├── layout.ts       # 레이아웃 (공통)
├── sidebar.ts      # 사이드바 (공통)
└── tab.ts          # 탭 (공통)
```

### 2.6 lib/ 비교

#### PMS lib/
```
lib/
├── api/            # API 클라이언트
├── index.ts
├── utils/          # 유틸리티
└── validations/    # 검증 스키마
```

#### DMS lib/
```
lib/
├── index.ts
├── markdownConverter.ts  # MD 변환 (DMS 전용)
├── toast.ts              # 토스트 유틸
└── utils/                # 유틸리티
    ├── apiClient.ts      # API 클라이언트
    ├── constants.ts
    ├── errorUtils.ts
    ├── fileUtils.ts
    ├── index.ts
    └── pathUtils.ts
```

**차이점:**
- PMS: `api/`, `validations/` 디렉토리 구조
- DMS: 파일 단위, 마크다운 관련 파일

### 2.7 hooks/ 비교

#### PMS hooks/ (3개)
```
hooks/
├── index.ts
├── queries/        # react-query 훅
└── useAuth.ts      # 인증 훅
```

#### DMS hooks/ (2개)
```
hooks/
├── index.ts
├── useEditor.ts           # 에디터 훅
└── useOpenTabWithConfirm.ts  # 탭 열기 확인
```

---

## 3️⃣ 앱 초기화 흐름 비교

### 3.1 Root Layout

| 항목 | PMS | DMS |
|------|-----|-----|
| **파일** | `app/layout.tsx` | `app/layout.tsx` |
| **SSR** | Server Component | ❌ `'use client'` |
| **Providers** | `<Providers>` (QueryClient) | 없음 |
| **폰트** | 없음 (CSS) | Geist, Geist_Mono |
| **Toaster** | Provider 내부 | 직접 포함 |
| **언어** | `lang="ko"` | `lang="en"` |

**⚠️ DMS Root Layout 개선점:**
1. `'use client'` 제거 가능 (metadata 사용)
2. `lang="ko"` 로 변경 권장
3. Providers 패턴 고려 (미래 확장성)

### 3.2 Main Layout

| 항목 | PMS | DMS |
|------|-----|-----|
| **인증** | ✅ checkAuth() | ❌ 없음 |
| **로그인 폼** | 미인증 시 표시 | N/A |
| **초기화** | refreshMenu() | refreshFileTree() |
| **반응형** | 없음 | initializeDeviceType() |
| **AppLayout** | 조건부 렌더 | 직접 렌더 |

### 3.3 초기화 순서

#### PMS 초기화 흐름
```
1. RootLayout
   └─ Providers (QueryClientProvider)
      └─ children

2. MainLayout
   ├─ checkAuth() → 토큰 검증
   ├─ (미인증) → 로그인 폼 표시
   └─ (인증됨) → AppLayout 렌더
       └─ refreshMenu() → API 호출

3. AppLayout
   ├─ Header
   ├─ MainSidebar (메뉴 트리)
   ├─ TabBar
   └─ ContentArea
       └─ pageComponents[activeTab.path]
```

#### DMS 초기화 흐름
```
1. RootLayout
   └─ Toaster + children

2. MainLayout
   ├─ initializeDeviceType()
   ├─ refreshFileTree() → Server Action
   └─ AppLayout 렌더

3. AppLayout
   ├─ Header
   ├─ MainSidebar (파일 트리)
   ├─ TabBar
   └─ ContentArea
       └─ pageComponents[activeTab.path]
```

### 3.4 데이터 로딩 전략

| 항목 | PMS | DMS |
|------|-----|-----|
| **메뉴/트리** | API (HTTP) | Server Action |
| **페이지 데이터** | React Query | Store 직접 |
| **캐싱** | React Query | Zustand persist |
| **에러 처리** | Query onError | try-catch |

---

## 4️⃣ 코드 패턴/네이밍 룰 비교

### 4.1 네이밍 컨벤션 ✅

| 항목 | PMS | DMS | 일치 |
|------|-----|-----|:----:|
| Store 파일명 | `*.store.ts` | `*.store.ts` | ✅ |
| Hook 파일명 | `use*.ts` | `use*.ts` | ✅ |
| 컴포넌트 파일명 | `PascalCase.tsx` | `PascalCase.tsx` | ✅ |
| 타입 파일명 | `kebab-case.ts` | `kebab-case.ts` | ✅ |
| 배럴 export | `index.ts` | `index.ts` | ✅ |

### 4.2 디렉토리 컨벤션 ✅

| 항목 | PMS | DMS | 일치 |
|------|-----|-----|:----:|
| 레이아웃 | `components/layout/` | `components/layout/` | ✅ |
| 페이지 | `components/pages/` | `components/pages/` | ✅ |
| UI | `components/ui/` | `components/ui/` | ✅ |
| Stores | `stores/` | `stores/` | ✅ |
| Types | `types/` | `types/` | ✅ |
| Hooks | `hooks/` | `hooks/` | ✅ |

### 4.3 코드 패턴 비교

#### Store 정의 패턴

**PMS 패턴:**
```typescript
// stores/tab.store.ts
interface TabState {
  tabs: TabItem[];
  activeTabId: string | null;
  // ...
}

interface TabActions {
  openTab: (tab: OpenTabOptions) => void;
  // ...
}

export const useTabStore = create<TabState & TabActions>()(
  persist(
    (set, get) => ({
      // state
      tabs: [HOME_TAB],
      activeTabId: HOME_TAB.id,
      // actions
      openTab: (options) => { /* ... */ },
    }),
    { name: 'tab-store' }
  )
);
```

**DMS 패턴: ✅ 동일**

#### ContentArea pageComponents 패턴

**PMS 패턴:**
```typescript
const pageComponents: Record<string, React.LazyExoticComponent<ComponentType<object>>> = {
  '/home': lazy(() => import('@/components/pages/home/HomePage')),
  '/execution/:id': lazy(() => import('@/components/pages/execution/ExecutionPage')),
  // ...
};
```

**DMS 패턴: ✅ 동일**
```typescript
const pageComponents: Record<string, React.LazyExoticComponent<...>> = {
  '/': lazy(() => import('@/components/pages/wiki/WikiHomePage')),
  '/doc': lazy(() => import('@/components/pages/wiki/WikiViewerPage')),
  '/ai-search': lazy(() => import('@/components/pages/ai/AISearchPage')),
};
```

### 4.4 UI 컴포넌트 패턴 차이

| 패턴 | PMS | DMS |
|------|-----|-----|
| **스토리북** | ✅ `*.stories.tsx` | ❌ 없음 |
| **CVA variants** | ✅ 완전 활용 | ✅ 기본 활용 |
| **forwardRef** | ✅ 대부분 | ⚠️ 일부만 |

### 4.5 API 클라이언트 패턴

**PMS:** axios 기반 apiClient
```typescript
// lib/api/apiClient.ts
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});
```

**DMS:** fetch 기반 apiClient
```typescript
// hooks/services/apiClient.ts
export const fileApi = {
  getTree: async (): Promise<TreeNode[]> => {
    const response = await fetch('/api/files/tree');
    return response.json();
  },
};
```

---

## 5️⃣ 남은 작업 (→ Phase 6~7)

### Phase 6: 리팩토링

| ID | 항목 | 작업 |
|----|------|------|
| B-01 | 루트 컴포넌트 정리 | 16개 파일 적절한 디렉토리로 이동 |
| B-02 | common/ 채우기 | 공통 컴포넌트 정리 |
| B-03 | Root Layout | `'use client'` 제거 검토 |

### Phase 7: 장기 개선

| ID | 항목 | 비고 |
|----|------|------|
| C-01 | React Query 도입 | 서버 상태 관리 개선 |
| C-02 | axios 도입 | HTTP 클라이언트 통일 |
| C-03 | MUI 제거 검토 | Radix UI로 대체 |

---

## 6️⃣ 결론

### ✅ 완료된 항목

**구조 정렬:**
- 최상위 디렉토리 구조 - 100% 일치
- Store 네이밍 컨벤션 - `*.store.ts` 패턴 통일
- pageComponents 패턴 - ContentArea 동일 구조
- Layout 컴포넌트 구조 - AppLayout, Header, MainSidebar, TabBar, ContentArea

**즉시 조치 (P1):**
- package.json name: `markdown-wiki` → `web-dms`
- lint 스크립트: `"lint": "next lint"` 추가
- Root Layout lang: `en` → `ko`
- dev 포트: 3001 지정

### ⚠️ 의도적 차이 (유지)

| 항목 | PMS | DMS | 이유 |
|------|-----|-----|------|
| 패키지 매니저 | pnpm | npm | DMS 독립 배포 |
| @ssoo/types | 사용 | 미사용 | 독립성 원칙 |
| 인증 시스템 | 있음 | 없음 | DMS 불필요 |
| 데이터 소스 | API | Server Action | 아키텍처 차이 |
| 도메인 패키지 | - | Tiptap, AI, Vector DB | DMS 전용 |

---

> 📝 이 문서는 리팩토링 완료 후 PMS-DMS 정합성 검증을 위해 작성되었습니다.  
> 📄 상세 계획: [package-integration-plan.md](./package-integration-plan.md)
```
