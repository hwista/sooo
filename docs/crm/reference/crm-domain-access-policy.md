# CRM 도메인 권한·롤백 기준

> 기준일: 2026-08-19  
> 범위: 계약, 사업계획, 원가/AMS, 보고, 공급자 설정의 공용 permission 기반 제어

CRM의 `roleCode`는 사용자 화면과 프로필 호환을 위해 유지하지만 authorization 정본으로 사용하지 않는다. 실제 허용/거부는 `common.cm_permission_m`, `common.cm_role_permission_r`, 공용 access resolver와 `GET /api/crm/access/me` snapshot이 소유한다.

## 역할 기준선

| 역할 | 조회 | 등록·수정 | 확정·해제 | 사업계획 삭제 | 공급자 설정 변경 |
|---|---|---|---|---|---|
| `admin` | 허용 | 허용 | 허용 | 허용 | 허용 |
| `manager` | 허용 | 허용 | 허용 | 거부 | 거부 |
| `user` | 허용 | 허용 | 거부 | 거부 | 거부 |
| `viewer` | 허용 | 거부 | 거부 | 거부 | 거부 |

영업기회·고객 권한과 CRM 운영 권한도 같은 resolver를 사용한다. 화면은 snapshot으로 action을 비활성화하고, direct URL/API는 server guard가 같은 permission code로 다시 거부한다. 화면의 비활성만 보안 경계로 간주하지 않는다.

## 적용·검증

- `packages/database/prisma/seeds/18_crm_access_policy_foundation.sql`은 permission과 기준 역할 할당을 idempotent upsert한다. 기존 할당 행을 삭제하지 않는다.
- `pnpm run verify:crm-domain-access-runtime`은 `ssoo_crm_ralph_*` 격리 DB에서만 실행된다. 네 역할 snapshot, 실제 read/write/confirm allow·deny, Admin catalog 상태, 시드 2회 적용 전후 할당 수, AMS disposable 흐름과 residue 0을 검사한다.
- `CRM_SOURCE_SAMPLE_DATABASE_NAME=<isolated-db> pnpm run verify:crm-source-sample`은 원천 표본 count/value/identity mapping을, 같은 환경의 `pnpm run verify:crm-source-sample:reseed`는 2회 재시드 동일성을 검사한다.

## 롤백·재적용

1. 적용 전 permission 및 role assignment snapshot을 내보낸다. 최소 필드는 permission code, role code, `is_active`, memo, updated timestamp다.
2. 긴급 app rollback은 먼저 새 guard를 요구하지 않는 이전 server/web build를 배포한다. 현재 build를 유지한 채 새 permission만 비활성화하면 비관리자 업무가 차단되므로 금지한다.
3. DB 행은 삭제하지 않는다. 새 도메인 permission과 관련 role assignment를 `is_active=false`, memo에 rollback 사유와 change reference를 기록해 deprecated 상태로 둔다.
4. 기존 snapshot에 있던 사용자·조직 예외와 역할 할당을 복원하고 Admin audit에서 전후 diff를 확인한다.
5. 재적용은 현재 build와 seed를 배포한 뒤 `verify:crm-domain-access-runtime`을 다시 통과시킨다.

원천 로그인 6개와 중앙 기준 계정 8개는 동일인 계정이 아니다. 업무 표본의 담당자 FK 재현을 위한 functional alias는 [source-identity-mapping.json](./source-identity-mapping.json)에 별도 고정하며 production 계정을 생성하지 않는다.
