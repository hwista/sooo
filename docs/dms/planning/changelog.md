# DMS 변경 이력 (Changelog)

> DMS(Document Management System) 개발 변경 이력

**마지막 업데이트**: 2026-02-03

---

## 📅 2026-02

### 2026-02-03

#### Phase 9: 컨트롤 높이 표준화 및 드롭다운 안정화
| 커밋 | 변경 내용 |
|------|----------|
| - | **DMS 컨트롤/컨테이너 높이 표준 적용** |
| | - Header/Toolbar/EditorToolbar/Sidebar 등 컨트롤 높이 및 컨테이너 패딩 통일 |
| | - 인라인 아이콘 버튼 크기 표준(32px) 적용 |
| | **드롭다운 메뉴 표준 개선** |
| | - 메뉴 항목 높이 `h-control-h` 통일 |
| | - 문서 타입/AI 검색 드롭다운 클릭 방식으로 안정화 |
| | **뷰어 컴포넌트 네이밍 정리** |
| | - ViewerToolbar/ViewerContent → Toolbar/Content |
| | **문서 타입 옵션 정리** |
| | - 문서 타입: Wiki, Dev로 단순화 (Blog 제거) |

## 📅 2026-01

### 2026-01-30

#### Phase 8: PMS/DMS 구조 통일 - Sidebar 통합
| 커밋 | 변경 내용 |
|------|----------|
| - | **types 구조 PMS 통일** |
| | - `layout.ts`: 주석 헤더 통일, `sidebar.width` → `expandedWidth` 네이밍 변경 |
| | - `layout.ts`: `tabBar.height` 명확화 (height: 36, containerHeight: 53) |
| | - `sidebar.ts`: 신규 생성 (SidebarSection, SidebarState, SIDEBAR_SECTION_ICONS 등) |
| | - `index.ts`: sidebar.ts export 추가 |
| | - 사용처 업데이트: AppLayout, Sidebar, DocPageTemplate, layout.store |
| - | **미사용 ui 컴포넌트 삭제**: menu, popover, progress, spinner |
| | **Breadcrumb 스타일 PMS 통일** |
| | - 중간 경로/파일 아이콘 제거 (루트 Folder 아이콘만 유지) |
| | - PMS와 동일 스타일: `📁 > 텍스트 > 텍스트(볼드)` |
| - | **버그 수정: Search 무한 루프** |
| | - lucide-react `Search` 아이콘과 컴포넌트 이름 충돌 → `SearchIcon` alias로 해결 |
| | **레거시 정리** |
| | - `MainSidebar/` 폴더 삭제 (Sidebar로 통합 완료) |
| | - `Sidebar/constants.ts` 추가 (SECTION_ICONS 상수 PMS와 동일 구조) |
| | - `Sidebar/index.ts` barrel export 재구성 |
| - | **Sidebar 폴더 구조 통합** |
| | - `MainSidebar/` + `sidebar/` → `Sidebar/` 단일 폴더로 통합 |
| | - 컴포넌트 접두어 제거: `SidebarSearch` → `Search`, `SidebarSection` → `Section` 등 |
| | - `MainSidebar` 컴포넌트 → `Sidebar`로 이름 변경 |
| | - `layout/index.ts`, `AppLayout.tsx` import/export 수정 |
| | **common/page 네이밍 PMS 통일** |
| | - `DocBreadcrumb` → `Breadcrumb` |
| | - `DocHeader` → `Header` |
| | - `DocContent` → `Content` |
| | - `DocSidecar` → `Sidecar` |
| | - `DocViewer` → `Viewer` |
| | **editor 폴더 구조 정리** |
| | - `WikiEditor.tsx` → `editor/WikiEditor.tsx` 이동 |

### 2026-01-29

