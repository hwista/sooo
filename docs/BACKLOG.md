# SSOO 프로젝트 백로그

> 장기 태스크, 기술 부채, 개선 사항을 추적합니다.

**마지막 업데이트**: 2026-01-19

---

## 🎯 현재 진행: 메뉴/레이아웃 시스템 (옵션 B: 설계 우선)

> MVP이지만 정석대로 구축하여 나중 리팩터링 시에도 큰 구조가 흔들리지 않도록 함

### Phase 1: 설계 ✅ 완료

| # | 태스크 | 상태 | 설명 |
|---|--------|------|------|
| 1 | 메뉴 구조 설계 | ✅ | DB 테이블 구조 정의 (cm_menu_m, cm_role_menu_r, cm_user_menu_r) |
| 2 | 권한-메뉴 매트릭스 정의 | ✅ | 역할별 메뉴 접근 권한 매핑 (Seed 데이터) |
| 3 | 레이아웃 컴포넌트 설계 | ✅ | Sidebar, Header, TabBar, Content 구조 |
| 4 | 라우팅 구조 설계 | ✅ | Next.js App Router 기반 설계 (완료) |

**DB 적용 완료 (2026-01-19):**
- ✅ Prisma db push - 6개 테이블 생성
- ✅ 히스토리 트리거 14개 설치 (12, 13, 14번 메뉴 관련)
- ✅ 메뉴 Seed 데이터 17건 입력
- ✅ 역할별 권한 데이터 66건 입력 (6개 역할)
- ✅ UserFavorite 모델 추가 (cm_user_favorite_r 테이블)

**프론트엔드 구현 완료 (2026-01-19):**

| 구분 | 파일 | 설명 |
|------|------|------|
| **타입 정의** | `apps/web/src/types/menu.ts` | MenuType, AccessType, MenuItem, FavoriteMenuItem, MenuPermission |
| | `apps/web/src/types/tab.ts` | TabItem, TabStoreState, TabStoreActions |
| | `apps/web/src/types/sidebar.ts` | SidebarSection, SidebarState, FLOAT_PANEL_CONFIG |
| | `apps/web/src/types/layout.ts` | DeviceType, BREAKPOINTS, LAYOUT_SIZES |
| | `apps/web/src/types/index.ts` | 통합 export |
| **상태 관리** | `apps/web/src/stores/tab.store.ts` | MDI 탭 관리 (persist, sessionStorage) |
| | `apps/web/src/stores/sidebar.store.ts` | 사이드바 UI 상태 |
| | `apps/web/src/stores/menu.store.ts` | 메뉴 트리, 즐겨찾기, 권한 |
| | `apps/web/src/stores/layout.store.ts` | 디바이스 타입 감지 |
| | `apps/web/src/stores/index.ts` | 통합 export |
| **레이아웃** | `apps/web/src/components/layout/AppLayout.tsx` | 메인 레이아웃 래퍼 |
| | `apps/web/src/components/layout/Header.tsx` | 상단 헤더 (로고, 알림, 프로필) |
| | `apps/web/src/components/layout/MainSidebar.tsx` | 사이드바 (접힘/펼침, 플로팅) |
| | `apps/web/src/components/layout/TabBar.tsx` | MDI 탭바 |
| | `apps/web/src/components/layout/ContentArea.tsx` | 콘텐츠 영역 |
| | `apps/web/src/components/layout/index.ts` | 통합 export |
| **사이드바** | `apps/web/src/components/layout/sidebar/SidebarSearch.tsx` | 실시간 메뉴 검색 |
| | `apps/web/src/components/layout/sidebar/SidebarFavorites.tsx` | 즐겨찾기 목록 |
| | `apps/web/src/components/layout/sidebar/SidebarOpenTabs.tsx` | 열린 탭 목록 |
| | `apps/web/src/components/layout/sidebar/SidebarMenuTree.tsx` | 메뉴 트리 (필터링 포함) |
| | `apps/web/src/components/layout/sidebar/SidebarAdmin.tsx` | 관리자 버튼 |
| | `apps/web/src/components/layout/sidebar/FloatPanel.tsx` | 플로팅 패널 컴포넌트 |
| | `apps/web/src/components/layout/sidebar/index.ts` | 통합 export |
| **유틸리티** | `apps/web/src/lib/utils/icons.ts` | Lucide 아이콘 동적 로드 유틸 |

