# DMS 기술 스택

> 최종 업데이트: 2026-01-21

---

## 개요

DMS는 **pnpm + Turborepo** 기반 모노레포 내 독립 앱으로 운영된다.

---

## 프로젝트 구조 (DMS 관점)

```
hwista-ssoo/
├── apps/
│   ├── server/          # 공용 백엔드 (추후 연동)
│   └── web-dms/         # 도큐먼트 관리 시스템
├── packages/
│   ├── database/        # Prisma ORM
│   └── types/           # 공유 타입
├── docs/                # 문서
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 프론트엔드 (apps/web-dms)

> DMS 소스 반영 후 확정한다.

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | - | React 프레임워크 |
| **React** | - | UI 라이브러리 |
| **TypeScript** | - | 언어 |

---

## 서비스 URL (개발 환경)

| 서비스 | URL | 설명 |
|--------|-----|------|
| DMS Frontend | http://localhost:3001 | 도큐먼트 관리 시스템 |

---

## 관련 문서

- [docs-structure-plan.md](docs-structure-plan.md) - DMS 문서 구조
