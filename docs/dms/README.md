# DMS 문서 (모노레포 참조)

> 최종 업데이트: 2026-02-02

도큐먼트 관리 시스템(DMS) - 마크다운 기반 위키 시스템 관련 문서입니다.

---

## ⚠️ 정본 안내

DMS는 **독립 프로젝트**로, npm을 사용하며 `@ssoo/*` 패키지를 참조하지 않습니다.  
**개발 문서의 정본은 DMS 내부에 있습니다.**

### 📍 정본 위치

```
apps/web/dms/docs/development/
├── README.md
├── architecture/           ← 기술 스택, 패키지 구조
├── domain/                 ← 서비스 개요
├── design/                 ← 디자인 시스템
├── guides/                 ← Hooks, Components, API
├── planning/               ← 로드맵, 백로그, 변경이력
└── verification-report.md
```

**👉 [DMS 개발 문서 바로가기](../../apps/web/dms/docs/development/README.md)**

---

## 📁 이 폴더의 문서

이 폴더에는 **모노레포 통합 관련 문서**만 관리합니다.

### 통합 가이드

| 문서 | 설명 |
|------|------|
| [git-subtree-integration.md](architecture/git-subtree-integration.md) | GitLab DMS ↔ 모노레포 연동 방법 |
| [package-integration-plan.md](architecture/package-integration-plan.md) | 모노레포 통합 계획 |
| [wiki-integration-plan.md](architecture/wiki-integration-plan.md) | DMS 통합 전략 |

### 참조 자료 (추후 통합용)

| 문서 | 설명 |
|------|------|
| [reference/db/schema.dbml](reference/db/schema.dbml) | DB 스키마 |

---

## 🔗 빠른 링크 (DMS 내부 문서)

| 문서 | 설명 |
|------|------|
| [**AGENTS 가이드**](../../apps/web/dms/docs/development/AGENTS.md) | DMS 에이전트 학습 가이드 (필독) |
| [서비스 개요](../../apps/web/dms/docs/development/domain/service-overview.md) | 아키텍처, 데이터 흐름 |
| [기술 스택](../../apps/web/dms/docs/development/architecture/tech-stack.md) | 기술 스택 |
| [디자인 시스템](../../apps/web/dms/docs/development/design/design-system.md) | 색상, 타이포그래피 |
| [Hooks 가이드](../../apps/web/dms/docs/development/guides/hooks.md) | 커스텀 훅 |
| [Components 가이드](../../apps/web/dms/docs/development/guides/components.md) | React 컴포넌트 |
| [API 가이드](../../apps/web/dms/docs/development/guides/api.md) | API 엔드포인트 |
| [로드맵](../../apps/web/dms/docs/development/planning/roadmap.md) | 개발 로드맵 |

---

## 관련 링크

- [공통 문서](../common/) - 공용 아키텍처, 문서 관리 전략
- [PMS 문서](../pms/) - 프로젝트 관리 시스템 문서