**라우팅 구조 완료 (2026-01-19):**
- ✅ Next.js App Router Route Groups 적용
- ✅ `(auth)` route group - 로그인 등 비인증 페이지
- ✅ `(main)` route group - 인증 후 메인 레이아웃 (AppLayout)
- ✅ 인증 가드 로직 구현 (checkAuth, 토큰 리프레시)
- ✅ 빌드 성공 확인

**라우팅 구조:**
```
apps/web/src/app/
├── globals.css
├── layout.tsx              # 루트 레이아웃 (Providers)
├── providers.tsx           # React Query, Zustand 등
├── (auth)/                 # 비인증 페이지
│   ├── layout.tsx          # 중앙 정렬 레이아웃
│   └── login/
│       └── page.tsx        # 로그인 페이지
└── (main)/                 # 인증 후 메인
    ├── layout.tsx          # AppLayout 적용, 인증 가드
    └── page.tsx            # 대시보드 (메인 진입점)
```

### Phase 2: 구현

| # | 태스크 | 상태 | 설명 |
|---|--------|------|------|
| 5 | 권한 가드 구현 | 🔲 | 프론트(메뉴필터+라우트가드) + 백엔드(API가드) |
| 6 | 레이아웃 컴포넌트 구현 | ✅ | Sidebar, Header, TabBar, ContentArea (완료) |
| 7 | MDI 탭 시스템 구현 | ✅ | Zustand 탭 상태, 열기/닫기/전환 (완료) |
| 8 | 메뉴 통합 및 테스트 | ✅ | 권한별 렌더링, 탭 전환 (완료: 2026-01-19) |

### Phase 3: 프로젝트 관리 화면

| # | 태스크 | 상태 | 설명 |
|---|--------|------|------|
| 9 | 메뉴 시드 데이터 업데이트 | ✅ | 1레벨 메뉴 구조 반영 (cm_menu_m 16건, cm_role_menu_r 52건) |
| 10 | 메뉴 API 연동 | ✅ | 백엔드 Menu API 구현 + 프론트 메뉴 스토어 연결 (완료: 2026-01-19) |
| 11 | 고객요청 등록 화면 개발 | ✅ | 요청 > 고객요청 관리 > 고객요청 등록 (완료: 2026-01-19) |
| 12 | 공통 컴포넌트/템플릿 표준화 | ✅ | 컴포넌트 계층 구조, API 클라이언트, Validation 스키마 (완료: 2026-01-19) |

### Phase 4: 페이지 보안 및 라우팅 강화 ✅

| # | 태스크 | 상태 | 설명 |
|---|--------|------|------|
| 13 | Next.js 라우팅 노출 차단 | ✅ | 페이지 컴포넌트 `components/pages/`로 이동 (완료: 2026-01-19) |
| 14 | 미들웨어 직접 접근 차단 | ✅ | `middleware.ts` 생성, allowedPaths만 허용 (완료: 2026-01-19) |
| 15 | 404 자동 리다이렉트 | ✅ | `app/not-found.tsx` 생성, 로그인 상태별 리다이렉트 (완료: 2026-01-19) |
| 16 | ContentArea 동적 로딩 | ✅ | lazy import로 권한 기반 컴포넌트 렌더링 (완료: 2026-01-19) |

**페이지 보안 아키텍처 (2026-01-19):**

**문제점:**
- Next.js 파일 시스템 라우팅이 URL 구조를 그대로 노출
- `/request/customer` 같은 경로가 주소창에 표시되어 라우팅 구조 분석 가능
- 권한 없는 사용자도 URL을 알면 직접 접근 위험
- 보안 취약점 및 해킹 리스크 증가

**해결 방안:**
```
하이브리드 라우팅 전략 = Next.js 라우팅 + 동적 컴포넌트 로딩
```

