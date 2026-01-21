# SSOO 변경 이력 (Changelog)

> 버그 수정, 주요 변경 사항을 기록합니다.

---

## 2026-01-21

### 🔄 ssoo-red → ls-red 통합

**변경 사항:**
- `--ssoo-red` CSS 변수 제거 (LS CI의 `--ls-red`와 동일 값 중복)
- 모든 `ssoo-red` 사용처를 `ls-red`로 변경
- `tailwind.config.ts`의 `ssoo.red`가 `--ls-red` 참조하도록 수정 (하위 호환성 유지)

**수정된 파일:**
- `globals.css`: `--ssoo-red` 변수 제거
- `tailwind.config.ts`: `ssoo.red` → `var(--ls-red)` 참조
- `button.tsx`: destructive variant `ls-red` 사용
- `Header.tsx`, `login/page.tsx`, `CustomerRequestListPage.tsx`: `ls-red` 사용

**사용 방법:**
```tsx
// Destructive/경고 색상은 ls-red 사용
<div className="text-ls-red">에러 메시지</div>
<div className="bg-ls-red/10 text-ls-red">경고 배지</div>
```

---

### 🎨 색상 중앙화 및 LS CI 팔레트 추가

**디자인 시스템 개선:**
- 모든 하드코딩된 색상 코드(`[#XXXXXX]`)를 Tailwind CSS 변수 기반 클래스로 교체
- `tailwind.config.ts`에 `ssoo-*` 및 `ls-*` 색상 팔레트 추가
- 다크모드 및 테마 변경 지원 기반 마련

**LS CI 색상 팔레트 추가:**

| 구분 | 색상명 | HEX | Tailwind 클래스 |
|------|--------|-----|-----------------|
| 메인 | LS BLUE | `#0A1E5A` | `ls-blue` |
| 메인 | LS RED | `#FA002D` | `ls-red` |
| 서브 | GREEN | `#009BB4` | `ls-green` |
| 서브 | BLUE | `#0569A0` | `ls-sub-blue` |
| 서브 | GRAY | `#7D8282` | `ls-gray` |
| 서브 | SILVER | `#87827D` | `ls-silver` |
| 서브 | GOLD | `#7D0D0D` | `ls-gold` |

**수정된 파일 (15개):**
- `globals.css`, `tailwind.config.ts`: CI 색상 변수 및 팔레트 추가
- `button.tsx`, `Header.tsx`, `TabBar.tsx`, `login/page.tsx`
- MainSidebar 5개 컴포넌트 (`MainSidebar`, `ExpandedSidebar`, `CollapsedSidebar`, `FloatingPanel`, `SidebarSection`)
- sidebar 4개 컴포넌트 (`SidebarSearch`, `SidebarOpenTabs`, `SidebarMenuTree`, `SidebarFavorites`)
- `CustomerRequestListPage.tsx`

**사용 방법:**
```tsx
// ❌ 금지: 하드코딩
<div className="bg-[#003876]">

// ✅ 권장: Tailwind 클래스
<div className="bg-ssoo-primary">  // SSOO 테마 색상
<div className="bg-ls-blue">       // LS CI 색상
```

---

## 2026-01-20

### ✨ 권한 가드 구현 (P1-FEATURE)

**백엔드:**
- `@Roles()` 데코레이터: 역할 기반 접근 제어 (예: `@Roles('admin', 'pm')`)
- `RolesGuard`: JwtAuthGuard와 함께 사용하는 역할 검증 가드
- 모든 컨트롤러에 `@UseGuards(JwtAuthGuard, RolesGuard)` 적용

**프론트엔드:**
- `useAuth` 훅: `hasRole()`, `isAdmin`, `isManager` 제공
- `ProtectedRoute` 컴포넌트: 역할 기반 라우트 보호
- `AuthUser` 타입 export (auth.store.ts)

**사용 예시:**
```typescript
// 백엔드 - admin만 접근 가능한 엔드포인트
@Delete(':id')
@Roles('admin')
async remove(@Param('id') id: string) { ... }

// 프론트엔드 - 역할 기반 UI 제어
const { hasRole, isAdmin } = useAuth();
{hasRole('admin', 'pm') && <AdminPanel />}

// 프론트엔드 - 라우트 보호
<ProtectedRoute roles={['admin']}>
  <AdminPage />
</ProtectedRoute>
```

---

### ✅ 타입 정합성 검증 완료 (P1-TYPE)

**SRV-06: any 타입 제거**
- `request-context.interceptor.ts`: `Observable<unknown>` 반환 확인 (이미 수정됨)

**TYPE-05: 메뉴 타입 통합 검토**
- 중복 없음 확인: `packages/types`(공통 엔티티) vs `apps/web/src/types`(프론트엔드 전용 UI)
- 현 구조 유지 결정

---

### ✨ 리팩토링: 대형 컴포넌트 분리 (P1-REFACTOR)

