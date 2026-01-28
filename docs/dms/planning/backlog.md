# DMS 백로그 (Backlog)

> DMS(Document Management System) 작업 계획 및 진행 상황

**마지막 업데이트**: 2026-01-28

---

## 🎯 현재 작업: Phase 2 - DMS 리팩토링

**브랜치**: `dms/refactor/integration`  
**목표**: PMS 기준 프로젝트 구조 통일 및 SSOO 디자인 시스템 적용

---

## ✅ 완료된 작업

### Phase 2-F: Fluent UI 제거
- [x] @fluentui/react-components 의존성 제거
- [x] 자체 UI 컴포넌트로 전환
- [x] shadcn/ui 스타일 패턴 적용

### Phase 2-G: Layout 컴포넌트 신규 생성
- [x] AppLayout 컴포넌트 (PMS 표준)
- [x] Header 컴포넌트
- [x] TabBar 컴포넌트
- [x] MainSidebar 컴포넌트
- [x] ContentArea 컴포넌트
- [x] Sidebar 하위 컴포넌트 구조

### Phase 2-H: 사이드바 PMS 스타일 통일
- [x] SidebarSearch PMS 스타일 적용
- [x] SidebarOpenTabs PMS 스타일 적용
- [x] SidebarFileTree 재작성 (TreeComponent 제거)
- [x] SidebarSection 래퍼 컴포넌트 생성
- [x] SidebarBookmarks 컴포넌트 생성 (PMS 즐겨찾기 대응)
- [x] MainSidebar 구조 변경 (로고, 섹션, 카피라이트)
- [x] tab-store 북마크 기능 추가
- [x] layout-store 폴더 확장 상태 추가
- [x] ScrollArea 컴포넌트 추가

### Phase 2-I: Header/TabBar 스타일 통일
- [x] PMS Header: `h-[60px]` → `h-header-h`
- [x] DMS Header: 알림 뱃지 `bg-red-500` → `bg-ls-red`
- [x] DMS TabBar: 높이, 배경색, 보더색, 텍스트색 PMS 기준 통일
- [x] 하드코딩 gray 색상 → CSS 변수화 (muted-foreground, foreground)

### Phase 2-J: ContentArea, AppLayout 통일
- [x] ContentArea: `hover:border-[#003366]` → `hover:border-ssoo-primary`
- [x] AppLayout: `text-2xl font-bold` → `heading-1`

### Phase 2-K: UI 컴포넌트 통일
- [x] Dialog: PMS와 동일 확인 (변경 불필요)
- [x] Button: SSOO 디자인 시스템 토큰 적용
- [x] Input: `h-9` → `h-control-h`

### Phase 2-L: Store 구조 비교 (분석)
- [x] tab-store: 도메인 차이로 구조 유지
- [x] layout-store: 위키 특화 상태로 유지
- [x] tree-store: DMS 전용 유지
- [x] wiki-*.ts: DMS 도메인 전용 유지

---

## ✅ Phase 2 완료!

---

## 📋 예정된 작업

### Phase 3: 기능 검증
- [ ] ScrollArea 완전 동일화 확인
- [ ] Dialog 컴포넌트 비교
- [ ] Button, Input 등 기본 UI 비교
- [ ] packages/ui-common 분리 검토 (후순위)

### Phase 2-L: Store 구조 정리
- [ ] tab-store PMS 구조 비교
- [ ] layout-store PMS sidebarStore 비교
- [ ] tree-store 정리

### Phase 3: 기능 구현
- [ ] 파일 목록 API 연동
- [ ] 마크다운 뷰어/에디터 정리
- [ ] 검색 기능 구현
- [ ] 책갈피 API 연동

---

## 🏷️ 작업 우선순위

| 우선순위 | 설명 |
|:--------:|------|
| P0 | 즉시 처리 필요 |
| P1 | 이번 스프린트 내 완료 |
| P2 | 다음 스프린트 |
| P3 | 백로그 |

---

## 🔗 관련 문서

- [DMS Changelog](./changelog.md)
- [DMS Roadmap](./roadmap.md)
- [PMS Backlog](../../pms/planning/backlog.md)
