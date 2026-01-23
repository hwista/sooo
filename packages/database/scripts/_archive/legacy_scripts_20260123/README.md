# Legacy Scripts Archive (2026-01-23)

이 폴더는 **SQL 기반 시드로 전환** 후 더 이상 사용하지 않는 레거시 스크립트들의 아카이브입니다.

## 아카이브 사유

| 파일 | 아카이브 사유 |
|------|--------------|
| `check-user.js` | `check-data.ts`와 기능 중복, JS → TS 전환 |
| `seed-admin.ts` | `apps/server/scripts/seed-admin.ts`에 최신 버전 존재 |
| `seed-menu.ts` | `prisma/seeds/01_cm_menu.sql`로 대체됨 |
| `seed-role-menu.ts` | `prisma/seeds/02_cm_role_menu.sql`로 대체됨 |
| `update-admin-permission.ts` | `seed-admin.ts`에 기능 통합됨 |

## 현재 유지 중인 스크립트

```
packages/database/scripts/
├── apply-triggers.ts     # 트리거 적용 (필수 유틸)
├── run-sql.ts            # SQL 파일/쿼리 실행 (범용 유틸)
├── check-data.ts         # DB 데이터 확인 (디버그용)
└── _archive/             # 레거시 스크립트
```

## 참고

- 시드 데이터는 `prisma/seeds/*.sql` 기준으로 관리
- 관리자 계정 생성: `apps/server`에서 `pnpm run seed` 실행
- 트리거 적용: `packages/database`에서 `pnpm run apply-triggers` 실행
