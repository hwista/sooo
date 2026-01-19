# 테이블 정의서: cm_user_menu (사용자별 메뉴 권한)

## 1. 개요

| 항목 | 값 |
|------|-----|
| 테이블명 | `cm_user_menu_r` (관계), `cm_user_menu_h` (히스토리) |
| 설명 | 사용자별 메뉴 접근 권한 예외 설정. 역할 권한을 오버라이드 |
| PK | `user_menu_id` (BIGSERIAL) |
| UK | `user_id` + `menu_id` |

---

## 2. 컬럼 정의

| # | 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|---|--------|------|------|--------|------|
| 1 | `user_menu_id` | BIGSERIAL | NO | auto | PK |
| 2 | `user_id` | BIGINT | NO | - | 사용자 ID (FK → cm_user_m) |
| 3 | `menu_id` | BIGINT | NO | - | 메뉴 ID (FK → cm_menu_m) |
| 4 | `access_type` | VARCHAR(10) | NO | `full` | 접근 유형: `full`, `read`, `none` |
| 5 | `override_type` | VARCHAR(10) | NO | `grant` | 오버라이드 유형: `grant`, `revoke` |
| 6 | `expires_at` | TIMESTAMP | YES | - | 권한 만료일 (임시 권한용) |
| 7 | `granted_by` | BIGINT | YES | - | 권한 부여자 ID |
| 8 | `granted_at` | TIMESTAMP | YES | - | 권한 부여일 |
| 9 | `grant_reason` | TEXT | YES | - | 권한 부여 사유 |
| - | *공통 컬럼* | - | - | - | is_active, memo, created_by, ... |

---

## 3. 오버라이드 유형 (override_type)

| 코드 | 설명 | 사용 예시 |
|------|------|----------|
| `grant` | 권한 부여 (역할에 없는 권한 추가) | PM에게 특정 프로젝트 고객사 수정 권한 부여 |
| `revoke` | 권한 회수 (역할에 있는 권한 제거) | 문제 있는 사용자의 특정 메뉴 접근 차단 |

---

## 4. 권한 계산 로직

```
최종 권한 = 역할 권한 (cm_role_menu_r) 
           + 사용자 예외 GRANT (cm_user_menu_r, override_type='grant')
           - 사용자 예외 REVOKE (cm_user_menu_r, override_type='revoke')
```

**우선순위:**
1. 사용자 예외 (가장 높음)
2. 역할 권한 (기본)

---

## 5. 사용 예시

### 5.1 PM에게 고객사 수정 권한 추가
```sql
INSERT INTO cm_user_menu_r (user_id, menu_id, access_type, override_type, grant_reason)
VALUES (123, 10, 'full', 'grant', '담당 프로젝트 고객사 정보 수정 필요');
```

### 5.2 특정 사용자 관리자 메뉴 차단
```sql
INSERT INTO cm_user_menu_r (user_id, menu_id, access_type, override_type, grant_reason)
VALUES (456, 50, 'none', 'revoke', '보안 사유로 일시 차단');
```

### 5.3 임시 권한 부여 (30일간)
```sql
INSERT INTO cm_user_menu_r (user_id, menu_id, access_type, override_type, expires_at)
VALUES (789, 20, 'full', 'grant', NOW() + INTERVAL '30 days');
```

---

## 6. 인덱스

| 인덱스명 | 컬럼 | 용도 |
|----------|------|------|
| `ux_cm_user_menu_r_user_menu` | `user_id`, `menu_id` | UK: 사용자-메뉴 조합 유일성 |
| `ix_cm_user_menu_r_user` | `user_id` | 사용자별 예외 권한 조회 |
| `ix_cm_user_menu_r_expires` | `expires_at` | 만료 권한 정리 배치 |

---

## 7. 관련 테이블

- `cm_menu_m`: 메뉴 마스터
- `cm_role_menu_r`: 역할별 기본 권한
- `cm_user_m`: 사용자 마스터
