-- =========================================================
-- PR: Project-Status-Deliverable Relation - Master
-- PK: (project_id, status_code, deliverable_code)
-- =========================================================
create table if not exists pr_project_deliverable_r_m (
    project_id             bigint not null,
    status_code            varchar(30) not null,  -- opportunity / execution (프로젝트 status와 동일 값)
    deliverable_code       varchar(50) not null,  -- logical FK: pr_deliverable_m.deliverable_code

    submission_status_code varchar(30) not null,  -- logical FK: cm_code_m (PROJECT_DELIVERABLE_SUBMISSION_STATUS)
    submitted_at           timestamptz,
    submitted_by           bigint,                -- internal user (logical FK)

    -- file reference (권장: path 대신 storage key)
    storage_object_key     text,                  -- 업로드 파일 식별 키(S3 key 등)
    original_file_name     text,
    mime_type              varchar(100),
    file_size_bytes        bigint,

    -- Common columns
    is_active              boolean not null default true,
    memo                   text,

    created_by             bigint,
    created_at             timestamptz not null default now(),
    updated_by             bigint,
    updated_at             timestamptz not null default now(),

    last_source            varchar(30),
    last_activity          text,
    transaction_id         uuid,

    constraint pk_pr_project_deliverable_r_m primary key (project_id, status_code, deliverable_code)
);

comment on table pr_project_deliverable_r_m is '프로젝트-스테이터스별 산출물 관리(상태/업로드 키/메타).';
comment on column pr_project_deliverable_r_m.status_code is '프로젝트 상태 코드(opportunity/execution).';
comment on column pr_project_deliverable_r_m.deliverable_code is '산출물 코드(논리 FK: pr_deliverable_m).';
comment on column pr_project_deliverable_r_m.submission_status_code is '산출물 제출 상태 코드(논리 FK: cm_code_m, group=PROJECT_DELIVERABLE_SUBMISSION_STATUS).';
comment on column pr_project_deliverable_r_m.storage_object_key is '업로드 파일 키(스토리지 추상화 식별자).';
comment on column pr_project_deliverable_r_m.original_file_name is '원본 파일명.';
comment on column pr_project_deliverable_r_m.file_size_bytes is '파일 크기(bytes).';

create index if not exists ix_pr_project_deliverable_r_m_status
    on pr_project_deliverable_r_m (project_id, status_code, submission_status_code);

create index if not exists ix_pr_project_deliverable_r_m_deliverable
    on pr_project_deliverable_r_m (deliverable_code);

create index if not exists ix_pr_project_deliverable_r_m_updated_at
    on pr_project_deliverable_r_m (updated_at);


-- =========================================================
-- PR: Project-Status-Deliverable Relation - History (Snapshot)
-- PK: (project_id, status_code, deliverable_code, history_seq)
-- =========================================================
create table if not exists pr_project_deliverable_r_h (
    project_id             bigint not null,
    status_code            varchar(30) not null,
    deliverable_code       varchar(50) not null,
    history_seq            bigint not null,

    event_type             char(1) not null check (event_type in ('C','U','D')),
    event_at               timestamptz not null,

    submission_status_code varchar(30) not null,
    submitted_at           timestamptz,
    submitted_by           bigint,

    storage_object_key     text,
    original_file_name     text,
    mime_type              varchar(100),
    file_size_bytes        bigint,

    is_active              boolean not null,
    memo                   text,

    created_by             bigint,
    created_at             timestamptz not null,
    updated_by             bigint,
    updated_at             timestamptz not null,

    last_source            varchar(30),
    last_activity          text,
    transaction_id         uuid,

    constraint pk_pr_project_deliverable_r_h primary key (project_id, status_code, deliverable_code, history_seq)
);

comment on table pr_project_deliverable_r_h is '프로젝트 산출물 매핑 히스토리(스냅샷).';

create index if not exists ix_pr_project_deliverable_r_h_event_at
    on pr_project_deliverable_r_h (event_at);

create index if not exists ix_pr_project_deliverable_r_h_tx
    on pr_project_deliverable_r_h (transaction_id);
