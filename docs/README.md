# 📚 HWISTA-SSOO Documentation Hub

> 프로젝트 전체 문서 허브 - PMS(Project Management System)와 DMS(Document Management System)를 위한 통합 문서 저장소

## 📖 문서 구조

```
docs/
├── common/              # 🔗 공용 문서 (PMS/DMS 공통)
│   ├── architecture/    # 공통 아키텍처 및 표준
│   └── guides/          # 공통 가이드
├── pms/                 # 📋 PMS 문서
│   ├── architecture/    # PMS 아키텍처
│   ├── api/             # REST API 명세
│   ├── database/        # 데이터베이스 설계
│   ├── domain/          # 도메인 모델링
│   ├── guides/          # 개발 가이드
│   ├── planning/        # 기획 및 로드맵
│   ├── reference/       # 자동 생성 문서
│   ├── tests/           # 테스트 문서
│   └── ui-design/       # UI/UX 설계
└── dms/                 # 📄 DMS 문서
    ├── architecture/    # DMS 아키텍처
    └── common/          # DMS 일반 문서
```

## 🔗 문서 바로가기

### 공용 문서 (Common)

| 문서 | 설명 |
|------|------|
| [공용 README](./common/README.md) | 공용 문서 인덱스 |
| [**AGENTS 가이드**](./common/AGENTS.md) | 모노레포 에이전트 학습 가이드 |
| [리팩토링 표준](./common/architecture/refactoring-audit-prompt.md) | 리팩토링 감사 기준 |
| [공통 기술 스택](./common/architecture/tech-stack.md) | 백엔드, 데이터베이스, 공통 도구 |
| [개발 표준](./common/architecture/development-standards.md) | 코딩 규칙 및 표준 |
| [보안 표준](./common/architecture/security-standards.md) | 보안 정책 |
| [워크플로우](./common/architecture/workflow-process.md) | 개발 프로세스 |

### PMS (Project Management System)

| 문서 | 설명 |
|------|------|
| [PMS README](./pms/README.md) | PMS 문서 인덱스 |
| [PMS 기술 스택](./pms/architecture/tech-stack.md) | PMS 프론트엔드 기술 |
| [개발 환경 설정](./getting-started.md) | 개발 환경 설정 가이드 |
| [변경 이력](./pms/planning/changelog.md) | 최신 변경사항 |
| [백로그](./pms/planning/backlog.md) | 작업 현황 |

### DMS (Document Management System)

> ⚠️ **DMS 정본 문서는 `apps/web/dms/docs/development/`에 있습니다.**  
> DMS는 독립 프로젝트로, npm을 사용하며 `@ssoo/*` 패키지를 참조하지 않습니다.

| 문서 | 설명 |
|------|------|
| [DMS AGENTS](../apps/web/dms/docs/development/AGENTS.md) | DMS 에이전트 가이드 (정본) |
| [DMS 기술 스택](../apps/web/dms/docs/development/architecture/tech-stack.md) | DMS 기술 스택 |
| [DMS 패키지 명세](../apps/web/dms/docs/development/architecture/package-spec.md) | DMS 패키지 구조 |

## 📋 문서 카테고리 설명

### 🔗 Common (공용)

PMS와 DMS에서 공통으로 적용되는 문서들:

- **architecture/**: 개발 표준, 보안 정책, 백엔드 아키텍처, 패키지 명세
- **guides/**: API 사용법, 데이터베이스 가이드, 코딩 규칙

### 📋 PMS (프로젝트 관리)

- **architecture/**: PMS 전용 프론트엔드 아키텍처 및 설계
- **api/**: REST API 명세 (auth, user, menu, project 등)
- **database/**: 데이터베이스 테이블 설계 및 관계
- **domain/**: 비즈니스 도메인 모델링
- **guides/**: PMS 개발 가이드
- **planning/**: 백로그, 로드맵, 변경 이력
- **reference/**: TypeDoc, Storybook 등 자동 생성 문서
- **tests/**: 테스트 전략 및 문서
- **ui-design/**: UI 컴포넌트 및 페이지 설계

### 📄 DMS (문서 관리)

- **architecture/**: DMS 기술 스택 및 아키텍처
- **common/**: 일반 문서 및 변경 이력

## 🔄 문서 관리

### 자동 생성 문서

프로젝트에서 자동으로 생성되는 문서들:

| 유형 | 위치 | 생성 도구 |
|------|------|-----------|
| Common ERD | `common/reference/db/` | Prisma DBML |
| Common TypeDoc | `common/reference/typedoc/` | TypeDoc |
| Common API | `common/reference/api/` | OpenAPI |
| PMS ERD | `pms/reference/db/` | Prisma DBML |
| PMS TypeDoc | `pms/reference/typedoc/` | TypeDoc |
| PMS API | `pms/reference/api/` | Swagger/OpenAPI |
| PMS Storybook | `pms/reference/storybook/` | Storybook |
| DMS ERD | `dms/reference/db/` | Prisma DBML |

### 문서 작성 규칙

1. **언어**: 한국어 기본 (코드/기술 용어는 영문 유지)
2. **파일명**: kebab-case 사용 (예: `auth-system.md`)
3. **링크**: 상대 경로 사용, 공용 문서 참조 시 `../common/` 경로
4. **구조**: 각 카테고리의 README.md에서 하위 문서 인덱싱

## 🚀 빠른 시작

1. **신규 개발자**: [개발 환경 설정](./getting-started.md) → [개발 표준](./common/architecture/development-standards.md)
2. **API 개발**: [API 가이드](./common/guides/api-guide.md) → [API 명세](./pms/api/README.md)
3. **데이터베이스 작업**: [DB 가이드](./common/guides/database-guide.md) → [DB 규칙](./common/guides/rules.md)
4. **프론트엔드 개발**: [PMS 기술 스택](./pms/architecture/tech-stack.md) → [UI 설계](./pms/design/README.md)
