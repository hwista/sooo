# SSOO Documentation Hub

> 문서 최종 업데이트: 2026-01-20

SSOO 프로젝트의 모든 문서를 탐색할 수 있는 허브입니다.

---

## 🚀 빠른 시작

- [SETUP.md](SETUP.md) - 개발 환경 설정

---

## 📚 문서 구조

| 폴더 | 설명 | 주요 문서 |
|------|------|----------|
| [architecture/](architecture/) | 시스템 아키텍처 | tech-stack.md, auth-system.md, security-standards.md |
| [database/](database/) | 데이터베이스 설계 | tables/*.md, rules.md |
| [domain/](domain/) | 비즈니스 도메인 | concepts.md, service-overview.md, actions/, workflows/ |
| [ui-design/](ui-design/) | UI/UX 디자인 | design-system.md, page-layouts.md |
| [tests/](tests/) | 테스트 시나리오 | auth/*.md |
| [_archive/](_archive/) | 백업/이전 버전 | 리팩터링 전 원본 보관 |

---

## 📋 프로젝트 관리

| 문서 | 설명 |
|------|------|
| [ROADMAP.md](ROADMAP.md) | 제품 로드맵 (MVP 단계별 계획) |
| [BACKLOG.md](BACKLOG.md) | 백로그 (TODO 항목) |
| [CHANGELOG.md](CHANGELOG.md) | 변경 이력 |

---

## 🏗️ Architecture (아키텍처)

| 문서 | 설명 |
|------|------|
| [tech-stack.md](architecture/tech-stack.md) | 기술 스택 |
| [frontend-standards.md](architecture/frontend-standards.md) | 프론트엔드 표준 |
| [workflow-process.md](architecture/workflow-process.md) | ⭐ 작업 프로세스 가이드 |
| [tech-decisions.md](architecture/tech-decisions.md) | 기술 결정 사항 |
| [auth-system.md](architecture/auth-system.md) | 인증 시스템 |
| [security-standards.md](architecture/security-standards.md) | 보안 표준 |
| [page-routing.md](architecture/page-routing.md) | 페이지 라우팅 |

---

## 💼 Domain (비즈니스 도메인)

| 문서 | 설명 |
|------|------|
| [service-overview.md](domain/service-overview.md) | 서비스 소개 |
| [concepts.md](domain/concepts.md) | 핵심 개념 정의 |
| [menu-structure.md](domain/menu-structure.md) | 메뉴 구조 및 권한 |
| [actions/](domain/actions/) | 액션 명세 |
| [workflows/](domain/workflows/) | 워크플로우 명세 |

---

## 🗄️ Database (데이터베이스)

| 문서 | 설명 |
|------|------|
| [README.md](database/README.md) | DB 설정 가이드 |
| [rules.md](database/rules.md) | 네이밍 규칙 |
| [history-management.md](database/history-management.md) | 히스토리 관리 |
| [tables/](database/tables/) | 테이블 정의서 |

---

## 🎨 UI Design (UI 디자인)

| 문서 | 설명 |
|------|------|
| [design-system.md](ui-design/design-system.md) | 디자인 시스템 |
| [page-layouts.md](ui-design/page-layouts.md) | 페이지 레이아웃 |
| [page-security-routing.md](ui-design/page-security-routing.md) | 페이지 보안 라우팅 |

---

## 🧪 Tests (테스트)

| 문서 | 설명 |
|------|------|
| [README.md](tests/README.md) | 테스트 개요 |
| [auth/](tests/auth/) | 인증 테스트 시나리오 |

---

## 📦 Packages

| 패키지 | 문서 | 설명 |
|--------|------|------|
| @ssoo/database | [packages/database/README.md](../packages/database/README.md) | Prisma ORM |
| @ssoo/types | [packages/types/README.md](../packages/types/README.md) | 공유 타입 |
