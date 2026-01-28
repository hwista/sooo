# DMS 변경 이력 (Changelog)

> DMS(Document Management System) 개발 변경 이력

**마지막 업데이트**: 2026-01-28

---

## 📅 2026-01

### 2026-01-28

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
