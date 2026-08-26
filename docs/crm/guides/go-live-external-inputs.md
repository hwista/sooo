# CRM S15 외부 입력 적용·실환경 런칭 검증 가이드

> 기준일: 2026-08-24  
> 적용 범위: `EXT-01` seller legal profile/CI, `EXT-02` production endpoint/credential, 실제 배포 뒤 CRM·Admin·DMS readiness  
> 원칙: 외부 값을 추측하거나 저장소에 커밋하지 않고, 승인 입력과 실제 runtime을 exact 비교한다.

## 1. 완료와 대기의 경계

저장소의 strict demo 45/45와 운영 성숙도 OPS-01~17 17/17은 과거 폐쇄 원장에 기록돼 있다. 현재 작업본의 strict demo 점수는 `verify:crm-current-demo`가 fresh 격리 DB/API, current build/runtime provenance, 17화면·83상태 browser evidence를 같은 worktree identity로 통과한 뒤에만 재확정한다. S15는 그 current strict gate와 별도로 실제 운영 입력이 적용된 배포를 검증한다. 다음 두 외부 입력이 없으면 verifier를 우회하거나 synthetic 값으로 녹색 처리하지 않는다.

| ID | 제공 주체 | 실제 입력 | 적용 위치 | 완료 증거 |
|---|---|---|---|---|
| `EXT-01` | 사업 책임자·법인정보 승인자 | 법인명, 대표자명, 사업자등록번호, 주소, 대표 전화·메일, 승인 CI binary | CRM `/quote-settings`; CI binary는 DMS storage adapter | 승인 packet과 live seller API/CI의 field·MIME·size·SHA-256 exact match |
| `EXT-02` | 인프라·보안·배포 책임자 | public URL, CORS, DB/SMTP/auth/DMS Git·storage credential, release SHA | 배포 호스트의 gitignored `.env.production`과 secret manager | production env gate, HTTPS runtime, release identity, CRM/DMS owner와 Admin bridge `ready`/blocker 0 |

CI 업로드의 실제 서버 계약은 5MB 이하 `image/png`, `image/jpeg`, `image/gif`, `image/webp`다. 확장자와 binary signature가 일치해야 한다. 현재 API가 수용하지 않는 SVG를 운영자가 준비하도록 안내하지 않는다.

## 2. 승인 입력 packet 준비

packet은 법인정보와 CI 파일 참조만 포함하고 password, token, API key, connection string 같은 credential을 절대 포함하지 않는다. 실제 파일은 `.runtime/` 또는 배포 조직이 승인한 비공개 작업 디렉터리에 두며 저장소에 커밋하지 않는다.

```bash
umask 077
mkdir -p .runtime/crm-go-live
pnpm run prepare:crm-go-live-input > .runtime/crm-go-live/seller-input.json
```

다음을 실제 승인값으로 바꾼다.

- `status`: 승인 전 `draft`, 승인 뒤에만 `approved`
- `deploymentId`: change ticket 또는 release ID
- `approvedAt`, `owner.businessOwner`, `owner.technicalOwner`, `owner.approvedBy`
- `sellerProfile`: 법인명·대표자·10자리 사업자등록번호·주소·대표 전화·메일, 선택 fax/website
- `ciAsset`: packet 상대 또는 절대 경로, lowercase SHA-256, MIME, byte size

CI hash와 size는 운영자가 승인한 원본 binary를 기준으로 기록한다. 입력 단계 검증은 네트워크나 production mutation을 수행하지 않는다.

```bash
pnpm run verify:crm-go-live:input -- \
  --env-file=/secure/ssoo/.env.production \
  --packet=.runtime/crm-go-live/seller-input.json
```

이 명령은 기존 `docker:production:verify-env`와 같은 fail-closed 환경 계약을 먼저 실행한 뒤 packet의 승인 상태, 필수값, placeholder/credential key 부재, CI signature/MIME/size/hash를 검사한다.

## 3. 실제 적용

