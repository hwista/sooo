````mdc
# 공용 문서 (Common)

> 최종 업데이트: 2026-01-27

PMS와 DMS 모두에 공통 적용되는 개발 표준, 가이드, 아키텍처 문서입니다.

---

## 📁 문서 구조

### architecture/ - 아키텍처 & 개발 표준

| 문서 | 설명 |
|------|------|
| [tech-stack.md](architecture/tech-stack.md) | 공용 기술 스택 (백엔드, DB, 개발도구) |
| [development-standards.md](architecture/development-standards.md) | 개발 표준 (계층 구조, SRP, 컴포넌트 설계) |
| [security-standards.md](architecture/security-standards.md) | 보안 표준 (인증, 인가, 데이터 보호) |
| [auth-system.md](architecture/auth-system.md) | 인증 시스템 (JWT, 토큰 갱신, 보안 정책) |
| [workflow-process.md](architecture/workflow-process.md) | 개발 작업 프로세스 (코드→문서→커밋) |
| [docs-management.md](architecture/docs-management.md) | 문서 관리 전략 (자동/수동 구분) |
| [docs-structure-plan.md](architecture/docs-structure-plan.md) | 문서 구조 계획 |
| [refactoring-audit-prompt.md](architecture/refactoring-audit-prompt.md) | 리팩토링 감사 프롬프트 |
| [modular-monolith.md](architecture/modular-monolith.md) | 모듈러 모놀리스 아키텍처 (백엔드) |
| [server-package-spec.md](architecture/server-package-spec.md) | Server 패키지 명세 |
| [database-package-spec.md](architecture/database-package-spec.md) | Database 패키지 명세 |
| [types-package-spec.md](architecture/types-package-spec.md) | Types 패키지 명세 |

### guides/ - 사용 가이드

| 문서 | 설명 |
|------|------|
| [api-guide.md](guides/api-guide.md) | REST API 사용 가이드 |
| [database-guide.md](guides/database-guide.md) | 데이터베이스 사용 가이드 |
| [rules.md](guides/rules.md) | 데이터베이스 설계 규칙 |
| [bigint-guide.md](guides/bigint-guide.md) | BigInt 처리 가이드 |

### reference/ - 자동 생성 문서

| 폴더 | 설명 | 생성 도구 |
|------|------|----------|
| api/ | REST API 명세 | OpenAPI/Redoc |
| db/ | ERD, DBML | Prisma DBML |
| typedoc/ | 코드 API 레퍼런스 | TypeDoc |

---

## 시스템별 문서

- [PMS 문서](../pms/README.md) - 프로젝트 관리 시스템
- [DMS 문서](../dms/README.md) - 도큐먼트 관리 시스템

````