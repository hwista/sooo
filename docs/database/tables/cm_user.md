# Table Spec — cm_user_m / cm_user_h (User)

## 1. Purpose
조직 내 사람(Person) 정보를 관리한다.  
모든 사람은 프로젝트 리소스, 이해관계자 등으로 매핑될 수 있으며,  
시스템 접근이 필요한 경우 초대를 통해 **시스템 사용자(System User)** 로 전환된다.

### 1.1 핵심 개념
```
┌─────────────────────────────────────────────────────────┐
│  "사람" (Person) - 모든 row                              │
│  - 프로젝트 리소스, 담당자, 이해관계자로 기록 가능          │
│  - 반드시 시스템에 로그인하는 건 아님                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  "시스템 사용자" (is_system_user = true)         │   │
│  │  - 실제 로그인 가능                              │   │
│  │  - 초대 → ID/PW 설정 → 권한 부여                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 사용자 유형 분류
- `user_type_code = internal`: 내부 직원 (우리 회사)
- `user_type_code = external`: 외부 이해관계자 (고객사 담당자, 협력사 등)

> 시스템 접근 권한(`is_system_user`)과 사용자 유형(`user_type_code`)은 별개 개념이다.  
> 내부 직원이라도 시스템을 사용하지 않을 수 있고,  
> 외부 담당자도 초대를 통해 제한된 권한으로 시스템을 사용할 수 있다.

---

## 2. Tables
- Master: `cm_user_m`
- History: `cm_user_h`

---

## 3. Master Table — cm_user_m

### 3.1 Primary Key
- `user_id` (bigserial)

### 3.2 Columns

#### System Access Control
- `is_system_user` (boolean, required, default false)
  - 시스템 로그인 가능 여부
- `user_type_code` (varchar(30), required, default 'internal')
  - 사용자 유형: `internal` / `external`

#### Authentication (is_system_user = true 일 때만 사용)
- `login_id` (varchar(100), **nullable**, unique when not null)
  - 로그인 식별자 (이메일 또는 사번)
  - `is_system_user = true`일 때 필수
- `password_hash` (text, **nullable**)
  - 비밀번호 해시 (bcrypt 등)
  - `is_system_user = true`일 때 필수
- `password_salt` (text, optional)
  - 비밀번호 솔트 (bcrypt 사용 시 해시에 포함되므로 optional)

#### Profile
- `user_name` (varchar(100), required)
  - 사용자 실명
- `display_name` (varchar(100), optional)
  - 표시용 이름 (닉네임 등)
- `email` (varchar(255), required)
  - 이메일 주소 (알림, 비밀번호 재설정, 초대 등)
  - 모든 사용자 필수 (초대 플로우의 기준)
- `phone` (varchar(50), optional)
  - 연락처
- `avatar_url` (text, optional)
  - 프로필 이미지 URL

#### Organization
- `department_code` (varchar(50), optional)
  - 부서 코드 (논리 FK, cm_code 참조) - 내부 사용자용
- `position_code` (varchar(50), optional)
  - 직급/직책 코드 (논리 FK, cm_code 참조)
- `employee_number` (varchar(50), optional)
  - 사번 - 내부 사용자용
- `company_name` (varchar(200), optional)
  - 소속 회사명 - 외부 사용자용
- `customer_id` (bigint, optional)
  - 연관 고객사 ID (논리 FK) - 외부 사용자용

#### Role & Permission (is_system_user = true 일 때만 의미)
- `role_code` (varchar(30), required, default 'viewer')
  - 역할 코드
  - values: `admin`, `manager`, `user`, `viewer`
- `permission_codes` (text[], optional)
  - 추가 권한 코드 배열 (세분화된 권한 필요 시)

#### Status
- `user_status_code` (varchar(30), required, default 'registered')
  - 사용자 상태
  - values: `registered`, `invited`, `active`, `inactive`, `suspended`
  - 상태 전이:
    - `registered`: 프로젝트 리소스로만 등록됨 (시스템 미사용)
    - `invited`: 시스템 사용 초대됨 (아직 가입 미완료)
    - `active`: 정상 사용 중
    - `inactive`: 일시 비활성 (휴직 등)
    - `suspended`: 정지됨 (보안 이슈 등)
- `last_login_at` (timestamptz, optional)
  - 마지막 로그인 일시
- `login_fail_count` (integer, default 0)
  - 연속 로그인 실패 횟수 (잠금 정책용)
- `locked_until` (timestamptz, optional)
  - 계정 잠금 해제 일시

#### Invitation
- `invited_at` (timestamptz, optional)
  - 시스템 사용 초대 일시
- `invited_by` (bigint, optional)
  - 초대한 사용자 ID (논리 FK)
- `invitation_token_hash` (text, optional)
  - 초대 토큰 해시 (이메일 링크 검증용)
- `invitation_expires_at` (timestamptz, optional)
  - 초대 토큰 만료 일시

#### Token (Refresh Token for JWT)
- `refresh_token_hash` (text, optional)
  - 리프레시 토큰 해시
- `refresh_token_expires_at` (timestamptz, optional)
  - 리프레시 토큰 만료 일시

#### Common Columns (from database/rules.md)
- `is_active` (boolean, required)
- `memo` (text)
- `created_by` (bigint)
- `created_at` (timestamptz)
- `updated_by` (bigint)
- `updated_at` (timestamptz)
- `last_source` (varchar(30))
- `last_activity` (text)
- `transaction_id` (uuid)

---

## 4. History Table — cm_user_h

### 4.1 Primary Key
- composite PK: `(user_id, history_seq)`

### 4.2 History Columns (additional)
- `history_seq` (bigint, required)
  - 동일 user_id 범위 내 1부터 증가
- `event_type` (char(1), required)
  - values: `C`, `U`, `D`
- `event_at` (timestamptz, required)
  - 권장 규칙: 원본 row의 `updated_at`과 동일 값으로 기록

### 4.3 Snapshot Rule
- `cm_user_m`의 모든 컬럼을 **동일 명칭으로 그대로 복사**하여 저장한다.
- **주의**: `password_hash`, `refresh_token_hash` 등 민감 정보도 히스토리에 포함됨
  - 필요 시 마스킹 정책 적용 고려

---

## 5. Constraints / Validation Rules (Logical)

### 5.1 시스템 사용자 관련 제약
- `is_system_user = true`일 때:
  - `login_id` NOT NULL (유일해야 함)
  - `password_hash` NOT NULL (초대 완료 후)
  - `user_status_code` IN (`invited`, `active`, `inactive`, `suspended`)
- `is_system_user = false`일 때:
  - `login_id`, `password_hash`는 NULL
  - `user_status_code = registered`

### 5.2 초대 플로우 관련 제약
- `user_status_code = invited`일 때:
  - `invited_at` NOT NULL
  - `invited_by` NOT NULL
  - `invitation_token_hash` NOT NULL
  - `password_hash`는 NULL (아직 설정 전)

### 5.3 일반 제약
- `email`은 시스템 전체에서 유일해야 한다.
- `login_id`가 NOT NULL인 경우 시스템 전체에서 유일해야 한다.
- `password_hash`는 평문 저장 금지, bcrypt/argon2 등 사용 필수.
- `login_fail_count`가 임계값(예: 5회) 초과 시 `locked_until` 설정.
- 물리 삭제 대신 `is_active=false`로 비활성화하고, 히스토리에 `event_type=D`로 기록한다.
- `user_status_code=inactive`와 `is_active=false`는 다른 의미:
  - `inactive`: 사용자가 일시적으로 비활성 (휴직 등)
  - `is_active=false`: 논리적 삭제 (퇴사 등)

---

## 6. Indexing (initial)
- `email` (unique)
- `login_id` (unique, partial: WHERE login_id IS NOT NULL)
- `is_system_user`
- `user_type_code`
- `role_code`
- `department_code`
- `user_status_code`
- `employee_number`
- `customer_id`
- `updated_at`

---

## 7. Security Considerations
- **비밀번호 해시**: bcrypt (cost factor 12+) 또는 argon2id 권장
- **리프레시 토큰**: 해시로만 저장, 원본은 클라이언트에게만 전달
- **초대 토큰**: 해시로만 저장, 24-72시간 만료 권장
- **히스토리 접근**: 민감 정보 포함으로 접근 권한 제한 필요
- **로그인 실패 추적**: Brute-force 방지용 `login_fail_count` 활용

---

## 8. Seed Data (Initial)
시스템 관리자 계정 1개 필요:
```sql
INSERT INTO cm_user_m (
  is_system_user, user_type_code, login_id, password_hash,
  user_name, email, role_code, user_status_code
) VALUES (
  true, 'internal', 'admin', '<bcrypt_hash>',
  '시스템관리자', 'admin@company.com', 'admin', 'active'
);
```
초기 비밀번호는 환경변수 또는 배포 시 설정.

---

## 9. Related Workflows
- [사용자 초대 플로우](../../service/actions/user_invitation.md)
- [사용자 로그인](../../service/actions/user_login.md)