**파일 구조 변경:**
```
apps/web/src/
├── app/
│   ├── (main)/
│   │   ├── layout.tsx          # 메인 레이아웃 (인증 필요)
│   │   └── page.tsx            # 대시보드 (/)
│   ├── auth/
│   │   ├── login/page.tsx      # 로그인 (허용)
│   │   └── register/page.tsx   # 회원가입 (허용)
│   ├── not-found.tsx           # 404 → 자동 리다이렉트
│   └── layout.tsx              # 루트 레이아웃
├── components/
│   └── pages/                  # ← 실제 비즈니스 페이지 (라우팅 제외)
│       └── request/
│           └── customer/
│               ├── CustomerRequestListPage.tsx
│               └── CustomerRequestCreatePage.tsx
└── middleware.ts               # 직접 접근 차단
```

**보안 메커니즘:**
1. **미들웨어 차단** (`middleware.ts`):
   - 허용 경로: `/`, `/auth/login`, `/auth/register`
   - 그 외 모든 경로 → `/not-found`로 리다이렉트
   - API 라우트, 정적 파일 제외

2. **404 자동 리다이렉트** (`app/not-found.tsx`):
   - 로그인됨 → `/` (메인 페이지)
   - 미로그인 → `/auth/login` (로그인 페이지)
   - 사용자는 404 오류를 보지 않음

3. **ContentArea 동적 로딩** (`components/layout/ContentArea.tsx`):
   ```typescript
   const pageComponents = {
     '/request/customer': lazy(() => 
       import('@/components/pages/request/customer/CustomerRequestListPage')
     ),
     '/request/customer/create': lazy(() => 
       import('@/components/pages/request/customer/CustomerRequestCreatePage')
     ),
   };
   ```
   - 메뉴 클릭 시 `openTab({ path: '/request/customer' })` 호출
   - ContentArea가 path 기반으로 lazy load
   - URL은 `http://localhost:3000/`에 고정

**권한 제어 흐름:**
```
사용자 로그인
    ↓
DB에서 권한별 메뉴 조회 (cm_user_menu_r)
    ↓
메뉴 트리 구성 (menuStore)
    ↓
사이드바에 권한 있는 메뉴만 표시
    ↓
메뉴 클릭 시 openTab() 호출
    ↓
ContentArea가 동적 컴포넌트 렌더링
```

**직접 URL 접근 시도:**
```
http://localhost:3000/request/customer 입력
    ↓
middleware.ts → allowedPaths 체크 실패
    ↓
/not-found로 리다이렉트
    ↓
not-found.tsx → 로그인 상태 체크
    ↓
로그인됨 → / (메인)
미로그인 → /auth/login
```

**보안 이점:**
| 항목 | 기존 | 현재 |
|------|------|------|
| URL 노출 | ✗ 전체 라우팅 구조 노출 | ✓ `/`만 노출 |
| 직접 접근 | ✗ URL 알면 접근 가능 | ✓ 404 → 리다이렉트 |
| 권한 체크 | △ 페이지별 개별 구현 | ✓ 메뉴 DB 기반 통합 |
| 해킹 리스크 | ✗ 라우팅 분석 가능 | ✓ 라우팅 구조 숨김 |

**구현 파일:**
- ✅ `apps/web/src/middleware.ts`
- ✅ `apps/web/src/app/not-found.tsx`
- ✅ `apps/web/src/components/layout/ContentArea.tsx`
- ✅ `apps/web/src/components/pages/request/customer/CustomerRequestListPage.tsx`
- ✅ `apps/web/src/components/pages/request/customer/CustomerRequestCreatePage.tsx`
- ✅ `docs/ui-design/page-security-routing.md` (상세 문서)

**테스트 완료:**
- ✅ 메뉴 클릭 → 탭 열림 → 페이지 렌더링 (URL 변화 없음)
- ✅ `/request/customer` 직접 입력 → 404 → 메인 페이지 리다이렉트
- ✅ 미로그인 상태 접근 → 로그인 페이지 리다이렉트
- ✅ 빌드 성공, 개발 서버 정상 작동

**메뉴 API 구현 완료 (2026-01-19):**
- ✅ `apps/server/src/menu/menu.service.ts` - 메뉴 트리 및 즐겨찾기 조회
- ✅ `apps/server/src/menu/menu.controller.ts` - GET /api/menus/my 엔드포인트
- ✅ `apps/server/src/menu/menu.module.ts` - 모듈 정의
- ✅ `apps/server/src/app.module.ts` - MenuModule 등록
- ✅ `apps/web/src/stores/menu.store.ts` - API 호출 및 Authorization 헤더
- ✅ `apps/web/src/app/(main)/layout.tsx` - 인증 후 메뉴 자동 로드