1. 검증된 `.env.production`과 secret manager 값을 사용해 동일 `SSOO_RELEASE_SHA`의 server/Admin/CRM/DMS 이미지를 배포한다.
2. CRM 관리자 계정으로 `/quote-settings`에 들어가 승인 packet의 법인정보를 exact 입력한다.
3. 같은 화면에서 승인 CI binary를 업로드하고 상태가 `설정 완료`인지 확인한 뒤 저장한다.
4. `/operations`에서 seller profile, CRM dependency, data quality, operation attempt의 blocker를 해소한다.
5. DMS `/settings/operations/git`에서 storage/Git/template/runtime readiness를 `ready`로 만든다.
6. Admin dashboard에서 CRM과 DMS 두 owner snapshot이 모두 `ready`이고 blocker/degraded가 0인지 확인한다.

적용 자동화를 위해 production 법인정보를 seed나 migration에 넣지 않는다. 운영 변경은 기존 권한·감사·history가 적용되는 CRM 설정 API/UI를 통해 수행한다.

## 4. 실환경 API 준비 검증

검증용 관리자 ID/password는 packet이나 `.env.production`에 추가하지 않는다. CI/CD secret 또는 일회성 process environment로만 주입한다. 명령 출력과 evidence에는 credential을 기록하지 않으며 결과 JSON의 `credentialsStored`는 항상 `false`여야 한다.

```bash
CRM_GO_LIVE_ADMIN_LOGIN_ID="$CRM_LAUNCH_SECRET_LOGIN_ID" \
CRM_GO_LIVE_ADMIN_PASSWORD="$CRM_LAUNCH_SECRET_PASSWORD" \
pnpm run verify:crm-go-live -- \
  --env-file=/secure/ssoo/.env.production \
  --packet=.runtime/crm-go-live/seller-input.json \
  --evidence=.runtime/crm-go-live/crm-s15-api.json
```

검증기는 다음을 한 세션에서 확인하고 마지막에 logout한다.

- API health/readiness와 database `ready`
- CRM/Admin/DMS `/login`의 HTTP 200, HTML, `x-ssoo-release-sha` exact match
- 관리자 실제 로그인
- live seller profile의 승인 field exact match
- live CI의 MIME, size, SHA-256 exact match
- CRM owner readiness `ready`, blocker/degraded 0, 유효한 snapshot identity
- Admin bridge의 CRM snapshot identity exact pass-through
- Admin bridge의 DMS readiness `ready`, blocker/degraded 0
- evidence의 credential 원문 0

이 단계의 성공 상태는 `PASS_LIVE_API_READY`이며 `finalGoLive: false`, `browserRequired: true`다. API와 readiness만 통과한 상태를 최종 런칭 PASS로 부르지 않는다.

DMS TLS 인증서 잔여기간, HTTPS security header, secure session cookie와 상세 runtime check는 기존 `verify:dms-public-endpoints`도 같은 배포에서 통과해야 한다.

동시 런칭 판정에는 공개 endpoint만 따로 실행한 로그가 아니라 release artifact, production infrastructure, recovery proof, operational control proof, browser Ralph의 다섯 track을 모두 통과한 같은 release의 DMS `final-go-evidence.json`이 필요하다.

## 5. Playwright CLI 브라우저·artifact 증거

API 준비 검증 직후 24시간 안에 Playwright CLI의 서로 다른 새 session으로 desktop `1440×1000`, mobile `390×844`를 각각 실행한다. 일반 PATH에 CLI가 없으면 검증 워크스테이션의 승인된 Playwright CLI wrapper를 사용한다. 로그인 credential은 process environment로만 전달하고 snapshot·screenshot·manifest에는 기록하지 않는다.

```bash
pnpm run prepare:crm-go-live-browser-evidence -- \
  --packet=.runtime/crm-go-live/seller-input.json \
  --api-evidence=.runtime/crm-go-live/crm-s15-api.json \
  > .runtime/crm-go-live/crm-s15-browser-manifest.json

playwright-cli --session "crm-s15-${CRM_GO_LIVE_RUN_ID}-desktop" open "$CRM_GO_LIVE_CRM_URL"
playwright-cli --session "crm-s15-${CRM_GO_LIVE_RUN_ID}-desktop" resize 1440 1000
playwright-cli --session "crm-s15-${CRM_GO_LIVE_RUN_ID}-desktop" snapshot
```

