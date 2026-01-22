# 테이블 정의서: cm_dept_menu (부서별 메뉴 권한) - 확장용

## 1. 개요

| 항목 | 값 |
|------|-----|
| 테이블명 | `cm_dept_menu_r` (관계), `cm_dept_menu_h` (히스토리) |
| 설명 | 부서별 메뉴 접근 권한 설정. **확장용 (MVP 이후)** |
| PK | `dept_menu_id` (BIGSERIAL) |
| UK | `department_code` + `menu_id` |
| 상태 | 🔲 **설계만 완료, 미구현** |

---

## 2. 컬럼 정의

| # | 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|---|--------|------|------|--------|------|
| 1 | `dept_menu_id` | BIGSERIAL | NO | auto | PK |
| 2 | `department_code` | VARCHAR(20) | NO | - | 부서 코드 (cm_code.department 참조) |
| 3 | `menu_id` | BIGINT | NO | - | 메뉴 ID (FK → cm_menu_m) |
| 4 | `access_type` | VARCHAR(10) | NO | `full` | 접근 유형: `full`, `read`, `none` |
| - | *공통 컬럼* | - | - | - | is_active, memo, created_by, ... |

---

## 3. 권한 계산 로직 (확장 시)

```
최종 권한 = 역할 권한 (cm_role_menu_r)
           ∩ 부서 권한 (cm_dept_menu_r) -- 교집합 또는 합집합
           + 사용자 예외 GRANT
           - 사용자 예외 REVOKE
```

**확장 시 정책 결정 필요:**
- 역할과 부서 권한의 관계 (AND/OR)
- 부서 계층 지원 여부

---

## 4. MVP 제외 사유

1. 초기 운영 시 역할(role) 기반으로 충분
2. 부서 구조가 확정되지 않음
3. 복잡도 증가 대비 효용 낮음

**확장 시점:** 부서별 권한 분리 요구사항 발생 시

---

## 5. 향후 구현 시 체크리스트

- [ ] cm_code에 department 그룹 추가
- [ ] cm_dept_menu_r 테이블 생성
- [ ] cm_dept_menu_h 히스토리 테이블 + 트리거
- [ ] 권한 계산 로직에 부서 권한 추가
- [ ] 관리자 화면에 부서별 권한 설정 UI