---

### 공통 컴포넌트/템플릿 표준화 (2026-01-19)

> 스케일러블한 개발 체계를 위한 표준 구조

**컴포넌트 계층 구조:**
```
components/
├── ui/              # Level 1 - Primitive (원자) - shadcn/ui
├── common/          # Level 2 - Composite (분자) - PageHeader, DataTable...
├── templates/       # Level 3 - Organism (유기체) - ListPageTemplate...
├── layout/          # App Layout - Header, Sidebar, TabBar, ContentArea
└── index.ts         # 통합 export
```

**API 클라이언트 구조:**
```
lib/api/
├── client.ts        # Axios 인스턴스 (인터셉터: 토큰 자동 주입, 401 리프레시)
├── types.ts         # ApiResponse, PaginatedResponse, ApiError
├── auth.ts          # 인증 API (login, logout, refresh, me)
├── endpoints/       # 도메인별 API 함수
│   ├── projects.ts  # 프로젝트 CRUD
│   ├── menus.ts     # 메뉴 조회
│   └── index.ts
└── index.ts         # 통합 export (api 객체)
```

**Validation 스키마 구조 (Zod):**
```
lib/validations/
├── common.ts        # 공통 필드 (requiredString, emailField, phoneField...)
├── auth.ts          # 인증 스키마 (loginSchema)
├── project.ts       # 프로젝트 스키마 (createProjectSchema, updateProjectSchema)
└── index.ts         # 통합 export
```

**React Query 훅 구조:**
```
hooks/
├── queries/
│   ├── useProjects.ts  # useProjectList, useProjectDetail, useCreateProject...
│   ├── useMenus.ts     # useMyMenus
│   └── index.ts
└── index.ts
```

**설치된 라이브러리:**
| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| @tanstack/react-query | ^5.62.0 | 서버 상태 관리, 캐싱 |
| @tanstack/react-query-devtools | ^5.91.2 | 개발 도구 |
| @tanstack/react-table | ^8.21.3 | 데이터 테이블 (정렬/필터/페이지네이션) |
| @tanstack/react-virtual | ^3.13.18 | 가상 스크롤링 (대용량 목록) |
| react-hook-form | ^7.54.0 | 폼 상태 관리 |
| @hookform/resolvers | ^3.9.0 | Zod 연동 |
| zod | ^3.24.0 | 스키마 유효성 검증 |
| axios | ^1.7.0 | HTTP 클라이언트 |
| recharts | ^3.6.0 | 차트 라이브러리 |
| xlsx | ^0.18.5 | 엑셀 Export |
| class-variance-authority | ^0.7.1 | 컴포넌트 Variants |
| tailwindcss-animate | ^1.0.7 | 애니메이션 유틸리티 |

**shadcn/ui 컴포넌트 (설치 완료):**
| 컴포넌트 | 용도 |
|----------|------|
| button | 버튼 (다양한 variants) |
| input | 텍스트 입력 |
| label | 폼 라벨 |
| select | 드롭다운 선택 |
| checkbox | 체크박스 |
| table | 테이블 기본 스타일 |
| card | 카드 컨테이너 |
| skeleton | 로딩 스켈레톤 |
| badge | 배지/태그 |
| separator | 구분선 |
| breadcrumb | 브레드크럼 |
| dropdown-menu | 드롭다운 메뉴 |
| dialog | 모달 다이얼로그 |
| sheet | 사이드 패널 |
| tooltip | 툴팁 |

**UI 라이브러리 결정 (2026-01-19):**
- ❌ DevExtreme: 라이선스 필요 ($899.99/년/개발자) → 제외
- ✅ TanStack Table + shadcn/ui: 무료, MIT 라이선스, React 네이티브
- ✅ Recharts: 차트 (무료)
- ✅ xlsx: 엑셀 Export (무료)

**사용 패턴:**

1. API 호출:
```tsx
// 직접 fetch 대신 api 객체 사용
import { api } from '@/lib/api';
const result = await api.projects.list({ page: 1 });
```

2. React Query 훅:
```tsx
import { useProjectList } from '@/hooks/queries';
const { data, isLoading, error } = useProjectList({ status: 'active' });
```

