# SSOO 변경 이력 (Changelog) - 인덱스

> 전체 변경 이력 요약 및 영역별 문서 링크

**마지막 업데이트**: 2026-01-21

---

## 📍 영역별 Changelog 위치

각 문서 하단에 해당 영역의 상세 변경 이력이 있습니다.

| 영역 | 문서 위치 | 설명 |
|------|----------|------|
| **작업 프로세스** | [docs/architecture/workflow-process.md](./architecture/workflow-process.md#changelog) | 개발 프로세스/커밋/Git |
| **프론트엔드 표준** | [docs/architecture/frontend-standards.md](./architecture/frontend-standards.md#changelog) | 컴포넌트 표준 |
| **API** | [docs/api/README.md](./api/README.md#changelog) | REST API 변경 |
| **레이아웃** | [docs/architecture/layout-system.md](./architecture/layout-system.md#changelog) | 레이아웃/사이드바/탭바 |
| **상태 관리** | [docs/architecture/state-management.md](./architecture/state-management.md#changelog) | Zustand Store |
| **UI 컴포넌트** | [docs/architecture/ui-components.md](./architecture/ui-components.md#changelog) | 공통 컴포넌트 |
| **유틸리티** | [docs/architecture/utilities.md](./architecture/utilities.md#changelog) | API Client, 헬퍼 |
| **인증** | [docs/architecture/auth-system.md](./architecture/auth-system.md#changelog) | 인증/인가 |
| **스크롤바** | [docs/architecture/scrollbar.md](./architecture/scrollbar.md#changelog) | 스크롤바 스타일 |
| **데이터베이스** | [docs/database/README.md](./database/README.md#changelog) | 테이블 스키마 |

---

## 📅 최근 변경 요약

### 2026-01-21

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 문서 | apps/web → apps/web-pms 리네임 완료 |
| - | - | 문서 | apps/web-dms 디렉토리 슬롯 준비 |
| - | - | 문서 | 문서 시스템 구성/롤백 기준 정리 추가 |
| - | - | 문서 | TypeDoc/Storybook 역할 및 도입 위치 정리 |
| - | - | 문서 | TypeDoc/Storybook 전환 원칙 추가 |
| - | - | 문서 | PMS 내 문서 UI/렌더링 롤백 진행 |
| - | - | 문서 | docs 공통/시스템별 디렉토리 분리안 추가 |
| - | - | 문서 | 도큐먼트 시스템 docs 동기화 정책 추가 |
| - | - | 문서 | 위키 통합 계획 문서 추가 |
| - | - | 문서 | /docs 홈에 문서 자동 목록 표시 추가 |
| - | - | 문서 | /docs 문서 허브 및 ReDoc 기반 API Reference 경로 추가 |
| - | - | 문서 | 리팩터링 문서 아카이브 이동 및 개발 표준 위치 정리 |
| - | `cef4630` | 문서 | UI 컴포넌트 및 유틸리티 문서화 |
| - | `63d21be` | 문서 | 상태 관리 및 레이아웃 시스템 문서화 |
| - | `38d7160` | 문서 | API 명세서 문서화 (5개 파일) |
| - | `8047c9c` | 기능 | 즐겨찾기 DB 연동 구현 |
| - | `bba91bc` | 수정 | 현재 열린 페이지에서 홈 탭 제외 |
| - | `4c902a0` | 문서 | CHANGELOG 업데이트 |
| - | `6d0a8b9` | 수정 | 접힌 사이드바에서 관리자 메뉴 표시 |
| - | `188c1f7` | 기능 | 사이드바 하단에 카피라이트 영역 추가 |
| - | `ebd82f5` | 수정 | 사이드바 스크롤 영역을 검색란 아래로 한정 |
| - | `d43cb90` | 기능 | 커스텀 스크롤바 디자인 시스템 추가 |

### 2026-01-20

| 커밋 | 영역 | 변경 내용 |
|------|------|----------|
| - | 리팩터링 | MainSidebar 컴포넌트 분리 (295줄 → 6개 파일) |
| - | 리팩터링 | DataTable 컴포넌트 분리 (454줄 → 5개 파일) |
| - | 수정 | 하드코딩 URL 수정, 인증 가드 타입 개선 |
| - | 설정 | Husky + lint-staged + Commitlint 설정 |

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

## 🗃️ 아카이브

> 30일 이상 지난 변경 이력은 아카이브로 이동합니다.

- [2026년 1월 이전](./_archive/changelog-2025.md) *(예정)*
