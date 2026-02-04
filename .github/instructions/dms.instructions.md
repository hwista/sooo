---
applyTo: "apps/web/dms/**"
---

# DMS 프론트엔드 개발 규칙

> 이 규칙은 `apps/web/dms/` 경로의 파일 작업 시 적용됩니다.
> ⚠️ **DMS는 독립 프로젝트입니다. @ssoo/* 패키지를 참조하지 마세요.**

---

## 독립성 원칙

| 항목 | DMS | PMS |
|------|-----|-----|
| 패키지 매니저 | **npm** | pnpm |
| @ssoo/* 패키지 | ❌ 사용 금지 | ✅ 사용 |
| 포트 | 3001 | 3000 |

DMS는 별도 저장소로 분리될 가능성이 있어 모노레포 의존성을 갖지 않습니다.

---

## 기술 스택

- Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Tailwind CSS 3.x + Radix UI + MUI (Tree View)
- Zustand 5.x, React Hook Form + Zod
- Tiptap (리치 텍스트 에디터)
- Marked, react-markdown (마크다운 처리)

---

## 폴더 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # 메인 레이아웃 그룹
│   ├── api/               # API Routes
│   └── layout.tsx
├── components/
│   ├── ui/                # Radix UI 기반 원자
│   ├── common/            # 공통 (ConfirmDialog, StateDisplay)
│   ├── layout/            # AppLayout, Sidebar, Header, TabBar
│   └── pages/             # 페이지별 컴포넌트
│       ├── home/
│       └── markdown/
├── hooks/                 # 커스텀 훅
├── lib/                   # 유틸리티
├── stores/                # Zustand 스토어
├── types/                 # 타입 정의
└── server/                # 서버 레이어 (handlers, services)
```

---

## 레이어 의존성

```
pages → templates → common → ui
  ↓
hooks → lib/api → stores
```

- 상위 → 하위만 참조
- 역방향 참조 금지 (ui → pages ❌)
- 순환 참조 금지

---

## 네이밍 규칙

| 유형 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `FileTree.tsx` |
| 훅 | camelCase (use 접두사) | `useEditor.ts` |
| 유틸리티 | camelCase | `pathUtils.ts` |
| 스토어 | kebab-case (store 접미사) | `tab.store.ts` |
| 상수 | SCREAMING_SNAKE_CASE | `HOME_TAB`, `MAX_TABS` |

---

## 서버 레이어 패턴 (server/)

```typescript
// ✅ Handler: 단순 라우팅, 로직은 서비스로 위임
export async function GET(request: NextRequest) {
  const result = await fileSystemService.getFileTree();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}

// ✅ Service: BaseService 없이 단순 구조
class FileSystemService {
  async getFileTree(): Promise<ServiceResult<FileNode[]>> {
    // 실제 로직만 구현
  }
}

export const fileSystemService = new FileSystemService();
```

**왜 이 패턴인가:**
- 불필요한 추상화 제거 → 코드 이해 용이
- 싱글톤 export → 인스턴스 관리 단순화
- 실제 사용 메서드만 → Dead Code 방지

---

## Zustand 스토어 패턴

```typescript
// ✅ 표준: State/Actions 인터페이스 분리
interface TabStoreState {
  tabs: TabItem[];
  activeTabId: string | null;
}

interface TabStoreActions {
  openTab: (options: OpenTabOptions) => string;
  closeTab: (id: string) => void;
}

const useTabStore = create<TabStoreState & TabStoreActions>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      openTab: (options) => { /* ... */ },
      closeTab: (id) => { /* ... */ },
    }),
    { name: 'tab-store', storage: createJSONStorage(() => localStorage) }
  )
);
```

---

## 미들웨어 패턴

```typescript
// ✅ 표준: named export, matcher로 필터링
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const allowedPaths = ['/'];
  if (allowedPaths.some((path) => pathname === path)) {
    return NextResponse.next();
  }
  
  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*|favicon.ico).*)'],
};
```

---

## 타입 정의 규칙

```typescript
// ✅ 인터페이스와 구현 일치
export interface TabItem {
  id: string;
  title: string;
  closable: boolean;
  openedAt: Date;
}

// 구현 시 타입에 없는 필드 추가 금지
const createTab = (): TabItem => ({
  id: '...',
  title: '...',
  closable: true,
  openedAt: new Date(),
  // ❌ status: 'active' → 타입에 없음
});
```

---

## Export 규칙

```typescript
// ✅ 명시적 re-export
export { Button } from './Button';
export { Input } from './Input';

// ❌ 와일드카드 export 금지
export * from './components';
```

---

## 컴포넌트 크기 가이드

| 유형 | 권장 라인 | 초과 시 조치 |
|------|----------|-------------|
| UI 컴포넌트 | ~50줄 | 분리 검토 |
| Common 컴포넌트 | ~150줄 | 책임 분리 |
| Template | ~200줄 | 하위 컴포넌트 추출 |
| Page | ~150줄 | 로직을 훅/스토어로 이동 |

---

## Dead Code 삭제 기준

1. **grep 검색 결과 0건** → 어디서도 참조 안 됨
2. **import는 있으나 실제 호출 없음** → 사용 안 됨
3. **주석 처리된 코드 블록** → 필요하면 git에서 복원
4. **TODO/FIXME만 있고 구현 없는 스텁** → 미래 기능 선제작

---

## 금지 사항

1. **@ssoo/* 패키지 import** - DMS는 독립 프로젝트
2. **BaseService 등 불필요한 추상화**
3. **any 타입 사용**
4. **와일드카드 export**
5. **미사용 코드 커밋**
6. **타입에 없는 필드 추가**

---

## 관련 문서

- [apps/web/dms/docs/development/AGENTS.md](apps/web/dms/docs/development/AGENTS.md) - DMS 에이전트 가이드
- [apps/web/dms/docs/development/architecture/](apps/web/dms/docs/development/architecture/) - 아키텍처
- [apps/web/dms/docs/development/guides/](apps/web/dms/docs/development/guides/) - 개발 가이드