각 의미 있는 이동·dialog·popup 뒤에는 새 `snapshot`을 받고 해당 ref로 조작한다. 각 필수 surface에서 snapshot과 PNG screenshot을 별도 파일로 보존하고 `console`과 `requests`를 확인한다. 인증이 끝난 뒤 trace/video가 필요할 때만 시작해 로그인 값이 artifact에 들어가지 않게 한다.

```bash
playwright-cli --session "crm-s15-${CRM_GO_LIVE_RUN_ID}-desktop" --json console \
  > .runtime/crm-go-live/desktop-console.json
playwright-cli --session "crm-s15-${CRM_GO_LIVE_RUN_ID}-desktop" --json requests \
  > .runtime/crm-go-live/desktop-requests.json
```

각 viewport의 JSON log는 별도 파일이어야 한다. 최종 verifier는 console 결과의 Errors/Warnings 0, CRM/Admin/DMS 세 production origin의 HTTPS request가 모두 관측됐는지, HTTP 4xx/5xx·request failure·CORS/refused/`net::ERR_*` 문자열이 0인지 직접 검사한다.

1. CRM `/quote-settings`에서 승인 법인정보와 CI가 표시되는지 확인한다.
2. `/`의 원천 견적 preview·print에서 법인정보와 CI가 바뀌지 않고 표시되는지 확인한다.
3. DMS 견적 DOCX/PDF lifecycle을 승인 템플릿으로 실행하고 실제 산출물의 법인정보·고객·영업기회·담당자·금액을 확인한다. CI는 CRM 설정/preview/print surface와 live CI hash에서 별도로 exact 확인한다.
4. CRM `/operations`와 Admin dashboard에서 같은 fresh CRM snapshot을 확인한다.
5. DMS settings와 Admin dashboard에서 같은 fresh DMS snapshot을 확인한다.
6. 예상 밖 4xx/5xx, console/runtime error, CORS/refused/WS error, secret leak, mobile overflow가 0인지 확인한다.

각 viewport는 `crm-quote-settings`, `crm-quote-preview`, `crm-quote-print`, `crm-operations`, `admin-readiness`, `dms-operations` 여섯 surface를 모두 포함한다. 두 session에서 같은 snapshot/screenshot 파일을 재사용하지 않는다. PNG는 run viewport와 같은 IHDR 크기여야 하므로 desktop은 1440×1000, mobile은 390×844로 저장한다. 마지막에는 각 앱에서 logout하고 CLI session의 cookie/local/session storage를 삭제한 뒤 `loggedOut`, `sessionStateDeleted`를 기록한다.

실제 산출물은 다음 세 개를 같은 manifest에 포함한다.

- `quote-print-pdf`: browser print PDF. verifier가 PDF parser로 재열어 법인명·고객·영업기회·담당자·subtotal·discount·total exact와 미해결 placeholder 0을 확인
- `dms-quote-docx`: DMS 견적 DOCX. verifier가 ZIP package와 필수 entry를 재열어 법인명·사업자등록번호·고객·영업기회·담당자·total exact와 미해결 placeholder 0을 확인
- `dms-quote-pdf`: DMS 견적 PDF. verifier가 PDF parser로 재열어 같은 법인/견적 text와 미해결 placeholder 0을 확인

