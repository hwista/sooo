-- =========================================================
-- PR: Deliverable Master
-- =========================================================
create table if not exists pr_deliverable_m (
    deliverable_id     bigserial primary key,

    deliverable_code   varchar(50) not null, -- logical key
    deliverable_name   text not null,
    description        text,
    sort_order         integer not null default 0,

    -- Common columns
    is_active          boolean not null default true,
    memo               text,

    created_by         bigint,
    created_at         timestamptz not null default now(),
    updated_by         bigint,
    updated_at         timestamptz not null default now(),

    last_source        varchar(30),
    last_activity      text,
    transaction_id     uuid,

    constraint ux_pr_deliverable_m_code unique (deliverable_code)
);

comment on table pr_deliverable_m is '표준 산출물 마스터(프로젝트 관리론/방법론 기준 산출물 사전).';
comment on column pr_deliverable_m.deliverable_code is '산출물 코드(논리 키).';
comment on column pr_deliverable_m.deliverable_name is '산출물 명.';
comment on column pr_deliverable_m.description is '산출물 설명.';
comment on column pr_deliverable_m.sort_order is '정렬 순서.';

create index if not exists ix_pr_deliverable_m_active
    on pr_deliverable_m (is_active);

create index if not exists ix_pr_deliverable_m_sort
    on pr_deliverable_m (sort_order);


-- =========================================================
-- PR: Deliverable History (Snapshot)
-- PK: (deliverable_id, history_seq)
-- =========================================================
create table if not exists pr_deliverable_h (
    deliverable_id     bigint not null,
    history_seq        bigint not null,

    event_type         char(1) not null check (event_type in ('C','U','D')),
    event_at           timestamptz not null,

    deliverable_code   varchar(50) not null,
    deliverable_name   text not null,
    description        text,
    sort_order         integer not null,

    is_active          boolean not null,
    memo               text,

    created_by         bigint,
    created_at         timestamptz not null,
    updated_by         bigint,
    updated_at         timestamptz not null,

    last_source        varchar(30),
    last_activity      text,
    transaction_id     uuid,

    constraint pk_pr_deliverable_h primary key (deliverable_id, history_seq)
);

comment on table pr_deliverable_h is '산출물 마스터 히스토리(스냅샷).';

create index if not exists ix_pr_deliverable_h_event_at
    on pr_deliverable_h (event_at);

create index if not exists ix_pr_deliverable_h_tx
    on pr_deliverable_h (transaction_id);
