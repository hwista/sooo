# DMS 기술 스택

> 최종 업데이트: 2026-01-27

---

## 개요

DMS는 모노레포 내 독립 앱으로 운영되며, **npm**을 사용한다 (pnpm workspace에서 제외).

---

## 프로젝트 구조 (DMS 관점)

```
hwista-ssoo/
├── apps/
│   ├── server/          # 공용 백엔드 (추후 연동)
│   ├── web-pms/         # 프로젝트 관리 시스템 (pnpm)
│   └── web-dms/         # 도큐먼트 관리 시스템 (npm, 독립)
├── packages/
│   ├── database/        # Prisma ORM
│   └── types/           # 공유 타입
├── docs/                # 문서
├── pnpm-workspace.yaml  # DMS 제외
├── turbo.json
└── package.json
```

---

## 프론트엔드 (apps/web-dms)

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | ^15.1.0 | React 프레임워크 |
| **React** | 19.2.0 | UI 라이브러리 |
| **TypeScript** | ^5 | 언어 |
| **tailwind-merge** | ^2.6.0 | 클래스 병합 |

---

## 서비스 URL (개발 환경)

| 서비스 | URL | 설명 |
|--------|-----|------|
| DMS Frontend | http://localhost:3001 | 도큐먼트 관리 시스템 |

---

## 관련 문서

- [docs-structure-plan.md](docs-structure-plan.md) - DMS 문서 구조
