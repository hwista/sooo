-- =========================================================
-- PR: Project Status Detail - Master
-- PK: (project_id, status_code)
-- =========================================================
create table if not exists pr_project_status_m (
    project_id              bigint not null,
    status_code              varchar(30) not null,   -- opportunity / execution

    status_goal              text not null,          -- 간략 목표/개요(자유 텍스트)
    status_owner_user_id     bigint,                 -- 해당 status 오너(논리 FK)

    expected_start_at       date,                   -- 계약/계획 기준 예상 시작(status별)
    expected_end_at         date,                   -- 계약/계획 기준 예상 종료(status별)
    actual_start_at         date,                   -- 실제 시작(status별)
    actual_end_at           date,                   -- 실제 종료(status별)

    close_condition_group_code varchar(50),         -- 종료 조건 그룹 코드(논리 FK, optional)

    -- Common columns
    is_active               boolean not null default true,
    memo                    text,

    created_by              bigint,
    created_at              timestamptz not null default now(),
    updated_by              bigint,
    updated_at              timestamptz not null default now(),

    last_source             varchar(30),
    last_activity           text,
    transaction_id          uuid,

    constraint pk_pr_project_status_m primary key (project_id, status_code)
);

comment on table pr_project_status_m is '프로젝트 상태(opportunity/execution)별 상세 정보(2행 구조).';
comment on column pr_project_status_m.project_id is '원본 프로젝트 ID(pr_project_m.project_id).';
comment on column pr_project_status_m.status_code is 'Status 코드: opportunity / execution.';
comment on column pr_project_status_m.status_goal is 'Status 목표/개요(자유 텍스트).';
comment on column pr_project_status_m.status_owner_user_id is 'Status 오너 내부 사용자 ID(논리 FK).';
comment on column pr_project_status_m.expected_start_at is '예상 시작일(계약/계획 기준).';
comment on column pr_project_status_m.expected_end_at is '예상 종료일(계약/계획 기준).';
comment on column pr_project_status_m.actual_start_at is '실제 시작일.';
comment on column pr_project_status_m.actual_end_at is '실제 종료일.';
comment on column pr_project_status_m.close_condition_group_code is '종료 조건 그룹 코드(논리 FK, optional).';

comment on column pr_project_status_m.is_active is 'Row 실효 여부.';
comment on column pr_project_status_m.memo is '메모/설명.';
comment on column pr_project_status_m.created_by is '생성자 내부 사용자 ID(논리 FK).';
comment on column pr_project_status_m.created_at is '생성 일시.';
comment on column pr_project_status_m.updated_by is '수정자 내부 사용자 ID(논리 FK).';
comment on column pr_project_status_m.updated_at is '수정 일시.';
comment on column pr_project_status_m.last_source is '마지막 변경 출처.';
comment on column pr_project_status_m.last_activity is '마지막 CUD 이벤트 식별자.';
comment on column pr_project_status_m.transaction_id is '트랜잭션 ID(UUID).';

create index if not exists ix_pr_project_status_m_owner
    on pr_project_status_m (status_owner_user_id);

create index if not exists ix_pr_project_status_m_dates
    on pr_project_status_m (expected_start_at, expected_end_at);

create index if not exists ix_pr_project_status_m_updated_at
    on pr_project_status_m (updated_at);


-- =========================================================
-- PR: Project Status Detail - History (Snapshot)
-- PK: (project_id, status_code, history_seq)
-- =========================================================
create table if not exists pr_project_status_h (
    project_id              bigint not null,
    status_code              varchar(30) not null,
    history_seq             bigint not null,

    event_type              char(1) not null
                           check (event_type in ('C', 'U', 'D')),
    event_at                timestamptz not null,

    -- Snapshot of pr_project_status_m
    status_goal              text not null,
    status_owner_user_id     bigint,

    expected_start_at       date,
    expected_end_at         date,
    actual_start_at         date,
    actual_end_at           date,

    close_condition_group_code varchar(50),

    is_active               boolean not null,
    memo                    text,

    created_by              bigint,
    created_at              timestamptz not null,
    updated_by              bigint,
    updated_at              timestamptz not null,

    last_source             varchar(30),
    last_activity           text,
    transaction_id          uuid,

    constraint pk_pr_project_status_h primary key (project_id, status_code, history_seq)
);

comment on table pr_project_status_h is '프로젝트 status 상세 히스토리(스냅샷 누적).';
comment on column pr_project_status_h.project_id is '원본 프로젝트 ID.';
comment on column pr_project_status_h.status_code is 'Status 코드(opportunity/execution).';
comment on column pr_project_status_h.history_seq is '동일 (project_id, status_code) 내 증가 시퀀스.';
comment on column pr_project_status_h.event_type is '이벤트 타입: C/U/D.';
comment on column pr_project_status_h.event_at is '이벤트 시각(권장: 원본 updated_at과 동일).';

create index if not exists ix_pr_project_status_h_event_at
    on pr_project_status_h (event_at);

create index if not exists ix_pr_project_status_h_transaction
    on pr_project_status_h (transaction_id);
