-- =========================================================
-- PR: Deliverable Template Group - Master
-- =========================================================
create table if not exists pr_deliverable_group_m (
    deliverable_group_id bigserial primary key,

    group_code           varchar(50) not null, -- logical key
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

    constraint ux_pr_deliverable_group_m_code unique (group_code)
);

comment on table pr_deliverable_group_m is '산출물 템플릿 그룹 마스터(방법론/유형별 산출물 세트).';
comment on column pr_deliverable_group_m.group_code is '산출물 템플릿 그룹 코드(논리 키).';
comment on column pr_deliverable_group_m.group_name is '산출물 템플릿 그룹명.';

create index if not exists ix_pr_deliverable_group_m_active
    on pr_deliverable_group_m (is_active);

create index if not exists ix_pr_deliverable_group_m_sort
    on pr_deliverable_group_m (sort_order);


-- =========================================================
-- PR: Deliverable Template Group - History (Snapshot)
-- PK: (deliverable_group_id, history_seq)
-- =========================================================
create table if not exists pr_deliverable_group_h (
    deliverable_group_id bigint not null,
    history_seq          bigint not null,

    event_type           char(1) not null check (event_type in ('C','U','D')),
    event_at             timestamptz not null,

    group_code           varchar(50) not null,
    group_name           text not null,
    description          text,
    sort_order           integer not null,

    is_active            boolean not null,
    memo                 text,

    created_by           bigint,
    created_at           timestamptz not null,
    updated_by           bigint,
    updated_at           timestamptz not null,

    last_source          varchar(30),
    last_activity        text,
    transaction_id       uuid,

    constraint pk_pr_deliverable_group_h primary key (deliverable_group_id, history_seq)
);

comment on table pr_deliverable_group_h is '산출물 템플릿 그룹 히스토리(스냅샷).';

create index if not exists ix_pr_deliverable_group_h_event_at
    on pr_deliverable_group_h (event_at);

create index if not exists ix_pr_deliverable_group_h_tx
    on pr_deliverable_group_h (transaction_id);


-- =========================================================
-- PR: Deliverable Group <-> Deliverable Relation - Master
-- PK: (group_code, deliverable_code)
-- =========================================================
create table if not exists pr_deliverable_group_item_r_m (
    group_code        varchar(50) not null,
    deliverable_code  varchar(50) not null, -- logical FK: pr_deliverable_m.deliverable_code

    sort_order        integer not null default 0,

    -- Common columns
    is_active         boolean not null default true,
    memo              text,

    created_by        bigint,
    created_at        timestamptz not null default now(),
    updated_by        bigint,
    updated_at        timestamptz not null default now(),

    last_source       varchar(30),
    last_activity     text,
    transaction_id    uuid,

    constraint pk_pr_deliverable_group_item_r_m primary key (group_code, deliverable_code)
);

comment on table pr_deliverable_group_item_r_m is '산출물 템플릿 그룹-산출물 매핑.';
comment on column pr_deliverable_group_item_r_m.group_code is '산출물 템플릿 그룹 코드(논리 FK: pr_deliverable_group_m.group_code).';
comment on column pr_deliverable_group_item_r_m.deliverable_code is '산출물 코드(논리 FK: pr_deliverable_m.deliverable_code).';

create index if not exists ix_pr_deliverable_group_item_r_m_deliverable
    on pr_deliverable_group_item_r_m (deliverable_code);

create index if not exists ix_pr_deliverable_group_item_r_m_sort
    on pr_deliverable_group_item_r_m (group_code, sort_order);


-- =========================================================
-- PR: Deliverable Group <-> Deliverable Relation - History (Snapshot)
-- PK: (group_code, deliverable_code, history_seq)
-- =========================================================
create table if not exists pr_deliverable_group_item_r_h (
    group_code        varchar(50) not null,
    deliverable_code  varchar(50) not null,
    history_seq       bigint not null,

    event_type        char(1) not null check (event_type in ('C','U','D')),
    event_at          timestamptz not null,

    sort_order        integer not null,

    is_active         boolean not null,
    memo              text,

    created_by        bigint,
    created_at        timestamptz not null,
    updated_by        bigint,
    updated_at        timestamptz not null,

    last_source       varchar(30),
    last_activity     text,
    transaction_id    uuid,

    constraint pk_pr_deliverable_group_item_r_h primary key (group_code, deliverable_code, history_seq)
);

comment on table pr_deliverable_group_item_r_h is '산출물 그룹-산출물 매핑 히스토리(스냅샷).';

create index if not exists ix_pr_deliverable_group_item_r_h_event_at
    on pr_deliverable_group_item_r_h (event_at);

create index if not exists ix_pr_deliverable_group_item_r_h_tx
    on pr_deliverable_group_item_r_h (transaction_id);
