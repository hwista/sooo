-- =========================================================
-- PR: Project Close Condition Relation - Master
-- PK: (project_id, status_code, condition_code)
-- =========================================================
create table if not exists pr_project_close_condition_r_m (
    project_id          bigint not null,
    status_code         varchar(30) not null,      -- request / proposal / execution / transition
    condition_code      varchar(50) not null,      -- close condition item code (logical FK)

    requires_deliverable boolean not null default false,
    is_checked          boolean not null default false,
    checked_at          timestamptz,
    checked_by          bigint,                    -- logical FK (internal user)

    sort_order          integer not null default 0,

    -- Common columns
    is_active           boolean not null default true,
    memo                text,

    created_by          bigint,
    created_at          timestamptz not null default now(),
    updated_by          bigint,
    updated_at          timestamptz not null default now(),

    last_source         varchar(30),
    last_activity       text,
    transaction_id      uuid,

    constraint pk_pr_project_close_condition_r_m
        primary key (project_id, status_code, condition_code)
);

comment on table pr_project_close_condition_r_m is '프로젝트/상태별 종료 조건 항목 매핑(1:N).';
comment on column pr_project_close_condition_r_m.project_id is '원본 프로젝트 ID.';
comment on column pr_project_close_condition_r_m.status_code is '상태 코드(request/proposal/execution/transition).';
comment on column pr_project_close_condition_r_m.condition_code is '종료 조건 항목 코드(논리 FK).';
comment on column pr_project_close_condition_r_m.requires_deliverable is '산출물 필수 여부.';
comment on column pr_project_close_condition_r_m.is_checked is '종료 조건 충족 여부.';
comment on column pr_project_close_condition_r_m.checked_at is '충족 처리 시각.';
comment on column pr_project_close_condition_r_m.checked_by is '충족 처리자 내부 사용자 ID(논리 FK).';
comment on column pr_project_close_condition_r_m.sort_order is '항목 정렬 순서(낮을수록 우선).';

create index if not exists ix_pr_project_close_condition_r_m_checked
    on pr_project_close_condition_r_m (project_id, status_code, is_checked);

create index if not exists ix_pr_project_close_condition_r_m_condition
    on pr_project_close_condition_r_m (condition_code);

create index if not exists ix_pr_project_close_condition_r_m_updated_at
    on pr_project_close_condition_r_m (updated_at);


-- =========================================================
-- PR: Project Close Condition Relation - History (Snapshot)
-- PK: (project_id, status_code, condition_code, history_seq)
-- =========================================================
create table if not exists pr_project_close_condition_r_h (
    project_id          bigint not null,
    status_code         varchar(30) not null,
    condition_code      varchar(50) not null,
    history_seq         bigint not null,

    event_type          char(1) not null
                       check (event_type in ('C', 'U', 'D')),
    event_at            timestamptz not null,

    -- Snapshot of pr_project_close_condition_r_m
    requires_deliverable boolean not null,
    is_checked          boolean not null,
    checked_at          timestamptz,
    checked_by          bigint,

    sort_order          integer not null,

    is_active           boolean not null,
    memo                text,

    created_by          bigint,
    created_at          timestamptz not null,
    updated_by          bigint,
    updated_at          timestamptz not null,

    last_source         varchar(30),
    last_activity       text,
    transaction_id      uuid,

    constraint pk_pr_project_close_condition_r_h
        primary key (project_id, status_code, condition_code, history_seq)
);

comment on table pr_project_close_condition_r_h is '프로젝트/상태별 종료 조건 매핑 히스토리(스냅샷 누적).';
comment on column pr_project_close_condition_r_h.history_seq is '동일 (project_id, status_code, condition_code) 내 증가 시퀀스.';
comment on column pr_project_close_condition_r_h.event_type is '이벤트 타입: C/U/D.';
comment on column pr_project_close_condition_r_h.event_at is '이벤트 시각(권장: 원본 updated_at과 동일).';

create index if not exists ix_pr_project_close_condition_r_h_event_at
    on pr_project_close_condition_r_h (event_at);

create index if not exists ix_pr_project_close_condition_r_h_transaction
    on pr_project_close_condition_r_h (transaction_id);


-- =========================================================
-- ALTER: pr_project_close_condition_r_m / pr_project_close_condition_r_h
-- add requires_deliverable
-- =========================================================
alter table if exists pr_project_close_condition_r_m
    add column if not exists requires_deliverable boolean not null default false;

comment on column pr_project_close_condition_r_m.requires_deliverable
    is '해당 종료조건 체크 시 산출물 제출이 필수인지 여부(true면 산출물 제출 완료 후에만 is_checked 허용).';

-- history에도 동일 컬럼 추가(스냅샷 보존)
alter table if exists pr_project_close_condition_r_h
    add column if not exists requires_deliverable boolean;

comment on column pr_project_close_condition_r_h.requires_deliverable
    is '스냅샷: 종료조건의 산출물 제출 필요 여부.';
