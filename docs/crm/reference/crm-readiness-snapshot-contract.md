# CRM·DMS·Admin 런칭 readiness snapshot 계약

> 기준일: 2026-08-19  
> 범위: CRM owner `/api/crm/operations/launch-readiness`, DMS owner `/api/dms/settings/readiness`, Admin bridge `/api/launch-readiness`

## 목적

CRM과 DMS owner 화면, Admin 런칭 요약이 서로 다른 시점의 숫자를 같은 상태처럼 표시하지 않도록 하나의 snapshot identity와 실패 의미를 공유한다. Admin은 owner 결과를 다시 계산하지 않으며, probe 실패나 만료를 `ready` 또는 `0/0`으로 축소하지 않는다.

## 공용 응답 계약

`LaunchReadinessSnapshot`은 다음 필드를 가진다.

| 필드 | 계약 |
|---|---|
| `owner` | `crm` 또는 `dms` |
| `snapshotId` | owner가 새 live probe마다 생성한 고유 ID. upstream 연결 불가처럼 owner snapshot이 없을 때만 `null` |
| `checkedAt` / `expiresAt` | probe 기준 시각과 만료 시각. owner snapshot이 없을 때만 `null` |
| `refreshWindowSeconds` | 동일 owner에서 재사용하는 coalescing/cache window. 현재 5초 |
| `source` | CRM/DMS owner live probe 또는 Admin의 명시적 `unavailable`/`stale` 판정 |
| `status` | `ready`, `degraded`, `blocked`, `unknown` |
| `reason` | operator가 owner 화면에서 원인을 확인하거나 다시 조회할 수 있는 설명 |
| `blockerCount` / `degradedCount` / `totalCount` | 정상 판정은 실제 집계값, `unknown`은 모두 `null` |
| `ownerHref` | CRM `/operations`, DMS `/settings/operations/git` |

## 생성·cache·만료

- CRM과 DMS owner는 5초 안의 동시 조회를 같은 in-flight 또는 cached snapshot으로 합친다.
- snapshot 유효 시간은 `checkedAt`부터 30초다. owner UI와 Admin UI는 이 시간이 지나면 기존 숫자를 숨기고 `unknown`/`확인 불가`로 표시한다.
- CRM 구성 probe와 DMS Git probe는 10초 안에 끝나지 않으면 `unknown`이 된다. Admin upstream 호출은 12초 후 연결 불가로 판정한다.
- CRM은 dependency readiness, data quality, operation attempt를 하나의 owner snapshot으로 집계한다. DMS는 DB, 설정 영속성, Git, control-plane, runtime path probe를 하나의 owner snapshot으로 집계한다.

## 무효화와 복구

- CRM 설정 저장과 operation attempt 재시도는 CRM readiness cache를 무효화한다.
- DMS system 설정 저장은 DMS runtime readiness cache를 무효화한다.
- 무효화 다음 조회는 새 `snapshotId`와 `checkedAt`을 생성한다.
- probe 실패, malformed response, upstream 연결 실패, snapshot 만료는 모두 `unknown`이며 count는 `null`이다. 사용자가 새로고침해 owner probe가 회복되면 새 live snapshot으로 복구한다.

## Admin bridge 규칙

- Admin은 CRM `/crm/operations/launch-readiness`와 DMS `/dms/settings/readiness`만 조회한다.
- fresh owner 응답은 `snapshotId`, 시각, source, status, reason, count, owner route를 변경하지 않고 전달한다.
- owner identity가 없거나 count 계약이 잘못되면 `admin.bridge.unavailable`, 만료됐으면 `admin.bridge.stale`로 표시한다.
- 두 경우 모두 `status=unknown`, count는 `null`이다. owner 앱과 Admin의 같은 refresh window 응답은 위 필드가 exact match해야 한다.

## 검증과 rollback

- `pnpm run verify:crm-readiness-consistency`는 CRM/DMS owner API, CRM/DMS owner web proxy, Admin bridge의 snapshot 필드를 exact compare하고 stale/malformed fallback을 검사한다.
- `CRM_READINESS_UNAVAILABLE_ADMIN_URL`을 실제 upstream 단절 Admin instance로 지정하면 연결 실패가 `unknown/null`인지 추가로 검사한다.
- CRM/DMS cache unit test는 in-flight coalescing, 재사용, 명시적 invalidation, probe failure를 검증한다.
- rollback 시 공용 필드와 `unknown/null` 의미는 유지한다. cache 최적화만 제거할 수 있으며, Admin에서 owner 값을 다시 계산하거나 실패를 `0/0`으로 바꾸는 과거 방식으로 되돌리지 않는다.

