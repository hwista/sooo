---
applyTo: "packages/database/**"
---

# Codex Database Instructions

> 최종 업데이트: 2026-07-20
> 정본: `.github/instructions/database.instructions.md`

## 패키지 개요

| 항목 | 값 |
|------|-----|
| 패키지명 | `@ssoo/database` |
| 용도 | Prisma ORM 및 DB 스키마 관리 |
| DBMS | PostgreSQL 15+ |
| ORM | Prisma 6.x |

## 멀티스키마 구조

| 스키마 | 접두사 | 용도 |
|--------|--------|------|
| `common` | `cm_` | 공통 사용자 관리 (전체 공유) |
| `crm` | `crm_` | CRM 영업·계약·원가 계획 |
| `pms` | `cm_`, `pr_` | PMS 전용 (코드, 메뉴, 프로젝트) |
| `dms` | `dm_` | DMS 전용 (문서, 설정, 대화 세션) |
| `sns` | `sns_` | SNS 게시물·댓글·반응 |

## 테이블 네이밍

| 유형 | 패턴 | 예시 |
|------|------|------|
| 마스터 | `{접두사}_{도메인}_m` | `cm_user_m`, `pr_project_m` |
| 상세 | `{접두사}_{도메인}_d` | `pr_task_d` |
| 히스토리 | `{원본}_h` | `pr_project_m_h` |
| 관계 | `{테이블1}_{테이블2}_r` | `cm_user_role_r` |

## Prisma 모델 규칙

- PK: `BigInt @id @default(autoincrement())`
- 필수 감사 필드: `createdAt`, `createdById`, `updatedAt`, `updatedById`
- `@@map("테이블명")` + `@@schema("스키마명")` 필수
- 컬럼 매핑: `@map("snake_case")` 필수

## 새 테이블 추가 체크리스트

1. Prisma 마스터 모델 정의
2. 히스토리 모델 정의
3. 개발 중 임시 동기화는 `pnpm db:push`, launch 이력은 `prisma/launch-migrations/`에 반영
4. 트리거 SQL 작성 (`prisma/triggers/`)
5. `apply-triggers.ts`에 등록
6. `pnpm db:triggers`
7. 문서 업데이트
8. Changelog 추가

## 주요 명령

| 용도 | 명령어 |
|------|--------|
| 개발 스키마 동기화 | `pnpm --filter @ssoo/database db:push` |
| Launch migration 생성 | `pnpm --filter @ssoo/database db:migrate -- --name <name>` |
| Launch migration 적용 | `pnpm --filter @ssoo/database db:migrate:deploy` |
| Launch migration 상태 | `pnpm --filter @ssoo/database db:migrate:status` |
| Launch baseline 검증 | `pnpm --filter @ssoo/database db:baseline:verify` |
| Client 재생성 | `pnpm --filter @ssoo/database db:generate` |
| ERD 생성 | `pnpm --filter @ssoo/database docs:db` |

## 금지 사항

1. **스키마 경계 무시** - common 테이블을 pms 스키마에 만들기 등
2. **네이밍 규칙 무시** - 접두사 없이 테이블 생성
3. **감사 필드 누락**
4. **BigInt → Number 변환** - 정밀도 손실 위험
5. **이력 밖 직접 SQL 실행** - Prisma 비표현 제약은 검토된 launch migration SQL과 verifier로 관리

## Launch migration 규칙

- 신규 배포 이력 정본: `prisma.launch.config.ts`, `prisma/launch-migrations/`
- 기존 `prisma/migrations/`: pre-baseline volume 호환/protected patch용으로 보존
- 기존 DB baseline resolve: 백업, schema drift 0, `DB_BASELINE_RESOLVE_CONFIRM=0_launch_baseline` 명시가 모두 필요
- migration 변경 후 `pnpm db:baseline:verify`로 빈 DB migration/seed/native constraint/trigger/schema parity 확인 필수

## 검증

- 빌드: `pnpm run build:server`

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-07-20 | launch migration 정본, 비파괴 baseline resolve, 일회용 DB verifier 규칙 추가 |
| 2026-02-27 | 멀티스키마/테이블네이밍/Prisma규칙/체크리스트/명령/금지사항 추가 |
| 2026-02-22 | Codex Database 정본 신설 |