template 명령은 승인 packet과 API evidence를 검증한 뒤 deployment ID, release SHA, API evidence SHA-256, 법인정보 canonical hash, CI hash와 production endpoint를 자동 바인딩한다. schema 3의 `quoteVerification`에는 production opportunity ID, 고객명, 영업기회명, 담당자명, `KRW` subtotal/discount/total을 입력한다. verifier는 `subtotal - discount = total`을 계산하고 두 viewport의 preview/print snapshot과 세 산출물에서 필요한 동일 값을 직접 찾는다. API evidence의 CRM/DMS snapshot ID·source·ready/0 blocker/0 degraded/유효시간을 검증한 뒤 CRM 운영, Admin 두 service card, DMS 운영 snapshot의 실제 문구·반복 횟수와 대조한다. 각 browser run의 request log에는 seller CI endpoint의 성공 요청이 있어야 하고 preview/print 접근성 snapshot에는 CI image가 있어야 한다. `surface.assertions`처럼 제출자가 적는 판정 boolean은 금지한다. 이 manifest와 원본 증거는 접근 통제된 비공개 runtime에 보관하고 커밋하지 않는다. 운영자는 capture·console·request log의 manifest 기준 상대 경로/hash/size, 시간, browser/context 정보만 채우고 모든 점검이 끝난 뒤에만 manifest `status`를 `PASS`로 바꾼다. 절대 경로, `..` 이탈, evidence root 밖으로 향하는 symlink, 같은 파일 재사용은 거부한다. 최종 sanitized JSON에는 quote 원문 대신 opportunity/content SHA-256과 금액 산식 검증 여부만 기록하고 법인 원문·credential을 복사하지 않는다. `status: draft`, synthetic 증거, API evidence와 다른 deployment/release, 24시간보다 오래된 capture, 필수 landmark/견적값/readiness identity/CI 요청·image 누락, viewport와 PNG 크기 불일치, console/network 실패, 오류/overflow 1건 이상, PDF/DOCX 재열기·text·binary signature/hash 불일치는 모두 실패한다.

```bash
pnpm run verify:crm-go-live:final -- \
  --env-file=/secure/ssoo/.env.production \
  --packet=.runtime/crm-go-live/seller-input.json \
  --api-evidence=.runtime/crm-go-live/crm-s15-api.json \
  --dms-evidence=/secure/ssoo/dms-go-live/<release>/<run>/final-go-evidence.json \
  --manifest=.runtime/crm-go-live/crm-s15-browser-manifest.json \
  --evidence=.runtime/crm-go-live/crm-s15-final.json
```

오직 이 명령만 `CRM-S15-FINAL-GO-LIVE`, `status: PASS`, `finalGoLive: true`를 기록한다. 최종 evidence는 API evidence, 같은 release의 DMS 5-track `status: passed`/`decision: GO`와 인접 evidence `manifest.json` 전체 file hash, browser manifest와 모든 snapshot/screenshot/PDF/DOCX의 실제 hash를 다시 계산한다. PDF/DOCX의 `contentVerified`, `reopened`, `amountsExact`, `unresolvedPlaceholderCount`는 제출자가 적는 승인 checkbox가 아니라 verifier가 binary를 재열고 text를 대조해 산출한 결과이며 credential을 저장하지 않는다.

실환경 evidence와 browser 증거가 모두 PASS한 뒤에만 `EXT-01/02`를 완료 처리하고 Goal을 `complete`로 바꾼다. 입력이 없거나 live readiness가 `degraded`, `blocked`, `unknown`이면 Goal은 active다.

## 6. 검증기 자체 확인

```bash
pnpm run verify:crm-go-live:self-test
pnpm run verify:crm-go-live:final:self-test
```

첫 self-test는 임시 PNG와 승인 packet, in-memory API/CRM/Admin/DMS transport를 만들고 positive 11 check를 실행한다. 두 번째 self-test는 desktop/mobile 12개 고유 surface snapshot/PNG와 실제로 재열리는 PDF/DOCX fixture를 검증하고 synthetic, mobile 누락, console error, CI hash 불일치, absolute/symlink 경로 이탈, viewport 크기 불일치, production origin 누락, 금액 산식 오류, artifact content 누락을 각각 fail-closed로 거부한다. 두 명령은 실제 production browser 증거를 대체하지 않는다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-08-24 | API 준비 상태를 `PASS_LIVE_API_READY`로 한정하고, Playwright CLI의 24시간 이내 fresh desktop/mobile 12 surface와 견적 PDF·DMS DOCX/PDF를 결합해야만 `CRM-S15-FINAL-GO-LIVE` PASS가 되는 최종 evidence gate 추가 |
| 2026-08-24 | EXT-01/02 승인 입력, production 적용 경계, live API/readiness 검증, fresh desktop/mobile 및 견적 PDF·DMS DOCX/PDF 인수, credential-free evidence 절차를 최초 정본화 |
