# 프로젝트 라이프사이클 (Project Lifecycle)

## 구현 상태

- 상태: 부분 구현
- 현재 기준:
  - 프로젝트 상태/단계, 단계별 상세, 작업/마일스톤, 산출물/종료 조건, 통제 객체, 인수인계/계약 서버 기반은 일부 구현되었습니다.
  - CRM 분리 이후 요청/제안/계약/청구/매출/원가 원장은 CRM 책임이며, PMS는 실행 프로젝트와 읽기용 인계 스냅샷을 소비합니다.


> 최종 업데이트: 2026-07-03

프로젝트의 전체 생애주기를 정의합니다.

---

## 전체 흐름

```
REQUEST (요청) → PROPOSAL (제안) → EXECUTION (실행)
                                   │
                                   ├─ 완료(종료) → 종료
                                   ├─ 운영 전환 필요 → TRANSITION (전환)
                                   └─ 다음 프로젝트 연계 → 신규 프로젝트
```

---

## 1. Request/Proposal (요청/제안) 호환 단계

요청/제안 단계는 PMS 내부의 실행 준비 또는 CRM 인계 확인을 위한 호환 단계다. CRM의 영업 기회, 견적, 계약 협상 원장을 PMS가 대체하지 않는다.

1. **내부 접수 또는 CRM 인계 확인**: `request + waiting`
2. **실행 가능성/필수 정보 검토**: `request + in_progress`
3. **범위 확인 단계 전환**: `proposal + waiting`
4. **CRM 확정 또는 내부 승인 확인**: `proposal + done`
5. **실행 인계 수령 시**: `execution + waiting` 으로 전환

계약/청구/매출/원가 값은 CRM 정본에서 확정되며 PMS에서는 읽기용 스냅샷으로만 확인한다.

---

## 2. Execution (실행) 단계

1. **PM**: 실행 전환 및 핸드오프 수령 → `execution + waiting`
2. **PM**: 프로젝트 실행 → `execution + in_progress`
3. **PM**: 실행 중 계약/청구 참고 정보가 필요하면 CRM 스냅샷을 확인
4. **PM**: 프로젝트 종료 → `execution + done`
6. **실행 종료 결과**
  - 종료: 프로젝트 종료 처리
  - 운영 전환 필요: `transition + waiting` 으로 전환
  - 다음 프로젝트 연계: 신규 프로젝트 연결
7. **(조건부) SM**: 운영 전환 프로젝트의 경우 핸드오프 수령 후 운영

---

## 3. Handoff (핸드오프)

역할 간 인계는 별도 트랙으로 관리됩니다.

| 타입 | 설명 |
|------|------|
| `PRE_TO_PM` | CRM/내부 접수 → PM (실행 인수) |
| `PRE_TO_CONTRACT_OWNER` | CRM 계약 담당자 확인용 호환 값 |
| `EXEC_TO_CONTRACT_OWNER` | 실행 중 계약 스냅샷 확인용 호환 값 |
| `EXEC_TO_SM` | 실행 → SM (운영 전환) |

---

## 4. Close (종료)

프로젝트 종료 시 검증 사항:

1. **종료조건 체크리스트** 완료 여부
2. **산출물 제출 상태** 확인 (`confirmed`/`approved`/`not_required` 완료 판정)
3. **운영 전환 여부**는 실행 종료 결과에서 결정
  - 전환 필요 → transition 단계로 이동
  - 미전환 → 프로젝트 완료

---

## 관련 문서

- [../concepts.md](../concepts.md) - 핵심 개념
- [project-close.md](project-close.md) - 종료 상세
- [project-handoff.md](project-handoff.md) - 핸드오프 상세
- [project-deliverable.md](project-deliverable.md) - 산출물 관리

## Changelog

| Date | Change |
|------|--------|
| 2026-07-03 | CRM 분리 이후 프로젝트 라이프사이클을 실행 프로젝트 중심으로 재정의하고, 요청/제안/계약/청구 원장 책임을 CRM으로 분리했다. |
| 2026-02-09 | Add changelog section. |
