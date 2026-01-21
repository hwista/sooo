-- =========================================================
-- PR: Project (Unified) - Master
-- =========================================================
create table if not exists pr_project_m (
    project_id          bigserial primary key,

    -- Core
    project_name        text not null,

    -- Current workflow codes (logical FK via varchar)
    status_code         varchar(30) not null,   -- request / proposal / execution / transition
    stage_code          varchar(30) not null,   -- waiting / in_progress / done
    done_result_code    varchar(30),            -- accepted/rejected/won/lost/completed/cancelled/transferred/hold

    -- Current owner (for list/report convenience)
    current_owner_user_id bigint,               -- logical FK (internal user)

    -- Handoff track (current/last handoff)
    handoff_type_code   varchar(50),            -- PRE_TO_PM / PRE_TO_CONTRACT_OWNER / EXEC_TO_CONTRACT_OWNER / EXEC_TO_SM ...
    handoff_stage_code  varchar(30),            -- waiting / in_progress / done
    handoff_user_id     bigint,                 -- receiver of current handoff (logical FK)

    -- Optional links (MVP-0 nullable)
    customer_id         bigint,
    plant_id            bigint,
    system_instance_id  bigint,

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

comment on table pr_project_m is '통합 프로젝트 마스터. 최신 상태 1행 유지.';
comment on column pr_project_m.project_id is '프로젝트 PK (bigserial).';
comment on column pr_project_m.project_name is '프로젝트명(표시용).';

comment on column pr_project_m.status_code is '메인 상태 코드: request(요청) / proposal(제안) / execution(실행) / transition(전환).';
comment on column pr_project_m.stage_code is '단계 코드: waiting / in_progress / done.';
comment on column pr_project_m.done_result_code is '완료 결과 코드: 상태별로 다른 값(accepted/rejected/won/lost/completed/cancelled/transferred/hold).';

comment on column pr_project_m.current_owner_user_id is '현재 오너(업무 책임자) 내부 사용자 ID(논리 FK).';

comment on column pr_project_m.handoff_type_code is '핸드오프 시나리오 코드.';
comment on column pr_project_m.handoff_stage_code is '핸드오프 진행 단계: waiting/in_progress/done.';
comment on column pr_project_m.handoff_user_id is '핸드오프 수신자(인계 대상자) 내부 사용자 ID(논리 FK).';

comment on column pr_project_m.customer_id is '고객 ID(논리 FK, nullable).';
comment on column pr_project_m.plant_id is '플랜트/사이트 ID(논리 FK, nullable).';
comment on column pr_project_m.system_instance_id is '시스템 인스턴스 ID(논리 FK, nullable).';

comment on column pr_project_m.is_active is 'Row 실효 여부(soft delete/비활성).';
comment on column pr_project_m.memo is '메모/설명.';
comment on column pr_project_m.created_by is '생성자 내부 사용자 ID(논리 FK).';
comment on column pr_project_m.created_at is '생성 일시.';
comment on column pr_project_m.updated_by is '수정자 내부 사용자 ID(논리 FK).';
comment on column pr_project_m.updated_at is '수정 일시.';
comment on column pr_project_m.last_source is '마지막 변경 출처(UI/API/IMPORT/SYNC/BATCH).';
comment on column pr_project_m.last_activity is '마지막 CUD 이벤트 식별자(메서드/클래스/엔드포인트 등).';
comment on column pr_project_m.transaction_id is '트랜잭션 ID(UUID). 서버 로그/벌크 추적 연계.';

-- Indexes
create index if not exists ix_pr_project_m_status_stage
    on pr_project_m (status_code, stage_code);

create index if not exists ix_pr_project_m_owner
    on pr_project_m (current_owner_user_id);

create index if not exists ix_pr_project_m_customer
    on pr_project_m (customer_id);

create index if not exists ix_pr_project_m_system_instance
    on pr_project_m (system_instance_id);

create index if not exists ix_pr_project_m_handoff
    on pr_project_m (handoff_type_code, handoff_stage_code, handoff_user_id);

create index if not exists ix_pr_project_m_updated_at
    on pr_project_m (updated_at);


-- =========================================================
-- PR: Project (Unified) - History (Snapshot)
-- PK: (project_id, history_seq)
-- =========================================================
create table if not exists pr_project_h (
    project_id            bigint not null,
    history_seq           bigint not null,

    event_type            char(1) not null
                         check (event_type in ('C', 'U', 'D')),
    event_at              timestamptz not null,

    -- Snapshot of pr_project_m
    project_name          text not null,

    status_code           varchar(30) not null,
    stage_code            varchar(30) not null,
    done_result_code      varchar(30),

    current_owner_user_id bigint,

    handoff_type_code     varchar(50),
    handoff_stage_code    varchar(30),
    handoff_user_id       bigint,

    customer_id           bigint,
    plant_id              bigint,
    system_instance_id    bigint,

    is_active             boolean not null,
    memo                  text,

    created_by            bigint,
    created_at            timestamptz not null,
    updated_by            bigint,
    updated_at            timestamptz not null,

    last_source           varchar(30),
    last_activity         text,
    transaction_id        uuid,

    constraint pk_pr_project_h primary key (project_id, history_seq)
);

comment on table pr_project_h is '통합 프로젝트 히스토리(스냅샷 누적). CUD 시 row 전체 복사.';
comment on column pr_project_h.project_id is '원본 프로젝트 ID(pr_project_m.project_id).';
comment on column pr_project_h.history_seq is '동일 project_id 내 증가 시퀀스.';
comment on column pr_project_h.event_type is '이벤트 타입: C/U/D.';
comment on column pr_project_h.event_at is '이벤트 시각(권장: 원본 updated_at과 동일).';

create index if not exists ix_pr_project_h_event_at
    on pr_project_h (event_at);

create index if not exists ix_pr_project_h_transaction
    on pr_project_h (transaction_id);

create index if not exists ix_pr_project_h_status_stage
    on pr_project_h (status_code, stage_code);