# Action Spec — D02 산출물 업로드/교체 및 D03 산출물 제출 상태 변경

## 구현 상태

- 상태: 🔄 부분 구현
- 최종 검증일: 2026-07-09
- 현재 기준:
  - 산출물 목록 조회, 등록/수정, 제출 상태 변경, 삭제(비활성화), 이벤트 연결 화면은 구현됨
  - 제출 상태 어휘는 `not_submitted`/`submitted`/`confirmed`/`approved`/`not_required`/`rejected`를 사용함
  - `before_submit` 입력은 `not_submitted`로, `final` 입력은 `confirmed`로 정규화함
  - 종료조건과 전환 준비도는 `confirmed`/`approved`/`not_required`를 완료로 인정함
  - 파일 업로드 스토리지와 실제 파일 메타데이터 갱신은 미구현


## 1) 목적
프로젝트 산출물 파일 업로드(또는 교체)하여 storage_object_key 갱신

## 2) Actor
- 프로젝트 참여자(권한 정책 필요)

## 3) 입력
- project_id, status_code, deliverable_code
- storage_object_key, original_file_name, mime_type, file_size_bytes

## 4) DB 영향
- UPDATE pr_project_deliverable_r_m (file 메타 갱신)
- 히스토리 누적

## 5) Validation
- 해당 (project_id, status_code, deliverable_code) row 존재
- 스토리지 업로드 성공 후에만 key 기록


# Action Spec — D03 산출물 제출 상태 변경(3단계)

## 1) 목적
산출물 제출 진행을 상태로 관리
- not_submitted → submitted → confirmed
- 승인/면제 운영을 위해 approved, not_required도 완료 상태로 인정한다.

## 2) Actor
- PM/담당자(정책), confirmed는 PM 또는 AM 승인 가능 등 역할 정책 가능

## 3) 입력
- project_id, status_code, deliverable_code
- submission_status_code in {not_submitted, submitted, confirmed, approved, not_required, rejected}
- 호환 입력: before_submit, final

## 4) DB 영향
- UPDATE pr_project_deliverable_r_m.submission_status_code
- submitted_at/submitted_by는 submitted 이상에서 기록 권장
- 히스토리 누적

## 5) Validation(권장)
- submitted 이상으로 갈 때 storage_object_key 존재 여부 검증(파일 없이 제출 방지)
- confirmed/approved는 submitted 이후로만 가능
- 현재 런칭 구현은 상태 어휘 정규화와 종료조건/전환 준비도 판정을 우선 고정하며, 파일 필수 검증은 후속이다.

## Changelog

| Date | Change |
|------|--------|
| 2026-07-09 | Update deliverable status vocabulary to the current runtime contract and clarify that file upload/storage remains out of this completed scope. |
| 2026-02-09 | Add changelog section. |
