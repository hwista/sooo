-- =========================================================
-- CM: User - Master
-- 조직 내 사람(Person) 마스터 테이블
-- 시스템 사용자 여부(is_system_user)로 로그인 가능 여부 구분
-- =========================================================
create table if not exists cm_user_m (
    user_id             bigserial primary key,

    -- System Access Control
    is_system_user      boolean not null default false,
    user_type_code      varchar(30) not null default 'internal',  -- internal / external

    -- Authentication (nullable - only for is_system_user = true)
    login_id            varchar(100),
    password_hash       text,
    password_salt       text,

    -- Profile
    user_name           varchar(100) not null,
    display_name        varchar(100),
    email               varchar(255) not null,
    phone               varchar(50),
    avatar_url          text,

    -- Organization (internal users)
    department_code     varchar(50),
    position_code       varchar(50),
    employee_number     varchar(50),

    -- Organization (external users)
    company_name        varchar(200),
    customer_id         bigint,

    -- Role & Permission (meaningful for is_system_user = true)
    role_code           varchar(30) not null default 'viewer',
    permission_codes    text[],

    -- Status
    user_status_code    varchar(30) not null default 'registered',
    last_login_at       timestamptz,
    login_fail_count    integer not null default 0,
    locked_until        timestamptz,

    -- Invitation
    invited_at          timestamptz,
    invited_by          bigint,
    invitation_token_hash text,
    invitation_expires_at timestamptz,

    -- Token (Refresh Token for JWT)
    refresh_token_hash  text,
    refresh_token_expires_at timestamptz,

    -- Common columns (audit/traceability)
    is_active           boolean not null default true,
    memo                text,

    created_by          bigint,
    created_at          timestamptz not null default now(),
    updated_by          bigint,
    updated_at          timestamptz not null default now(),

    last_source         varchar(30),
    last_activity       text,
    transaction_id      uuid
);

-- Comments
comment on table cm_user_m is '조직 내 사람(Person) 마스터. is_system_user로 시스템 사용 여부 구분. 최신 상태 1행 유지.';
comment on column cm_user_m.user_id is '사용자 PK (bigserial).';

comment on column cm_user_m.is_system_user is '시스템 로그인 가능 여부. true면 login_id/password_hash 필수.';
comment on column cm_user_m.user_type_code is '사용자 유형: internal(내부 직원) / external(외부 이해관계자).';

comment on column cm_user_m.login_id is '로그인 식별자 (이메일 또는 사번). is_system_user=true일 때 필수.';
comment on column cm_user_m.password_hash is '비밀번호 해시 (bcrypt 등). is_system_user=true이고 초대 완료 후 필수.';
comment on column cm_user_m.password_salt is '비밀번호 솔트 (bcrypt 사용 시 optional).';

comment on column cm_user_m.user_name is '사용자 실명.';
comment on column cm_user_m.display_name is '표시용 이름 (닉네임 등).';
comment on column cm_user_m.email is '이메일 주소 (알림, 비밀번호 재설정, 초대 등). 모든 사용자 필수.';
comment on column cm_user_m.phone is '연락처.';
comment on column cm_user_m.avatar_url is '프로필 이미지 URL.';

comment on column cm_user_m.department_code is '부서 코드 (논리 FK, cm_code 참조). 내부 사용자용.';
comment on column cm_user_m.position_code is '직급/직책 코드 (논리 FK, cm_code 참조).';
comment on column cm_user_m.employee_number is '사번. 내부 사용자용.';
comment on column cm_user_m.company_name is '소속 회사명. 외부 사용자용.';
comment on column cm_user_m.customer_id is '연관 고객사 ID (논리 FK). 외부 사용자용.';

comment on column cm_user_m.role_code is '역할 코드: admin/manager/user/viewer. is_system_user=true일 때 의미.';
comment on column cm_user_m.permission_codes is '추가 권한 코드 배열.';

comment on column cm_user_m.user_status_code is '사용자 상태: registered/invited/active/inactive/suspended.';
comment on column cm_user_m.last_login_at is '마지막 로그인 일시.';
comment on column cm_user_m.login_fail_count is '연속 로그인 실패 횟수 (잠금 정책용).';
comment on column cm_user_m.locked_until is '계정 잠금 해제 일시.';

comment on column cm_user_m.invited_at is '시스템 사용 초대 일시.';
comment on column cm_user_m.invited_by is '초대한 사용자 ID (논리 FK).';
comment on column cm_user_m.invitation_token_hash is '초대 토큰 해시 (이메일 링크 검증용).';
comment on column cm_user_m.invitation_expires_at is '초대 토큰 만료 일시.';

