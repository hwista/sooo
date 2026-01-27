# DMS 문서

> 최종 업데이트: 2026-01-27

도큐먼트 관리 시스템(DMS) - 마크다운 기반 위키 시스템 관련 문서를 관리합니다.

---

## 🚀 시작하기

- **[getting-started.md](../getting-started.md)** - 개발 환경 설정 가이드

---

## 📁 문서 구조

### 수동 관리 문서

| 폴더 | 설명 | 주요 내용 |
|------|------|----------|
| **[architecture/](architecture/)** | 아키텍처/개발 표준 | 기술 스택, 패키지 구조, 통합 계획 |
| **[domain/](domain/)** | 비즈니스 개념 | 서비스 개요, 핵심 기능, 워크플로우 |
| **[design/](design/)** | UI/UX 설계 | 디자인 시스템, 컴포넌트 계층 |
| **[guides/](guides/)** | 개발 가이드 | Hooks, Components, API 사용법 |
| **[planning/](planning/)** | 프로젝트 관리 | 백로그, 로드맵, 변경 이력 |

### 자동 생성 문서 (reference/)

| 문서 | 설명 | 생성 도구 |
|------|------|----------|
| **[TypeDoc](reference/typedoc/index.html)** | 코드 API 레퍼런스 | TypeDoc |

---

## 📚 핵심 문서

| 문서 | 설명 |
|------|------|
| [tech-stack.md](architecture/tech-stack.md) | DMS 기술 스택 |
| [package-spec.md](architecture/package-spec.md) | 패키지 구조 및 의존성 |
| [service-overview.md](domain/service-overview.md) | 서비스 개요 |
| [design-system.md](design/design-system.md) | 디자인 시스템 |
| [hooks.md](guides/hooks.md) | 커스텀 훅 가이드 |
| [components.md](guides/components.md) | 컴포넌트 가이드 |
| [api.md](guides/api.md) | API 엔드포인트 가이드 |

---

## 🔗 통합 관련

| 문서 | 설명 |
|------|------|
| [git-subtree-integration.md](architecture/git-subtree-integration.md) | GitLab DMS 연동 방법 |
| [package-integration-plan.md](architecture/package-integration-plan.md) | 모노레포 통합 계획 |

---

## 관련 링크

- [공통 문서](../common/) - 공용 아키텍처, 문서 관리 전략
- [PMS 문서](../pms/) - 프로젝트 관리 시스템 문서

