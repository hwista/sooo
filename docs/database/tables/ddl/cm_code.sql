-- =========================================================
-- CM: Common Code - Master
-- =========================================================
create table if not exists cm_code_m (
    code_id         bigserial primary key,

    code_group      varchar(50) not null,
    code_value      varchar(50) not null,
    parent_code     varchar(50),

    display_name_ko varchar(200) not null,
    display_name_en varchar(200),
    description     text,

    sort_order      integer not null default 0,

    is_active       boolean not null default true,
    memo            text,

    created_by      bigint,
    created_at      timestamptz not null default now(),
    updated_by      bigint,
    updated_at      timestamptz not null default now(),

    last_source     varchar(30),
    last_activity   text,
    transaction_id  uuid,

    constraint ux_cm_code_m_group_code unique (code_group, code_value)
);

comment on table cm_code_m is '공통 코드 마스터. FK는 걸지 않고, 서비스 테이블에서 varchar 코드로 논리 참조.';
comment on column cm_code_m.code_id is '코드 PK (bigserial).';
comment on column cm_code_m.code_group is '코드 그룹(카테고리). 예: PROJECT_STATUS, PROJECT_STAGE 등.';
comment on column cm_code_m.code_value is '그룹 내 코드값(논리 키).';
comment on column cm_code_m.parent_code is '계층 코드 구성 시 상위 코드값(옵션).';
comment on column cm_code_m.display_name_ko is '표시명(한글).';
comment on column cm_code_m.display_name_en is '표시명(영문, 옵션).';
comment on column cm_code_m.description is '코드 설명(옵션).';
comment on column cm_code_m.sort_order is '정렬 순서(낮을수록 우선).';

comment on column cm_code_m.is_active is 'Row 실효 여부. true=사용, false=미사용.';
comment on column cm_code_m.memo is '관리 메모.';

comment on column cm_code_m.created_by is '생성자 내부 사용자 ID(논리 FK).';
comment on column cm_code_m.created_at is '생성 일시.';
comment on column cm_code_m.updated_by is '수정자 내부 사용자 ID(논리 FK).';
comment on column cm_code_m.updated_at is '수정 일시.';

comment on column cm_code_m.last_source is '마지막 변경 출처(UI/API/IMPORT/SYNC/BATCH).';
comment on column cm_code_m.last_activity is '마지막 CUD 이벤트 식별자.';
comment on column cm_code_m.transaction_id is '트랜잭션 ID(UUID). 서버 로그 연계용.';

create index if not exists ix_cm_code_m_group
    on cm_code_m (code_group);

create index if not exists ix_cm_code_m_parent
    on cm_code_m (code_group, parent_code);

create index if not exists ix_cm_code_m_active
    on cm_code_m (is_active);


-- =========================================================
-- CM: Common Code - History
-- =========================================================
create table if not exists cm_code_h (
    code_id         bigint not null,
    history_seq     bigint not null,

    event_type      char(1) not null
                   check (event_type in ('C', 'U', 'D')),
    event_at        timestamptz not null,

    code_group      varchar(50) not null,
    code_value      varchar(50) not null,
    parent_code     varchar(50),

    display_name_ko varchar(200) not null,
    display_name_en varchar(200),
    description     text,

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

    constraint pk_cm_code_h primary key (code_id, history_seq)
);

comment on table cm_code_h is '공통 코드 히스토리. 변경 시 코드 row 전체 스냅샷을 누적 저장.';
comment on column cm_code_h.code_id is '원본 코드 ID(cm_code_m.code_id).';
comment on column cm_code_h.history_seq is '동일 code_id 범위 내 증가하는 히스토리 시퀀스.';
comment on column cm_code_h.event_type is '이벤트 타입. C(Create)/U(Update)/D(Deactivate).';
comment on column cm_code_h.event_at is '이벤트 발생 시각(권장: 원본 updated_at과 동일).';

create index if not exists ix_cm_code_h_event_at
    on cm_code_h (event_at);

create index if not exists ix_cm_code_h_group_code
    on cm_code_h (code_group, code_value);