#### Phase 7: 문서 시스템 템플릿 재설계 - 뷰어 툴바 완성
| 커밋 | 변경 내용 |
|------|----------|
| - | **DocViewer 뷰어 툴바 기능 완성** |
| | - 목차: 마우스 오버 시 플로팅 패널, 레벨별 볼드/색상 구분 |
| | - 검색: 하이라이트 + 결과 탐색 (이전/다음) + 0/0 표시 |
| | - 줌: 75%~200% 확대/축소 + 리셋 |
| | **마크다운 렌더링 개선** |
| | - markdownConverter.ts: 커스텀 renderer로 헤딩에 `id="heading-N"` 자동 부여 |
| | - 목차 클릭 시 해당 섹션으로 스크롤 이동 |
| | **검색 기능 state 기반 재구현** |
| | - DOM 직접 조작 → `highlightedContent` state 방식으로 변경 |
| | - React 리렌더링과의 충돌 해결 |
| | **코드 정리 및 PMS 패턴 통일** |
| | - `common/doc/` → `common/page/` 네이밍 변경 (PMS 일관성) |
| | - `DocViewerTemplate.tsx` 삭제 (미사용 가비지) |
| | - `pages/wiki/editor/` 빈 폴더 삭제 |
| | - 템플릿 미사용 props 제거 (`toc`, `onTocClick`, `onSearch`) |

#### 패턴 통일: Store 파일명 및 타입 분리
| 커밋 | 변경 내용 |
|------|----------|
| `c1316bc` | **Store 파일명 컨벤션 PMS 표준화** |
| | - `*-store.ts` → `*.store.ts` (9개 파일 rename) |
| | - stores/index.ts 중앙 export 업데이트 |
| | - 모든 컴포넌트 `@/stores` barrel export 사용 |
| | **types/tab.ts 도메인별 분리** |
| | - TabItem, OpenTabOptions 타입을 layout.ts에서 분리 |
| | - types/index.ts export 추가 |
| | - tab.store.ts import 경로 수정 |

#### Phase 4: API 레이어 정리 완료
| 커밋 | 변경 내용 |
|------|----------|
| `05219e4` | **apiClient.ts 확장** |
| | - userApi, searchApi, uploadApi, aiApi 추가 |
| | - 모든 직접 fetch 호출 제거 → API 클라이언트 사용 |
| `3b88a4f` | package-unification-analysis.md 장기 통합 분석 문서 추가 |
| `262da36` | BlockEditor Tiptap SSR 하이드레이션 오류 수정 (`immediatelyRender: false`) |

### 2026-01-28

#### Phase 2 추가: 색상 토큰 PMS 표준 통일
| 커밋 | 변경 내용 |
|------|----------|
| `14fb202` | **Sidebar 색상 토큰 PMS 표준 통일** |
| | - SidebarSearch: `text-muted-foreground` → `text-gray-400` |
| | - SidebarOpenTabs: `text-foreground` → `text-gray-700` |
| | - SidebarBookmarks: semantic 토큰 → `gray-xxx` |
| | - SidebarFileTree: semantic 토큰 → `gray-xxx` |
| | - MainSidebar 카피라이트: `text-muted-foreground` → `text-gray-500` |

#### Phase 2-L: Store 구조 비교 (분석 완료)
| 분석 | 결과 |
|------|------|
| tab-store | PMS: menuCode/menuId 기반 / DMS: id 기반 → **도메인 차이로 유지** |
| layout-store | PMS: sidebar collapse/float / DMS: 위키 특화 상태 → **유지** |
| tree-store | DMS 전용 파일 트리 → **유지** |
| wiki-*.ts | DMS 위키 도메인 전용 → **유지** |
| **결론** | Store 구조는 도메인 특성상 다르게 유지 (코드 변경 없음) |

#### Phase 2-K: UI 컴포넌트 통일
| 커밋 | 변경 내용 |
|------|----------|
| `f0495b1` | **Button, Input SSOO 디자인 시스템 적용** |
| | - Button: `bg-ssoo-primary`, `bg-ls-red`, `h-control-h` |
| | - Input: `h-9` → `h-control-h` |
| | - Dialog: PMS와 동일 확인 (변경 불필요) |

#### Phase 2-J: ContentArea, AppLayout 통일
| 커밋 | 변경 내용 |
|------|----------|
| `04ad943` | **ContentArea 헤더 스타일 PMS 통일** |
| | - `hover:border-[#003366]` → `hover:border-ssoo-primary` |
| | - `text-2xl font-bold` → `heading-1` |

