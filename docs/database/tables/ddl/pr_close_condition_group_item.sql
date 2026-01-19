-- =========================================================
-- PR: Close Condition Group <-> Condition Item Relation - Master
-- PK: (group_code, condition_code)
-- =========================================================
create table if not exists pr_close_condition_group_item_r_m (
    group_code      varchar(50) not null,
    condition_code  varchar(50) not null, -- logical FK to cm_code_m (PROJECT_CLOSE_CONDITION_ITEM)

    sort_order      integer not null default 0,

    -- Common columns
    is_active       boolean not null default true,
    memo            text,

    created_by      bigint,
    created_at      timestamptz not null default now(),
    updated_by      bigint,
    updated_at      timestamptz not null default now(),

    last_source     varchar(30),
    last_activity   text,
    transaction_id  uuid,

    constraint pk_pr_close_condition_group_item_r_m primary key (group_code, condition_code)
);

comment on table pr_close_condition_group_item_r_m is '종료조건 템플릿 그룹-항목 매핑.';
comment on column pr_close_condition_group_item_r_m.group_code is '종료조건 그룹 코드(논리 FK: pr_close_condition_group_m.group_code).';
comment on column pr_close_condition_group_item_r_m.condition_code is '종료조건 항목 코드(논리 FK: cm_code_m, group=PROJECT_CLOSE_CONDITION_ITEM).';

create index if not exists ix_pr_close_condition_group_item_r_m_active
    on pr_close_condition_group_item_r_m (is_active);

create index if not exists ix_pr_close_condition_group_item_r_m_condition
    on pr_close_condition_group_item_r_m (condition_code);

create index if not exists ix_pr_close_condition_group_item_r_m_sort
    on pr_close_condition_group_item_r_m (group_code, sort_order);


-- =========================================================
-- PR: Close Condition Group <-> Condition Item Relation - History (Snapshot)
-- PK: (group_code, condition_code, history_seq)
-- =========================================================
create table if not exists pr_close_condition_group_item_r_h (
    group_code      varchar(50) not null,
    condition_code  varchar(50) not null,
    history_seq     bigint not null,

    event_type      char(1) not null check (event_type in ('C','U','D')),
    event_at        timestamptz not null,

    sort_order      integer not null,

    is_active       boolean not null,
    memo            text,

    created_by      bigint,
    created_at      timestamptz not null,
    updated_by      bigint,
    updated_at      timestamptz not null,

    last_source     varchar(30),
    last_activity   text,
    transaction_id  uuid,

    constraint pk_pr_close_condition_group_item_r_h primary key (group_code, condition_code, history_seq)
);

comment on table pr_close_condition_group_item_r_h is '종료조건 그룹-항목 매핑 히스토리(스냅샷).';

create index if not exists ix_pr_close_condition_group_item_r_h_event_at
    on pr_close_condition_group_item_r_h (event_at);

create index if not exists ix_pr_close_condition_group_item_r_h_tx
    on pr_close_condition_group_item_r_h (transaction_id);
