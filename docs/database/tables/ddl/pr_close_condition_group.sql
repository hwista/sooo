-- =========================================================
-- PR: Close Condition Group - Master
-- =========================================================
create table if not exists pr_close_condition_group_m (
    close_condition_group_id bigserial primary key,

    group_code           varchar(50) not null,   -- logical key
    group_name           text not null,
    description          text,
    sort_order           integer not null default 0,

    -- Common columns
    is_active            boolean not null default true,
    memo                 text,

    created_by           bigint,
    created_at           timestamptz not null default now(),
    updated_by           bigint,
    updated_at           timestamptz not null default now(),

    last_source          varchar(30),
    last_activity        text,
    transaction_id       uuid,

    constraint ux_pr_close_condition_group_m_group_code unique (group_code)
);

comment on table pr_close_condition_group_m is '종료조건 템플릿 그룹 마스터.';
comment on column pr_close_condition_group_m.group_code is '종료조건 그룹 코드(논리 키).';
comment on column pr_close_condition_group_m.group_name is '종료조건 그룹명.';
comment on column pr_close_condition_group_m.description is '종료조건 그룹 설명.';
comment on column pr_close_condition_group_m.sort_order is '정렬 순서.';

create index if not exists ix_pr_close_condition_group_m_active
    on pr_close_condition_group_m (is_active);

create index if not exists ix_pr_close_condition_group_m_sort
    on pr_close_condition_group_m (sort_order);


-- =========================================================
-- PR: Close Condition Group - History (Snapshot)
-- PK: (close_condition_group_id, history_seq)
-- =========================================================
create table if not exists pr_close_condition_group_h (
    close_condition_group_id bigint not null,
    history_seq              bigint not null,

    event_type               char(1) not null check (event_type in ('C','U','D')),
    event_at                 timestamptz not null,

    group_code               varchar(50) not null,
    group_name               text not null,
    description              text,
    sort_order               integer not null,

    is_active                boolean not null,
    memo                     text,

    created_by               bigint,
    created_at               timestamptz not null,
    updated_by               bigint,
    updated_at               timestamptz not null,

    last_source              varchar(30),
    last_activity            text,
    transaction_id           uuid,

    constraint pk_pr_close_condition_group_h primary key (close_condition_group_id, history_seq)
);

comment on table pr_close_condition_group_h is '종료조건 그룹 히스토리(스냅샷).';

create index if not exists ix_pr_close_condition_group_h_event_at
    on pr_close_condition_group_h (event_at);

create index if not exists ix_pr_close_condition_group_h_tx
    on pr_close_condition_group_h (transaction_id);