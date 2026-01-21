# SSOO 기술 스택

> 최종 업데이트: 2026-01-20

---

## 개요

SSOO는 **pnpm + Turborepo** 기반 모노레포 구조로 구성되어 있습니다.

---

## 프로젝트 구조

```
hwista-ssoo/
├── apps/
│   ├── server/          # NestJS 백엔드
│   └── web/             # Next.js 프론트엔드
├── packages/
│   ├── database/        # Prisma ORM
│   └── types/           # 공유 타입
├── docs/                # 문서
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 백엔드 (apps/server)

| 기술 | 버전 | 용도 |
|------|------|------|
| **NestJS** | 10.x | 백엔드 프레임워크 |
| **TypeScript** | 5.x | 언어 |
| **Prisma** | 6.x | ORM |
| **PostgreSQL** | 15+ | 데이터베이스 |
| **JWT** | - | 인증 |
| **bcrypt** | - | 비밀번호 해싱 |
| **class-validator** | - | DTO 유효성 검사 |
| **Swagger** | - | API 문서화 |

---

## 프론트엔드 (apps/web)

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | 15.x | React 프레임워크 |
| **React** | 19.x | UI 라이브러리 |
| **TypeScript** | 5.x | 언어 |
| **Tailwind CSS** | 3.x | 스타일링 |
| **shadcn/ui** | - | UI 컴포넌트 |
| **Zustand** | 5.x | 상태 관리 |
| **TanStack Query** | 5.x | 서버 상태 관리 |
| **TanStack Table** | 8.x | 데이터 테이블 |
| **React Hook Form** | 7.x | 폼 관리 |
| **Zod** | 3.x | 스키마 유효성 검사 |
| **Axios** | 1.x | HTTP 클라이언트 |
| **Lucide React** | - | 아이콘 |

---

## 데이터베이스 (packages/database)

| 기술 | 버전 | 용도 |
|------|------|------|
| **PostgreSQL** | 15+ | RDBMS |
| **Prisma** | 6.x | ORM, 마이그레이션 |

### 히스토리 관리
- **DB 트리거**: 마스터 테이블 변경 시 히스토리 테이블에 자동 기록
- **Prisma Extension**: 추가 로직 처리

---

## 개발 도구

| 도구 | 용도 |
|------|------|
| **pnpm** | 패키지 매니저 |
| **Turborepo** | 모노레포 빌드 시스템 |
| **ESLint** | 코드 린팅 |
| **Prettier** | 코드 포맷팅 |
| **VS Code** | 에디터 |

---

## 서비스 URL (개발 환경)

| 서비스 | URL | 설명 |
|--------|-----|------|
| Frontend | http://localhost:3000 | Next.js 웹 앱 |
| Backend | http://localhost:4000 | NestJS API 서버 |
| API Docs | http://localhost:4000/api/docs | Swagger UI |

---

## 환경 변수

### 서버 (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/ssoo"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
```

### 웹 (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## 관련 문서

- [../SETUP.md](../SETUP.md) - 개발 환경 설정
- [frontend-standards.md](frontend-standards.md) - 프론트엔드 표준
- [tech-decisions.md](tech-decisions.md) - 기술 결정 사항