**DataTable 분리 (WEB-05):**
- 454줄 단일 파일 → 5개 파일 폴더 구조
- `DataTable.tsx`: 메인 컴포넌트 + 상태 관리
- `DataTableToolbar.tsx`: 검색 + 컨럼 가시성
- `DataTableBody.tsx`: 테이블 본문 + 로딩/빈상태
- `DataTableFooter.tsx`: 선택 정보 + 페이지네이션
- `data-table-utils.tsx`: 유틸리티 함수 (createSortableHeader, createActionsColumn)

**MainSidebar 분리 (WEB-06):**
- 295줄 단일 파일 → 6개 파일 폴더 구조
- `MainSidebar.tsx`: 메인 컴포넌트 + 플로트 로직
- `CollapsedSidebar.tsx`: 접힌 상태 (아이콘만)
- `ExpandedSidebar.tsx`: 펼친 상태 (전체 UI)
- `FloatingPanel.tsx`: 플로틸 패널
- `SidebarSection.tsx`: 섹션 래퍼
- `sidebar-constants.ts`: 상수 정의

**효과:**
- 컴포넌트별 단일 책임 원칙 준수
- 코드 가독성 및 유지보수성 향상
- 테스트 및 재사용성 개선

---

### ✨ 기능 추가: 자동 품질 게이트 (IMM-01)

**추가된 도구:**
- Husky: Git hooks 자동 실행 (pre-commit, commit-msg)
- Commitlint: 커밋 메시지 규칙 강제 (conventional commits)

**설정 파일:**
- `.husky/pre-commit`: 전체 lint 실행
- `.husky/commit-msg`: commitlint 검증
- `commitlint.config.mjs`: 커밋 타입 규칙 정의
- `apps/server/eslint.config.mjs`: ESLint v9 flat config 추가

**효과:**
- 커밋 시 자동 ESLint 검증으로 코드 품질 강제
- 일관된 커밋 메시지(feat/fix/docs 등)로 변경 이력 추적 용이

---

### 🔧 개선: 하드코딩 URL 제거 (IMM-02)

**변경:**
- `apps/web/src/stores/menu.store.ts`
- `fetch('http://localhost:4000/api/menus/my')` → `apiClient.get('/menus/my')`

**추가 개선:**
- 401 에러 처리 중복 제거 (apiClient에서 통합 처리)
- 환경변수 기반 API URL로 배포 환경 대응

---

### 🔧 개선: 인증 가드 타입 안전성 강화 (IMM-03)

**변경:**
- `apps/server/src/auth/guards/jwt-auth.guard.ts`
- `handleRequest(err: any, user: any, info: any): any`
- → `handleRequest<TUser = TokenPayload>(err: Error | null, user: TUser | false, info: { message?: string }): TUser`

**효과:**
- 보안 핵심 모듈의 타입 안전성 확보
- 런타임 에러 사전 방지

---

### 🔧 버그 수정: 인증 토큰 만료 시 메뉴 로드 실패

**증상:**
- 서버 재시작 후에도 이미 로그인된 화면으로 표시
- localStorage에 만료된 토큰이 남아있어 `isAuthenticated`가 true
- 메뉴 API 호출 시 401 에러 발생하나 처리되지 않아 빈 메뉴 트리

**원인:**
1. `checkAuth()`에서 `isAuthenticated`가 true일 때 서버 검증 없이 진행
2. 메뉴 API 401 응답 시 인증 초기화 로직 부재
3. 토큰 갱신 실패 시 조용히 실패 (에러 로그 없음)

**수정:**
- `stores/auth.store.ts`: checkAuth에서 항상 서버에서 토큰 유효성 검증
- `stores/menu.store.ts`: 401 응답 시 clearAuth + clearMenu 호출
- `app/(main)/layout.tsx`: 로그인 성공 시 메뉴도 함께 로드

**관련 문서:**
- [architecture/auth-system.md](architecture/auth-system.md)

---

## 2026-01-19

### ✨ 기능 추가: 메뉴/레이아웃 시스템 구현 완료

- Prisma db push - 6개 테이블 생성
- 히스토리 트리거 14개 설치
- 메뉴 Seed 데이터 17건 입력
- 역할별 권한 데이터 66건 입력 (6개 역할)
- 프론트엔드 레이아웃 컴포넌트 구현 완료
- Next.js App Router Route Groups 적용

### ✨ 기능 추가: 페이지 보안 및 라우팅 강화

- 미들웨어 직접 접근 차단
- 404 자동 리다이렉트
- ContentArea 동적 로딩

### ✨ 기능 추가: 디자인 시스템 표준화

- 그룹웨어 색상 체계 적용
- 컨트롤 높이 표준화 (36px)
- 디자인 토큰 정의

---

## 2026-01-17

### 📝 문서: 백로그 문서 생성

- 테스트 자동화 항목 추가
- 메뉴/레이아웃 시스템 설계 시작