3. 폼 유효성:
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema } from '@/lib/validations';

const form = useForm({
  resolver: zodResolver(createProjectSchema),
});
```

---

### 요청(Request) 메뉴 상세 구조 (2026-01-19)

> 실제 프로젝트 기반 메뉴 설계 (요청 → 제안 → 계약 → 실행 흐름의 시작점)

```
요청 (request)
└── 고객요청 관리 (request.customer) ─ 2레벨 그룹
    ├── 고객요청 목록 (request.customer.list) ─ 3레벨 메뉴
    └── 고객요청 등록 (request.customer.create) ─ 3레벨 액션
```

**고객요청 등록 시 pr_project_m 상태:**
| 컬럼 | 값 | 설명 |
|------|-----|------|
| `status_code` | `opportunity` | 기회 단계 (계약 전) |
| `stage_code` | `waiting` | 대기 상태 (검토 전) |
| `project_source_code` | `request` | 고객 요청 기반 유입 |
| `done_result_code` | NULL | 아직 완료 전 |

**흐름 요약:**
1. **고객요청 등록** → opportunity + waiting + request
2. **검토 시작** → opportunity + in_progress
3. **수주 확정** → opportunity + done + won → execution 전환
4. **실주/보류** → opportunity + done + lost/hold

---

### 1레벨 메뉴 구조 (확정: 2026-01-19)

> 비즈니스 프로세스 흐름 기반: 요청 → 제안 → 계약 → 실행 → 종료 → 이관 → 운영

| 메뉴 | 영문 | 아이콘 | 커버 업무 | 비고 |
|------|------|--------|----------|------|
| 대시보드 | Dashboard | LayoutDashboard | 전체 현황, KPI, 알림 | 메인 진입점 |
| 요청 | Request | MessageSquare | 고객 요청 접수/관리, AM 관리 | AM 통한 고객사 요청 |
| 제안 | Opportunity | Lightbulb | 영업기회, 사전검토, 제안서 | Sales 중심 |
| 계약 | Contract | FileText | 계약 관리, 수주 확정 | 수주 프로세스 |
| 실행 | Project | Rocket | 프로젝트 목록/상세, 진행관리, 산출물, WBS, 이슈, 리스크 | PM 중심, 핵심 업무 |
| 종료 | Closing | CheckCircle | 프로젝트 완료조건 검증, 클로징 리포트 | 종료 프로세스 |
| 이관 | Handoff | ArrowRightLeft | SM 이관 준비, 승인, 완료 | SI → SM 전환 |
| 운영 | Operation | Settings | 운영 시스템, 유지보수, SLA | SM 중심 |
| 관리자 | Admin | Shield | 사용자/역할/부서/메뉴/고객사/코드 관리 | 새 창, 기준정보 |

**설계 원칙:**
- 1레벨 메뉴 = 비즈니스 프로세스 단계
- 2레벨 이하 메뉴는 유동적 (업무 변경에 따라 통합/분리)
- 고객사, 코드 등 기준정보 관리는 Admin으로 통합
- Admin은 별도 새 창으로 분리

**DB 적용 완료 (2026-01-19):**
- ✅ cm_menu_m: 16건 (1레벨 9개 + 2레벨 7개)
- ✅ cm_role_menu_r: 52건 (6개 역할별 권한) - **Role 테이블 정의 후 활성화**
- ✅ cm_user_menu_r: 16건 (admin 사용자 전체 권한) - **현재 활성 사용**

**권한 관리 현황:**
- **Role 테이블**: `cm_role_m` 별도 테이블로 분리 예정 (다중 릴레이션 대비)
- **권한 계산 방식**: UNION (합집합)
  - 최종 권한 = Role 권한 ∪ User 개별 권한
  - User가 Role과 별개로 특수 권한을 가질 수 있음 (유연한 예외 처리)
- **현재**: `cm_user_menu_r`로 사용자별 직접 권한 부여
- **추후**: Role 정의 후 `cm_role_menu_r` 활성화, 두 테이블 UNION으로 최종 권한 결정

---

### Phase 4: UI 라이브러리 및 페이지 템플릿 구현

> TanStack Table + shadcn/ui 기반 표준화된 페이지 레이아웃 구현

| # | 태스크 | 상태 | 설명 |
|---|--------|------|------|
| 13 | UI 라이브러리 결정 및 설정 | ✅ | TanStack Table + shadcn/ui (DevExtreme 라이선스 문제로 제외) |
| 14 | shadcn/ui 컴포넌트 설치 | ✅ | 16개 기본 컴포넌트 설치 완료 (textarea 추가, 2026-01-19) |
| 15 | Level 2 공통 컴포넌트 구현 | ✅ | PageHeader, DataTable, Pagination, FormComponents, StateDisplay (2026-01-19) |
| 16 | Level 3 페이지 템플릿 구현 | ✅ | ListPageTemplate, FormPageTemplate, DetailPageTemplate (2026-01-19) |
| 17 | 고객요청 화면 템플릿 적용 | ✅ | 목록/등록 페이지 리팩터링 완료 (2026-01-19) |
| 16 | Level 3 페이지 템플릿 구현 | ✅ | ListPageTemplate, FormPageTemplate, DetailPageTemplate (2026-01-19) |
| 17 | 고객요청 화면 템플릿 적용 | 🔲 | 기존 화면을 템플릿 기반으로 리팩터링 |

**UI 라이브러리 구성 (확정: 2026-01-19):**
```
TanStack Table + shadcn/ui + Recharts + xlsx
├── 기본 UI: shadcn/ui (Radix UI + Tailwind CSS)
├── 데이터 테이블: TanStack Table (정렬/필터/페이지네이션)
├── 가상 스크롤: TanStack Virtual (대용량 목록)
├── 차트: Recharts (차트 시각화)
└── 엑셀: xlsx (Export 기능)
```

**구현 완료 컴포넌트 (Level 2 - common/):**

| 컴포넌트 | 용도 | Props |
|----------|------|-------|
| PageHeader | 페이지 제목 + 브레드크럼 + 액션 | title, breadcrumb, actions |
| DataTable | 정렬/선택/페이지네이션 테이블 | columns, data, loading, pagination, enableRowSelection |
| Pagination | 페이지 네비게이션 | page, pageSize, total, onChange |
| FormSection | 폼 섹션 제목 + 필드 그룹 | title, description, children |
| FormActions | 저장/취소/삭제 버튼 | onSubmit, onCancel, loading |
| FormField | 라벨 + 에러 래퍼 | label, required, error, hint |
| EmptyState | 데이터 없음 표시 | icon, title, description, action |
| LoadingState | 로딩 상태 표시 | message |
| ErrorState | 에러 상태 표시 | error, onRetry |

**구현 완료 템플릿 (Level 3 - templates/):**

| 템플릿 | 용도 | 주요 Props |
|--------|------|-----------|
| ListPageTemplate | 목록 페이지 | header, filterFields, columns, data, pagination |
| FormPageTemplate | 등록/수정 페이지 | header, sections[], onSubmit, onCancel |
| DetailPageTemplate | 상세 페이지 | header, sections[], DetailFields |

**페이지 레이아웃 설계:**

> 📐 **상세 레이아웃 문서:** [ui-design/page-layouts.md](./ui-design/page-layouts.md)
> 
> 각 템플릿별 상세 레이아웃, 컬럼 구성, 검색 필터, 코드 예시 등 포함

---

### 설계 결정 사항

**레이아웃 구조:**
```
┌──────────────────────────────────────────────────────────────┐
│  [Header] 로고 | 빠른생성(+) | 알림 | 프로필                 │
├─────────────┬────────────────────────────────────────────────┤
│             │  [TabBar] 대시보드 × | 프로젝트 목록 × | ...   │
│  [Sidebar]  ├────────────────────────────────────────────────┤
│             │                                                │
│  (상세구조  │              [Content Area]                    │
│   아래참조) │                                                │
│             │           현재 활성 탭의 내용                   │
│             │                                                │
└─────────────┴────────────────────────────────────────────────┘
```

**사이드바 상세 구조 (펼친 상태):**
```
┌─────────────────────────────────┐
│ [메뉴 검색...         ]  🔄    │  ← 실시간 필터링 + 새로고침
├─────────────────────────────────┤
│ ⭐ 즐겨찾기              ▼      │  ← 접기/펼치기, DB 저장
│   ├─ 📄 대시보드                │
│   └─ 📄 프로젝트 목록           │
├─────────────────────────────────┤
│ 📑 현재 열린 페이지       ▼     │  ← 접기/펼치기
│   ├─ 📄 대시보드                │
│   └─ 📄 프로젝트 #123           │
├─────────────────────────────────┤
│ 📂 전체 메뉴                    │  
│   ├─ 📄 대시보드                │
│   ├─ 📁 프로젝트                │
│   │   ├─ 📄 프로젝트 목록       │
│   │   └─ 📄 프로젝트 생성       │
│   └─ 📁 고객사                  │
├─────────────────────────────────┤
│ ⚙️ 관리자 페이지                │  ← admin만 표시, 새 창 열기
└─────────────────────────────────┘
```

**사이드바 (접힌 상태):**
```
┌────┐
│ 🔍 │  ← hover → 검색 패널 플로트
├────┤
│ ⭐ │  ← hover → 즐겨찾기 목록 플로트
├────┤
│ 📑 │  ← hover → 현재 열린 탭 목록 플로트 (Layers 아이콘)
├────┤
│ 📂 │  ← hover → 메뉴 트리 플로트
├────┤
│ ⚙️ │  ← admin만, hover → 관리자 페이지 바로가기
└────┘
* 플로팅 패널: 마우스 벗어나도 약간의 딜레이 후 닫힘
```

**권한-메뉴 매트릭스 (1레벨 기준):**

| 메뉴 | admin | sales | am | pm | sm | external |
|------|-------|-------|----|----|----|----|
| 대시보드 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 요청 | ✅ | ✅ | ✅ | 👁️ | 👁️ | ❌ |
| 제안 | ✅ | ✅ | ✅ | 👁️ | ❌ | ❌ |
| 계약 | ✅ | ✅ | ✅ | 👁️ | ❌ | ❌ |
| 실행 | ✅ | 👁️ | ✅ | ✅ | 👁️ | ✅ |
| 종료 | ✅ | 👁️ | ✅ | ✅ | 👁️ | 👁️ |
| 이관 | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| 운영 | ✅ | ❌ | ✅ | 👁️ | ✅ | ❌ |
| 관리자 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

> ✅ 전체 접근, 👁️ 읽기 전용, ❌ 숨김

**라우팅 방식:** Client-side only routing (Protected SPA with no deep linking)
- URL 직접 접근 없음, 모든 네비게이션은 인증된 세션 내에서만 발생
- 보안: 권한 우회 시도 방지, API만 보호하면 됨

**모바일 대응:** 별도 모바일 전용 UI 제공 예정
- 해상도 기반 분기 → 모바일 진입점만 준비
- 모바일 UI는 추후 개발 (반응형 재배치 X, 전용 UI)

**관리자 페이지:** 별도 새 창으로 분리 (추후 개발)
- 토글 스위치 X → 버튼 클릭 시 새 창/탭으로 열기
- 별도 관리자 전용 레이아웃 제공
- 기존 작업 페이지와 간섭 없음

**메뉴 정의 방식:** DB 기반 (cm_menu_m) + 사용자 권한 (cm_user_menu_r)
- **현재**: Role 테이블 미정의, `cm_user_menu_r`로 사용자별 직접 권한 부여
- **추후**: Role 정의 후 `cm_role_menu_r` 활성화, `cm_user_menu_r`는 예외 처리용
- 부서별 권한 (cm_dept_menu_r)은 확장 설계만 완료, MVP 이후 구현
- 즐겨찾기는 DB 저장 (로그인 유지, 기기 간 동기화)

**권한 계산 로직 (현재 - Role 미정의):**
```
현재 권한 = 사용자 직접 권한 (cm_user_menu_r WHERE override_type = 'grant')
```

**권한 계산 로직 (추후 - Role 정의 후, UNION 방식):**
```
최종 권한 = 역할 권한 (cm_role_menu_r)
           ∪ 사용자 개별 권한 (cm_user_menu_r WHERE override_type = 'grant')
           - 사용자 권한 박탈 (cm_user_menu_r WHERE override_type = 'revoke')