comment on column cm_user_m.refresh_token_hash is '리프레시 토큰 해시.';
comment on column cm_user_m.refresh_token_expires_at is '리프레시 토큰 만료 일시.';

comment on column cm_user_m.is_active is 'Row 실효 여부(soft delete/비활성).';
comment on column cm_user_m.memo is '메모/설명.';
comment on column cm_user_m.created_by is '생성자 내부 사용자 ID(논리 FK).';
comment on column cm_user_m.created_at is '생성 일시.';
comment on column cm_user_m.updated_by is '수정자 내부 사용자 ID(논리 FK).';
comment on column cm_user_m.updated_at is '수정 일시.';
comment on column cm_user_m.last_source is '마지막 변경 출처(UI/API/IMPORT/SYNC/BATCH).';
comment on column cm_user_m.last_activity is '마지막 CUD 이벤트 식별자(메서드/클래스/엔드포인트 등).';
comment on column cm_user_m.transaction_id is '트랜잭션 ID(UUID). 서버 로그/벌크 추적 연계.';

-- Unique Constraints
alter table cm_user_m add constraint uq_cm_user_m_email unique (email);

-- Partial unique index for login_id (only when not null)
create unique index if not exists uq_cm_user_m_login_id
    on cm_user_m (login_id) where login_id is not null;

-- Check Constraints
-- is_system_user=true이고 status가 active면 login_id와 password_hash 필수
alter table cm_user_m add constraint ck_cm_user_m_system_user_auth
    check (
        is_system_user = false
        or user_status_code = 'invited'
        or (login_id is not null and password_hash is not null)
    );

-- Indexes
create index if not exists ix_cm_user_m_is_system_user
    on cm_user_m (is_system_user);

create index if not exists ix_cm_user_m_user_type
    on cm_user_m (user_type_code);

create index if not exists ix_cm_user_m_role
    on cm_user_m (role_code);

create index if not exists ix_cm_user_m_department
    on cm_user_m (department_code);

create index if not exists ix_cm_user_m_status
    on cm_user_m (user_status_code);

create index if not exists ix_cm_user_m_employee_number
    on cm_user_m (employee_number);

create index if not exists ix_cm_user_m_customer
    on cm_user_m (customer_id);

create index if not exists ix_cm_user_m_updated_at
    on cm_user_m (updated_at);


-- =========================================================
-- CM: User - History (Snapshot)
-- PK: (user_id, history_seq)
-- =========================================================
create table if not exists cm_user_h (
    user_id             bigint not null,
    history_seq         bigint not null,
    event_type          char(1) not null,
    event_at            timestamptz not null,

    -- Snapshot of all master columns
    is_system_user      boolean not null,
    user_type_code      varchar(30) not null,

    login_id            varchar(100),
    password_hash       text,
    password_salt       text,

    user_name           varchar(100) not null,
    display_name        varchar(100),
    email               varchar(255) not null,
    phone               varchar(50),
    avatar_url          text,

    department_code     varchar(50),
    position_code       varchar(50),
    employee_number     varchar(50),
    company_name        varchar(200),
    customer_id         bigint,

    role_code           varchar(30) not null,
    permission_codes    text[],

    user_status_code    varchar(30) not null,
    last_login_at       timestamptz,
    login_fail_count    integer not null,
    locked_until        timestamptz,

    invited_at          timestamptz,
    invited_by          bigint,
    invitation_token_hash text,
    invitation_expires_at timestamptz,

    refresh_token_hash  text,
    refresh_token_expires_at timestamptz,

    is_active           boolean not null,
    memo                text,

    created_by          bigint,
    created_at          timestamptz not null,
    updated_by          bigint,
    updated_at          timestamptz not null,

    last_source         varchar(30),
    last_activity       text,
    transaction_id      uuid,

    primary key (user_id, history_seq)
);

comment on table cm_user_h is '사용자 히스토리 (스냅샷 누적).';
comment on column cm_user_h.user_id is '사용자 PK (원본 참조).';
comment on column cm_user_h.history_seq is '동일 user_id 범위 내 히스토리 시퀀스 (1부터 증가).';
comment on column cm_user_h.event_type is '이벤트 타입: C(Create)/U(Update)/D(Deactivate).';
comment on column cm_user_h.event_at is '이벤트 발생 시각 (원본 updated_at과 동일).';

-- Indexes for history table
create index if not exists ix_cm_user_h_event_at
    on cm_user_h (event_at);

create index if not exists ix_cm_user_h_event_type
    on cm_user_h (event_type);