#### Phase 2-I: Header/TabBar 스타일 통일
| 커밋 | 변경 내용 |
|------|----------|
| `5d01d6f` | **Header/TabBar PMS 스타일 통일** |
| | - PMS Header: `h-[60px]` → `h-header-h` |
| | - DMS Header: `bg-red-500` → `bg-ls-red` (알림 뱃지) |
| | - DMS TabBar: 높이, 배경색, 보더색, 텍스트색 PMS 기준 통일 |
| `a366f3b` | **하드코딩 색상 CSS 변수화** |
| | - gray-xxx → semantic CSS 변수 (muted-foreground, foreground) |
| | - border-gray-200 → border-ssoo-content-border |
| | - bg-white → bg-background |
| | - 모든 sidebar 컴포넌트 색상 토큰 통일 |

#### Phase 2-H: 사이드바 스타일 통일 (계속)
| 커밋 | 변경 내용 |
|------|----------|
| `beaca73` | 문서화 업데이트 (changelog, backlog) |
| `a5f08ab` | PMS/DMS 양방향 스타일 통일 |
| | - PMS: `h-[60px]` → `h-header-h`, × → X 컴포넌트 |
| | - DMS: `border-ssoo-content-border` → `border-gray-200` (섹션 구분선) |
| | - DMS: ScrollArea 컴포넌트 추가 (PMS 복사) |
| `97cd55f` | **SidebarFileTree 재작성** |
| | - TreeComponent 의존성 제거 |
| | - FileTreeNode 직접 구현 (PMS MenuTreeNode 스타일) |
| | - layout-store에 expandedFolders, toggleFolder 추가 |
| `45ae1fd` | **MainSidebar 구조 대폭 변경** |
| | - 책갈피 섹션 추가 (PMS 즐겨찾기 대응) |
| | - 섹션 아이콘 추가 (Bookmark, Layers, FolderTree) |
| | - 섹션명 변경: "열린 문서" → "현재 열린 페이지", "파일 탐색기" → "전체 파일" |
| | - 검색 옆 새로고침 버튼 추가 |
| | - 하단 카피라이트 추가 |
| | - 문서 타입 선택을 헤더로 이동 |
| | - 로고: W 아이콘 + Wiki 텍스트 |
| | - SidebarSection, SidebarBookmarks 컴포넌트 신규 |
| | - tab-store에 BookmarkItem, 북마크 액션 추가 |
| `4072ef4` | globals.css 타이포그래피 표준 적용 |
| `ac9853e` | TreeComponent 아이콘 lucide-react로 변경 |
| `7c21b48` | SidebarSearch, SidebarOpenTabs, SidebarFileTree PMS 스타일 적용 |

### 2026-01-27

#### Phase 2-G: Layout 컴포넌트 신규 생성
| 커밋 | 변경 내용 |
|------|----------|
| - | AppLayout, Header, TabBar, ContentArea 생성 |
| - | MainSidebar, Sidebar 하위 컴포넌트 생성 |
| - | PMS 표준 레이아웃 구조 적용 |

#### Phase 2-F: Fluent UI 제거
| 커밋 | 변경 내용 |
|------|----------|
| - | @fluentui/react-components 의존성 제거 |
| - | 자체 UI 컴포넌트로 전환 (button, card, input 등) |
| - | shadcn/ui 스타일 패턴 적용 |

### 2026-01-26

#### Phase 2: DMS 리팩토링 시작
| 커밋 | 변경 내용 |
|------|----------|
| - | **브랜치**: `dms/refactor/integration` |
| - | PMS 기준 프로젝트 구조 정립 |
| - | SSOO 디자인 시스템 적용 |

---

## 📋 변경 유형 범례

| 태그 | 설명 |
|------|------|
| 기능 | 새로운 기능 추가 |
| 수정 | 버그 수정 |
| 리팩터링 | 코드 구조 개선 |
| 문서 | 문서화 작업 |
| 설정 | 설정 파일 변경 |
| 스타일 | UI/UX 개선 |

---

## 🔗 관련 문서

- [DMS Backlog](./backlog.md)
- [DMS Roadmap](./roadmap.md)
- [PMS Changelog](../../pms/planning/changelog.md)