```
- Role과 User 권한은 합집합(UNION)으로 결합
- User 개별 권한으로 Role에 없는 권한 추가 가능
- revoke로 특정 메뉴 명시적 차단 가능

**관련 문서:**
- [cm_menu.md](database/tables/cm_menu.md) - 메뉴 테이블 정의서
- [cm_role_menu.md](database/tables/cm_role_menu.md) - 역할별 권한
- [cm_user_menu.md](database/tables/cm_user_menu.md) - 사용자별 예외
- [cm_dept_menu.md](database/tables/cm_dept_menu.md) - 부서별 권한 (확장용)

---

## 📋 백로그 상태

| 상태 | 설명 |
|------|------|
| 🔲 대기 | 아직 시작하지 않음 |
| 🔄 진행중 | 현재 작업 중 |
| ✅ 완료 | 완료됨 |
| ⏸️ 보류 | 일시 중단 |

---

## 1. 테스트 자동화

### 1.1 Server (NestJS) 테스트 환경 구축 🔲

**우선순위**: P2 (Medium)  
**예상 작업량**: 2-3시간

**설치 패키지**:
```bash
cd apps/server
pnpm add -D jest @types/jest ts-jest supertest @types/supertest @nestjs/testing
```

**작업 내용**:
- [ ] Jest + ts-jest 설정 (jest.config.ts)
- [ ] Supertest 설정 (E2E 테스트)
- [ ] @nestjs/testing 모듈 설정
- [ ] 테스트 DB 환경 분리 (.env.test)
- [ ] 테스트 스크립트 추가 (package.json)
- [ ] 샘플 테스트 작성 (auth/login.e2e-spec.ts)

**관련 문서**: [테스트 케이스 문서](tests/README.md)

---

### 1.2 Web (Next.js) E2E 테스트 환경 구축 🔲

**우선순위**: P3 (Low)  
**예상 작업량**: 2-3시간

**설치 패키지**:
```bash
cd apps/web
pnpm add -D @playwright/test
npx playwright install
```

**작업 내용**:
- [ ] Playwright 설정 (playwright.config.ts)
- [ ] 테스트 서버 설정
- [ ] 샘플 E2E 테스트 작성 (login.spec.ts)
- [ ] CI/CD 통합 준비

---

### 1.3 CI/CD 테스트 자동화 🔲

**우선순위**: P3 (Low)  
**예상 작업량**: 1-2시간

**작업 내용**:
- [ ] GitHub Actions 워크플로우 작성
- [ ] PR마다 테스트 자동 실행
- [ ] 테스트 커버리지 리포트

---

## 2. 기술 부채

### 2.1 코드 품질 도구 🔲

**우선순위**: P3 (Low)

- [ ] Prettier 통합 설정
- [ ] Husky + lint-staged (pre-commit hook)
- [ ] Commitlint (커밋 메시지 규칙)

---

### 2.2 모니터링 & 로깅 🔲

**우선순위**: P2 (Medium)

- [ ] 프로덕션 로깅 전략 (pino 설정 개선)
- [ ] 에러 트래킹 (Sentry 등)
- [ ] APM 도입 검토

---

## 3. 인프라

### 3.1 배포 환경 🔲

**우선순위**: P2 (Medium)

- [ ] Docker Compose 설정
- [ ] 환경별 설정 (.env.production)
- [ ] 배포 스크립트

---

## 4. 기능 백로그

### 4.1 사용자 초대 플로우 🔲

**우선순위**: P1 (High)

- [ ] 초대 이메일 발송
- [ ] 초대 토큰 검증
- [ ] 비밀번호 설정 페이지

---

### 4.2 프로젝트 관리 🔲

**우선순위**: P1 (High)

- [ ] 프로젝트 생성
- [ ] 산출물 관리
- [ ] 프로젝트 종료 조건

---

## 📝 히스토리

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-19 | 라우팅 구조 설계 완료 (Route Groups: auth/main) |
| 2026-01-19 | 프론트엔드 레이아웃 컴포넌트 구현 완료 (타입, 스토어, 컴포넌트) |
| 2026-01-19 | UserFavorite 모델 추가 (cm_user_favorite_r 테이블) |
| 2026-01-17 | 메뉴/레이아웃 시스템 설계 시작 (옵션 B: 설계 우선) |
| 2026-01-17 | 백로그 문서 생성, 테스트 자동화 항목 추가 |
