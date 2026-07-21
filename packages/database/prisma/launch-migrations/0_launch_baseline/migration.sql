-- Required by vector-backed RAG models in prisma/schema.prisma.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "common";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "dms";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "pms";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "sns";

-- CreateTable
CREATE TABLE "pms"."cm_code_m" (
    "code_id" BIGSERIAL NOT NULL,
    "code_group" TEXT NOT NULL,
    "code_value" TEXT NOT NULL,
    "parent_code" TEXT,
    "display_name_ko" TEXT NOT NULL,
    "display_name_en" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_code_m_pkey" PRIMARY KEY ("code_id")
);

-- CreateTable
CREATE TABLE "pms"."cm_code_h" (
    "code_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "code_group" TEXT NOT NULL,
    "code_value" TEXT NOT NULL,
    "parent_code" TEXT,
    "display_name_ko" TEXT NOT NULL,
    "display_name_en" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_code_h_pkey" PRIMARY KEY ("code_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."cm_menu_m" (
    "menu_id" BIGSERIAL NOT NULL,
    "menu_code" TEXT NOT NULL,
    "menu_name" TEXT NOT NULL,
    "menu_name_en" TEXT,
    "menu_type" TEXT NOT NULL DEFAULT 'menu',
    "parent_menu_id" BIGINT,
    "menu_path" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "menu_level" INTEGER NOT NULL DEFAULT 1,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_admin_menu" BOOLEAN NOT NULL DEFAULT false,
    "open_type" TEXT NOT NULL DEFAULT 'tab',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_menu_m_pkey" PRIMARY KEY ("menu_id")
);

-- CreateTable
CREATE TABLE "pms"."cm_menu_h" (
    "menu_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "menu_code" TEXT NOT NULL,
    "menu_name" TEXT NOT NULL,
    "menu_name_en" TEXT,
    "menu_type" TEXT NOT NULL,
    "parent_menu_id" BIGINT,
    "menu_path" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL,
    "menu_level" INTEGER NOT NULL,
    "is_visible" BOOLEAN NOT NULL,
    "is_enabled" BOOLEAN NOT NULL,
    "is_admin_menu" BOOLEAN NOT NULL DEFAULT false,
    "open_type" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_menu_h_pkey" PRIMARY KEY ("menu_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."cm_role_menu_r" (
    "role_menu_id" BIGSERIAL NOT NULL,
    "role_code" TEXT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "access_type" TEXT NOT NULL DEFAULT 'full',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_role_menu_r_pkey" PRIMARY KEY ("role_menu_id")
);

-- CreateTable
CREATE TABLE "pms"."cm_role_menu_h" (
    "role_menu_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "role_code" TEXT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "access_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_role_menu_h_pkey" PRIMARY KEY ("role_menu_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."cm_user_menu_r" (
    "user_menu_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "access_type" TEXT NOT NULL DEFAULT 'full',
    "override_type" TEXT NOT NULL DEFAULT 'grant',
    "expires_at" TIMESTAMP(3),
    "granted_by" BIGINT,
    "granted_at" TIMESTAMP(3),
    "grant_reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_menu_r_pkey" PRIMARY KEY ("user_menu_id")
);

-- CreateTable
CREATE TABLE "pms"."cm_user_menu_h" (
    "user_menu_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "access_type" TEXT NOT NULL,
    "override_type" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "granted_by" BIGINT,
    "granted_at" TIMESTAMP(3),
    "grant_reason" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_menu_h_pkey" PRIMARY KEY ("user_menu_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."cm_user_favorite_r" (
    "user_favorite_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cm_user_favorite_r_pkey" PRIMARY KEY ("user_favorite_id")
);

-- CreateTable
CREATE TABLE "common"."cm_user_m" (
    "user_id" BIGSERIAL NOT NULL,
    "user_name" TEXT NOT NULL,
    "display_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "department_code" TEXT,
    "position_code" TEXT,
    "employee_number" TEXT,
    "company_name" TEXT,
    "customer_id" BIGINT,
    "role_code" TEXT NOT NULL DEFAULT 'viewer',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_m_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "common"."cm_notification_m" (
    "notification_id" BIGSERIAL NOT NULL,
    "recipient_user_id" BIGINT NOT NULL,
    "actor_user_id" BIGINT,
    "source_app_code" VARCHAR(20) NOT NULL,
    "notification_type" VARCHAR(80) NOT NULL,
    "severity_code" VARCHAR(20) NOT NULL DEFAULT 'info',
    "title" VARCHAR(200) NOT NULL,
    "message" VARCHAR(1000),
    "reference_type" VARCHAR(50),
    "reference_id" VARCHAR(100),
    "reference_path" VARCHAR(500),
    "action_type" VARCHAR(80),
    "action_payload" JSONB,
    "dedupe_key" VARCHAR(300),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_notification_m_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_source_m" (
    "ai_source_id" BIGSERIAL NOT NULL,
    "source_app_code" VARCHAR(30) NOT NULL,
    "source_name" VARCHAR(160) NOT NULL,
    "source_kind_code" VARCHAR(40) NOT NULL DEFAULT 'domain',
    "adapter_code" VARCHAR(120),
    "embedding_profile_code" VARCHAR(120),
    "source_status_code" VARCHAR(40) NOT NULL DEFAULT 'active',
    "indexing_enabled" BOOLEAN NOT NULL DEFAULT true,
    "keyword_search_enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata_search_enabled" BOOLEAN NOT NULL DEFAULT true,
    "semantic_search_enabled" BOOLEAN NOT NULL DEFAULT false,
    "vector_search_enabled" BOOLEAN NOT NULL DEFAULT false,
    "rag_context_enabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_ai_source_m_pkey" PRIMARY KEY ("ai_source_id")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_source_h" (
    "ai_source_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMPTZ(6) NOT NULL,
    "source_app_code" VARCHAR(30) NOT NULL,
    "source_name" VARCHAR(160) NOT NULL,
    "source_kind_code" VARCHAR(40) NOT NULL,
    "adapter_code" VARCHAR(120),
    "embedding_profile_code" VARCHAR(120),
    "source_status_code" VARCHAR(40) NOT NULL,
    "indexing_enabled" BOOLEAN NOT NULL,
    "keyword_search_enabled" BOOLEAN NOT NULL,
    "metadata_search_enabled" BOOLEAN NOT NULL,
    "semantic_search_enabled" BOOLEAN NOT NULL,
    "vector_search_enabled" BOOLEAN NOT NULL,
    "rag_context_enabled" BOOLEAN NOT NULL,
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_ai_source_h_pkey" PRIMARY KEY ("ai_source_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_object_m" (
    "ai_object_id" BIGSERIAL NOT NULL,
    "ai_source_id" BIGINT NOT NULL,
    "source_app_code" VARCHAR(30) NOT NULL,
    "entity_type_code" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(200) NOT NULL,
    "source_version" VARCHAR(160),
    "title" VARCHAR(500) NOT NULL,
    "body_text" TEXT,
    "summary_text" TEXT,
    "target_path" VARCHAR(1000),
    "target_external_href" VARCHAR(1000),
    "sensitivity_code" VARCHAR(40) NOT NULL DEFAULT 'internal',
    "acl_policy_code" VARCHAR(40) NOT NULL DEFAULT 'acl',
    "search_eligible" BOOLEAN NOT NULL DEFAULT true,
    "context_eligible" BOOLEAN NOT NULL DEFAULT false,
    "content_hash" VARCHAR(128),
    "indexed_at" TIMESTAMPTZ(6),
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_ai_object_m_pkey" PRIMARY KEY ("ai_object_id")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_object_h" (
    "ai_object_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMPTZ(6) NOT NULL,
    "ai_source_id" BIGINT NOT NULL,
    "source_app_code" VARCHAR(30) NOT NULL,
    "entity_type_code" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(200) NOT NULL,
    "source_version" VARCHAR(160),
    "title" VARCHAR(500) NOT NULL,
    "body_text" TEXT,
    "summary_text" TEXT,
    "target_path" VARCHAR(1000),
    "target_external_href" VARCHAR(1000),
    "sensitivity_code" VARCHAR(40) NOT NULL,
    "acl_policy_code" VARCHAR(40) NOT NULL,
    "search_eligible" BOOLEAN NOT NULL,
    "context_eligible" BOOLEAN NOT NULL,
    "content_hash" VARCHAR(128),
    "indexed_at" TIMESTAMPTZ(6),
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_ai_object_h_pkey" PRIMARY KEY ("ai_object_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_chunk_m" (
    "ai_chunk_id" BIGSERIAL NOT NULL,
    "ai_object_id" BIGINT NOT NULL,
    "chunk_seq" INTEGER NOT NULL,
    "chunk_key" VARCHAR(160) NOT NULL,
    "chunk_text" TEXT NOT NULL,
    "token_count" INTEGER,
    "char_start" INTEGER,
    "char_end" INTEGER,
    "citation_label" VARCHAR(120),
    "content_hash" VARCHAR(128),
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_ai_chunk_m_pkey" PRIMARY KEY ("ai_chunk_id")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_embedding_m" (
    "ai_embedding_id" BIGSERIAL NOT NULL,
    "ai_chunk_id" BIGINT NOT NULL,
    "profile_code" VARCHAR(120) NOT NULL DEFAULT 'default',
    "provider_code" VARCHAR(80),
    "model_name" VARCHAR(160),
    "deployment_name" VARCHAR(160),
    "embedding_dimension" INTEGER NOT NULL,
    "embedding" vector(1536),
    "embedding_hash" VARCHAR(128),
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_ai_embedding_m_pkey" PRIMARY KEY ("ai_embedding_id")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_acl_snapshot_m" (
    "ai_acl_snapshot_id" BIGSERIAL NOT NULL,
    "ai_object_id" BIGINT NOT NULL,
    "access_scope_code" VARCHAR(40) NOT NULL DEFAULT 'acl',
    "policy_hash" VARCHAR(128),
    "sensitivity_code" VARCHAR(40) NOT NULL DEFAULT 'internal',
    "search_eligible" BOOLEAN NOT NULL DEFAULT true,
    "context_eligible" BOOLEAN NOT NULL DEFAULT false,
    "acl_snapshot_jsonb" JSONB NOT NULL,
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_ai_acl_snapshot_m_pkey" PRIMARY KEY ("ai_acl_snapshot_id")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_index_job_m" (
    "ai_index_job_id" BIGSERIAL NOT NULL,
    "ai_source_id" BIGINT,
    "ai_object_id" BIGINT,
    "source_app_code" VARCHAR(30) NOT NULL,
    "entity_type_code" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(200) NOT NULL,
    "job_type_code" VARCHAR(40) NOT NULL DEFAULT 'upsert',
    "job_status_code" VARCHAR(40) NOT NULL DEFAULT 'pending',
    "priority_no" INTEGER NOT NULL DEFAULT 100,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "source_version" VARCHAR(160),
    "requested_by" BIGINT,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "next_retry_at" TIMESTAMPTZ(6),
    "last_error_message" VARCHAR(1000),
    "payload_jsonb" JSONB,
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_ai_index_job_m_pkey" PRIMARY KEY ("ai_index_job_id")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_index_state_m" (
    "ai_index_state_id" BIGSERIAL NOT NULL,
    "ai_source_id" BIGINT NOT NULL,
    "ai_object_id" BIGINT NOT NULL,
    "profile_code" VARCHAR(120) NOT NULL DEFAULT 'default',
    "index_status_code" VARCHAR(40) NOT NULL DEFAULT 'pending',
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "indexed_chunk_count" INTEGER NOT NULL DEFAULT 0,
    "last_indexed_source_version" VARCHAR(160),
    "last_requested_at" TIMESTAMPTZ(6),
    "last_indexed_at" TIMESTAMPTZ(6),
    "last_failed_at" TIMESTAMPTZ(6),
    "last_error_message" VARCHAR(1000),
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_ai_index_state_m_pkey" PRIMARY KEY ("ai_index_state_id")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_index_state_h" (
    "ai_index_state_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMPTZ(6) NOT NULL,
    "ai_source_id" BIGINT NOT NULL,
    "ai_object_id" BIGINT NOT NULL,
    "profile_code" VARCHAR(120) NOT NULL,
    "index_status_code" VARCHAR(40) NOT NULL,
    "chunk_count" INTEGER NOT NULL,
    "indexed_chunk_count" INTEGER NOT NULL,
    "last_indexed_source_version" VARCHAR(160),
    "last_requested_at" TIMESTAMPTZ(6),
    "last_indexed_at" TIMESTAMPTZ(6),
    "last_failed_at" TIMESTAMPTZ(6),
    "last_error_message" VARCHAR(1000),
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_ai_index_state_h_pkey" PRIMARY KEY ("ai_index_state_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_retrieval_log_m" (
    "ai_retrieval_log_id" BIGSERIAL NOT NULL,
    "request_id" VARCHAR(120),
    "conversation_id" BIGINT,
    "source_app_code" VARCHAR(30),
    "query_text" TEXT NOT NULL,
    "retrieval_mode_code" VARCHAR(40) NOT NULL DEFAULT 'hybrid',
    "result_count" INTEGER NOT NULL DEFAULT 0,
    "context_count" INTEGER NOT NULL DEFAULT 0,
    "blocked_count" INTEGER NOT NULL DEFAULT 0,
    "status_code" VARCHAR(40) NOT NULL DEFAULT 'succeeded',
    "latency_ms" INTEGER,
    "user_id" BIGINT,
    "metadata_jsonb" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cm_ai_retrieval_log_m_pkey" PRIMARY KEY ("ai_retrieval_log_id")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_retrieval_log_item_m" (
    "ai_retrieval_log_item_id" BIGSERIAL NOT NULL,
    "ai_retrieval_log_id" BIGINT NOT NULL,
    "ai_object_id" BIGINT,
    "ai_chunk_id" BIGINT,
    "rank_no" INTEGER NOT NULL,
    "score" DOUBLE PRECISION,
    "similarity" DOUBLE PRECISION,
    "included_in_context" BOOLEAN NOT NULL DEFAULT false,
    "permission_state_code" VARCHAR(40) NOT NULL DEFAULT 'unknown',
    "citation_id" VARCHAR(120),
    "metadata_jsonb" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cm_ai_retrieval_log_item_m_pkey" PRIMARY KEY ("ai_retrieval_log_item_id")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_conversation_m" (
    "ai_conversation_id" BIGSERIAL NOT NULL,
    "owner_user_id" BIGINT,
    "source_app_code" VARCHAR(30),
    "conversation_scope_code" VARCHAR(40) NOT NULL DEFAULT 'private',
    "conversation_status_code" VARCHAR(40) NOT NULL DEFAULT 'active',
    "title" VARCHAR(300),
    "summary" TEXT,
    "last_message_at" TIMESTAMPTZ(6),
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_ai_conversation_m_pkey" PRIMARY KEY ("ai_conversation_id")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_message_m" (
    "ai_message_id" BIGSERIAL NOT NULL,
    "ai_conversation_id" BIGINT NOT NULL,
    "parent_message_id" BIGINT,
    "message_seq" INTEGER NOT NULL,
    "role_code" VARCHAR(40) NOT NULL,
    "message_status_code" VARCHAR(40) NOT NULL DEFAULT 'completed',
    "content_text" TEXT,
    "content_jsonb" JSONB,
    "token_count" INTEGER,
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_ai_message_m_pkey" PRIMARY KEY ("ai_message_id")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_reference_m" (
    "ai_reference_id" BIGSERIAL NOT NULL,
    "ai_conversation_id" BIGINT NOT NULL,
    "ai_message_id" BIGINT,
    "ai_object_id" BIGINT,
    "ai_chunk_id" BIGINT,
    "source_app_code" VARCHAR(30),
    "entity_type_code" VARCHAR(80),
    "entity_id" VARCHAR(200),
    "reference_kind_code" VARCHAR(40) NOT NULL DEFAULT 'manual',
    "citation_id" VARCHAR(120),
    "citation_label" VARCHAR(120),
    "target_jsonb" JSONB,
    "metadata_jsonb" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cm_ai_reference_m_pkey" PRIMARY KEY ("ai_reference_id")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_run_m" (
    "ai_run_id" BIGSERIAL NOT NULL,
    "ai_conversation_id" BIGINT NOT NULL,
    "request_message_id" BIGINT,
    "response_message_id" BIGINT,
    "user_id" BIGINT,
    "run_type_code" VARCHAR(40) NOT NULL DEFAULT 'chat',
    "run_status_code" VARCHAR(40) NOT NULL DEFAULT 'pending',
    "provider_code" VARCHAR(80),
    "model_name" VARCHAR(160),
    "deployment_name" VARCHAR(160),
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "latency_ms" INTEGER,
    "input_token_count" INTEGER,
    "output_token_count" INTEGER,
    "total_token_count" INTEGER,
    "last_error_message" VARCHAR(1000),
    "request_jsonb" JSONB,
    "response_jsonb" JSONB,
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_ai_run_m_pkey" PRIMARY KEY ("ai_run_id")
);

-- CreateTable
CREATE TABLE "common"."cm_ai_run_source_r" (
    "ai_run_source_id" BIGSERIAL NOT NULL,
    "ai_run_id" BIGINT NOT NULL,
    "ai_retrieval_log_id" BIGINT,
    "ai_reference_id" BIGINT,
    "ai_object_id" BIGINT,
    "ai_chunk_id" BIGINT,
    "source_kind_code" VARCHAR(40) NOT NULL DEFAULT 'manual',
    "rank_no" INTEGER,
    "included_in_prompt" BOOLEAN NOT NULL DEFAULT false,
    "citation_id" VARCHAR(120),
    "metadata_jsonb" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cm_ai_run_source_r_pkey" PRIMARY KEY ("ai_run_source_id")
);

-- CreateTable
CREATE TABLE "common"."cm_user_auth_m" (
    "user_id" BIGINT NOT NULL,
    "login_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "account_status_code" TEXT NOT NULL DEFAULT 'pending_activation',
    "last_login_at" TIMESTAMP(3),
    "login_fail_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_auth_m_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "common"."cm_user_session_m" (
    "session_id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "session_token_hash" TEXT NOT NULL,
    "issued_app" TEXT NOT NULL DEFAULT 'unknown',
    "user_agent" TEXT,
    "last_seen_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_session_m_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "common"."cm_user_invitation_m" (
    "invitation_id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "invited_by_user_id" BIGINT,
    "invitation_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_invitation_m_pkey" PRIMARY KEY ("invitation_id")
);

-- CreateTable
CREATE TABLE "common"."cm_auth_provider_setting_m" (
    "setting_key" VARCHAR(40) NOT NULL DEFAULT 'default',
    "password_login_enabled" BOOLEAN NOT NULL DEFAULT true,
    "password_reset_enabled" BOOLEAN NOT NULL DEFAULT true,
    "password_change_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reset_code_ttl_minutes" INTEGER NOT NULL DEFAULT 15,
    "reset_code_length" INTEGER NOT NULL DEFAULT 6,
    "internal_sso_enabled" BOOLEAN NOT NULL DEFAULT false,
    "internal_sso_login_url" VARCHAR(1000),
    "microsoft_login_enabled" BOOLEAN NOT NULL DEFAULT false,
    "microsoft_signup_request_enabled" BOOLEAN NOT NULL DEFAULT false,
    "microsoft_tenant_id" VARCHAR(120),
    "microsoft_client_id" VARCHAR(120),
    "microsoft_client_secret_ciphertext" TEXT,
    "microsoft_client_secret_nonce" VARCHAR(80),
    "microsoft_client_secret_tag" VARCHAR(80),
    "microsoft_redirect_uri" VARCHAR(1000),
    "microsoft_scopes" TEXT[] DEFAULT ARRAY['openid', 'profile', 'email', 'User.Read']::TEXT[],
    "allowed_tenant_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowed_email_domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "self_signup_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_delivery_mode" VARCHAR(40) NOT NULL DEFAULT 'outbox',
    "email_from_address" VARCHAR(320),
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_auth_provider_setting_m_pkey" PRIMARY KEY ("setting_key")
);

-- CreateTable
CREATE TABLE "common"."cm_user_external_identity_m" (
    "external_identity_id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "provider_code" VARCHAR(40) NOT NULL,
    "tenant_id" VARCHAR(120) NOT NULL DEFAULT '',
    "subject_id" VARCHAR(200) NOT NULL,
    "email" VARCHAR(320),
    "user_principal_name" VARCHAR(320),
    "display_name" VARCHAR(200),
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_external_identity_m_pkey" PRIMARY KEY ("external_identity_id")
);

-- CreateTable
CREATE TABLE "common"."cm_user_registration_request_m" (
    "registration_request_id" UUID NOT NULL,
    "provider_code" VARCHAR(40) NOT NULL,
    "tenant_id" VARCHAR(120) NOT NULL DEFAULT '',
    "subject_id" VARCHAR(200) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "user_principal_name" VARCHAR(320),
    "display_name" VARCHAR(200),
    "raw_claims" JSONB,
    "status_code" VARCHAR(40) NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "decided_by_user_id" BIGINT,
    "decision_memo" VARCHAR(1000),
    "created_user_id" BIGINT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_registration_request_m_pkey" PRIMARY KEY ("registration_request_id")
);

-- CreateTable
CREATE TABLE "common"."cm_user_password_reset_challenge_m" (
    "challenge_id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_password_reset_challenge_m_pkey" PRIMARY KEY ("challenge_id")
);

-- CreateTable
CREATE TABLE "common"."cm_auth_email_outbox_m" (
    "message_id" UUID NOT NULL,
    "to_email" VARCHAR(320) NOT NULL,
    "from_email" VARCHAR(320),
    "template_code" VARCHAR(80) NOT NULL,
    "subject" VARCHAR(300) NOT NULL,
    "body_text" TEXT NOT NULL,
    "reference_type" VARCHAR(80),
    "reference_id" VARCHAR(120),
    "status_code" VARCHAR(40) NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "fail_reason" VARCHAR(1000),
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_auth_email_outbox_m_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "common"."cm_organization_m" (
    "org_id" BIGSERIAL NOT NULL,
    "org_code" TEXT NOT NULL,
    "org_name" TEXT NOT NULL,
    "org_type" TEXT NOT NULL,
    "org_class" TEXT NOT NULL DEFAULT 'permanent',
    "scope" TEXT NOT NULL DEFAULT 'internal',
    "level_type" TEXT,
    "parent_org_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_organization_m_pkey" PRIMARY KEY ("org_id")
);

-- CreateTable
CREATE TABLE "common"."cm_user_org_r" (
    "user_org_relation_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "org_id" BIGINT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_leader" BOOLEAN NOT NULL DEFAULT false,
    "affiliation_role" TEXT,
    "position_code" TEXT,
    "employee_number" TEXT,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_org_r_pkey" PRIMARY KEY ("user_org_relation_id")
);

-- CreateTable
CREATE TABLE "common"."cm_permission_m" (
    "permission_id" BIGSERIAL NOT NULL,
    "permission_code" TEXT NOT NULL,
    "permission_name" TEXT NOT NULL,
    "domain_code" TEXT NOT NULL,
    "permission_axis" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_permission_m_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "common"."cm_role_m" (
    "role_id" BIGSERIAL NOT NULL,
    "role_code" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "role_scope_code" TEXT NOT NULL DEFAULT 'system',
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_role_m_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "common"."cm_role_permission_r" (
    "role_permission_id" BIGSERIAL NOT NULL,
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_role_permission_r_pkey" PRIMARY KEY ("role_permission_id")
);

-- CreateTable
CREATE TABLE "common"."cm_org_permission_r" (
    "org_permission_id" BIGSERIAL NOT NULL,
    "org_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_org_permission_r_pkey" PRIMARY KEY ("org_permission_id")
);

-- CreateTable
CREATE TABLE "common"."cm_user_permission_exception_r" (
    "user_permission_exception_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "exception_axis" TEXT NOT NULL DEFAULT 'action',
    "effect_type" TEXT NOT NULL DEFAULT 'grant',
    "target_org_id" BIGINT,
    "target_object_type" TEXT,
    "target_object_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "applied_by_user_id" BIGINT,
    "applied_at" TIMESTAMP(3),
    "reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_permission_exception_r_pkey" PRIMARY KEY ("user_permission_exception_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_m" (
    "project_id" BIGSERIAL NOT NULL,
    "project_name" TEXT NOT NULL,
    "status_code" TEXT NOT NULL,
    "stage_code" TEXT NOT NULL,
    "done_result_code" TEXT,
    "current_owner_user_id" BIGINT,
    "owner_organization_id" BIGINT,
    "handoff_type_code" TEXT,
    "handoff_status_code" TEXT,
    "handoff_requested_at" TIMESTAMP(3),
    "handoff_confirmed_at" TIMESTAMP(3),
    "handoff_confirmed_by" BIGINT,
    "customer_id" BIGINT,
    "plant_id" BIGINT,
    "system_instance_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_m_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_status_m" (
    "project_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL,
    "status_goal" TEXT NOT NULL,
    "status_owner_user_id" BIGINT,
    "expected_start_at" DATE,
    "expected_end_at" DATE,
    "actual_start_at" DATE,
    "actual_end_at" DATE,
    "close_condition_group_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_status_m_pkey" PRIMARY KEY ("project_id","status_code")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_request_d" (
    "project_id" BIGINT NOT NULL,
    "request_source_code" TEXT,
    "request_channel_code" TEXT,
    "request_summary" TEXT,
    "request_received_at" DATE,
    "request_priority_code" TEXT,
    "request_owner_user_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_request_d_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_proposal_d" (
    "project_id" BIGINT NOT NULL,
    "proposal_owner_user_id" BIGINT,
    "proposal_due_at" DATE,
    "proposal_submitted_at" DATE,
    "proposal_version" INTEGER,
    "estimate_amount" BIGINT,
    "estimate_unit_code" TEXT,
    "proposal_scope_summary" TEXT,
    "decision_deadline_at" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_proposal_d_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_execution_d" (
    "project_id" BIGINT NOT NULL,
    "contract_signed_at" DATE,
    "contract_amount" BIGINT,
    "contract_unit_code" TEXT,
    "billing_type_code" TEXT,
    "delivery_method_code" TEXT,
    "next_project_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_execution_d_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_transition_d" (
    "project_id" BIGINT NOT NULL,
    "operation_owner_user_id" BIGINT,
    "operation_reserved_at" DATE,
    "operation_start_at" DATE,
    "transition_due_at" DATE,
    "transition_summary" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_transition_d_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_handoff_m" (
    "handoff_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "from_phase_code" TEXT,
    "to_phase_code" TEXT NOT NULL,
    "handoff_type_code" TEXT NOT NULL DEFAULT 'phase_transition',
    "from_user_id" BIGINT,
    "to_user_id" BIGINT,
    "requested_by_user_id" BIGINT,
    "handoff_status_code" TEXT NOT NULL DEFAULT 'pending',
    "condition_note" TEXT,
    "assigned_role_code" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "responded_by_user_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_handoff_m_pkey" PRIMARY KEY ("handoff_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_contract_m" (
    "contract_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "contract_code" VARCHAR(50) NOT NULL,
    "title" TEXT NOT NULL,
    "contract_type_code" TEXT NOT NULL DEFAULT 'new',
    "total_amount" BIGINT,
    "currency_code" VARCHAR(3) NOT NULL DEFAULT 'KRW',
    "contract_status_code" TEXT NOT NULL DEFAULT 'draft',
    "contract_date" DATE,
    "start_date" DATE,
    "end_date" DATE,
    "manager_user_id" BIGINT,
    "billing_type_code" TEXT,
    "delivery_method_code" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_contract_m_pkey" PRIMARY KEY ("contract_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_contract_payment_m" (
    "contract_payment_id" BIGSERIAL NOT NULL,
    "contract_id" BIGINT NOT NULL,
    "payment_type_code" TEXT NOT NULL DEFAULT 'other',
    "amount" BIGINT,
    "trigger_event" TEXT,
    "payment_status_code" TEXT NOT NULL DEFAULT 'scheduled',
    "due_date" DATE,
    "paid_date" DATE,
    "requested_by_user_id" BIGINT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_contract_payment_m_pkey" PRIMARY KEY ("contract_payment_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_deliverable_m" (
    "deliverable_id" BIGSERIAL NOT NULL,
    "deliverable_code" TEXT NOT NULL,
    "deliverable_name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_deliverable_m_pkey" PRIMARY KEY ("deliverable_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_deliverable_group_m" (
    "deliverable_group_id" BIGSERIAL NOT NULL,
    "group_code" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "approval_status_code" TEXT NOT NULL DEFAULT 'draft',
    "version_no" INTEGER NOT NULL DEFAULT 1,
    "approved_by" BIGINT,
    "approved_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_deliverable_group_m_pkey" PRIMARY KEY ("deliverable_group_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_deliverable_group_item_r_m" (
    "group_code" TEXT NOT NULL,
    "deliverable_code" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_deliverable_group_item_r_m_pkey" PRIMARY KEY ("group_code","deliverable_code")
);

-- CreateTable
CREATE TABLE "pms"."pr_close_condition_group_m" (
    "close_condition_group_id" BIGSERIAL NOT NULL,
    "group_code" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "approval_status_code" TEXT NOT NULL DEFAULT 'draft',
    "version_no" INTEGER NOT NULL DEFAULT 1,
    "approved_by" BIGINT,
    "approved_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_close_condition_group_m_pkey" PRIMARY KEY ("close_condition_group_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_close_condition_group_item_r_m" (
    "group_code" TEXT NOT NULL,
    "condition_code" TEXT NOT NULL,
    "requires_deliverable" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_close_condition_group_item_r_m_pkey" PRIMARY KEY ("group_code","condition_code")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_deliverable_r_m" (
    "project_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL,
    "deliverable_code" TEXT NOT NULL,
    "event_id" BIGINT,
    "submission_status_code" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "submitted_by" BIGINT,
    "storage_object_key" TEXT,
    "original_file_name" TEXT,
    "mime_type" VARCHAR(100),
    "file_size_bytes" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_deliverable_r_m_pkey" PRIMARY KEY ("project_id","status_code","deliverable_code")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_close_condition_r_m" (
    "project_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL,
    "condition_code" TEXT NOT NULL,
    "event_id" BIGINT,
    "requires_deliverable" BOOLEAN NOT NULL DEFAULT false,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "checked_at" TIMESTAMP(3),
    "checked_by" BIGINT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_close_condition_r_m_pkey" PRIMARY KEY ("project_id","status_code","condition_code")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_closeout_approval_step_m" (
    "approval_step_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL,
    "target_type_code" VARCHAR(40) NOT NULL,
    "target_code" TEXT NOT NULL,
    "sequence_no" INTEGER NOT NULL,
    "approver_user_id" BIGINT NOT NULL,
    "approval_status_code" VARCHAR(40) NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "decided_by" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_closeout_approval_step_m_pkey" PRIMARY KEY ("approval_step_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_member_r_m" (
    "project_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "role_code" TEXT NOT NULL,
    "organization_id" BIGINT,
    "access_level" TEXT NOT NULL DEFAULT 'participant',
    "is_phase_owner" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" DATE,
    "allocation_rate" INTEGER NOT NULL DEFAULT 100,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_member_r_m_pkey" PRIMARY KEY ("project_id","user_id","role_code")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_org_r_m" (
    "project_id" BIGINT NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "role_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_org_r_m_pkey" PRIMARY KEY ("project_id","organization_id","role_code")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_relation_r_m" (
    "source_project_id" BIGINT NOT NULL,
    "target_project_id" BIGINT NOT NULL,
    "relation_type_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_relation_r_m_pkey" PRIMARY KEY ("source_project_id","target_project_id","relation_type_code")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_role_permission_r" (
    "project_role_permission_id" BIGSERIAL NOT NULL,
    "role_code" TEXT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_role_permission_r_pkey" PRIMARY KEY ("project_role_permission_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_objective_m" (
    "objective_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "parent_objective_id" BIGINT,
    "objective_code" VARCHAR(50) NOT NULL,
    "objective_name" TEXT NOT NULL,
    "description" TEXT,
    "status_code" TEXT NOT NULL DEFAULT 'not_started',
    "due_at" DATE,
    "achieved_at" DATE,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_objective_m_pkey" PRIMARY KEY ("objective_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_wbs_m" (
    "wbs_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "objective_id" BIGINT,
    "parent_wbs_id" BIGINT,
    "wbs_code" VARCHAR(50) NOT NULL,
    "wbs_name" TEXT NOT NULL,
    "description" TEXT,
    "status_code" TEXT NOT NULL DEFAULT 'not_started',
    "depth" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_wbs_m_pkey" PRIMARY KEY ("wbs_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_task_m" (
    "task_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "wbs_id" BIGINT,
    "parent_task_id" BIGINT,
    "task_code" VARCHAR(50) NOT NULL,
    "task_name" TEXT NOT NULL,
    "description" TEXT,
    "task_type_code" TEXT,
    "status_code" TEXT NOT NULL DEFAULT 'not_started',
    "priority_code" TEXT NOT NULL DEFAULT 'normal',
    "assignee_user_id" BIGINT,
    "planned_start_at" DATE,
    "planned_end_at" DATE,
    "actual_start_at" DATE,
    "actual_end_at" DATE,
    "progress_rate" INTEGER NOT NULL DEFAULT 0,
    "estimated_hours" DECIMAL(8,1),
    "actual_hours" DECIMAL(8,1),
    "depth" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_task_m_pkey" PRIMARY KEY ("task_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_task_effort_log_m" (
    "effort_log_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "task_id" BIGINT NOT NULL,
    "user_id" BIGINT,
    "work_date" DATE NOT NULL,
    "actual_hours" DECIMAL(8,1) NOT NULL,
    "work_type_code" VARCHAR(50) NOT NULL DEFAULT 'execution',
    "summary" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_task_effort_log_m_pkey" PRIMARY KEY ("effort_log_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_milestone_m" (
    "milestone_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "objective_id" BIGINT,
    "milestone_code" VARCHAR(50) NOT NULL,
    "milestone_name" TEXT NOT NULL,
    "description" TEXT,
    "status_code" TEXT NOT NULL DEFAULT 'not_started',
    "due_at" DATE,
    "achieved_at" DATE,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_milestone_m_pkey" PRIMARY KEY ("milestone_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_issue_m" (
    "issue_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "issue_code" VARCHAR(50) NOT NULL,
    "issue_title" TEXT NOT NULL,
    "description" TEXT,
    "issue_type_code" TEXT NOT NULL,
    "status_code" TEXT NOT NULL DEFAULT 'open',
    "priority_code" TEXT NOT NULL DEFAULT 'normal',
    "reported_by_user_id" BIGINT,
    "assignee_user_id" BIGINT,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" DATE,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_issue_m_pkey" PRIMARY KEY ("issue_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_legacy_issue_archive_m" (
    "archive_id" BIGSERIAL NOT NULL,
    "source_issue_id" BIGINT NOT NULL,
    "project_id" BIGINT NOT NULL,
    "issue_code" VARCHAR(50) NOT NULL,
    "issue_title" TEXT NOT NULL,
    "description" TEXT,
    "issue_type_code" TEXT NOT NULL,
    "status_code" TEXT NOT NULL,
    "priority_code" TEXT NOT NULL,
    "reported_by_user_id" BIGINT,
    "assignee_user_id" BIGINT,
    "reported_at" TIMESTAMP(3) NOT NULL,
    "due_at" DATE,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "sort_order" INTEGER NOT NULL,
    "source_is_active" BOOLEAN NOT NULL,
    "archived_reason_code" VARCHAR(50) NOT NULL DEFAULT 'hidden_cleanup',
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_created_by" BIGINT,
    "source_created_at" TIMESTAMP(3) NOT NULL,
    "source_updated_by" BIGINT,
    "source_updated_at" TIMESTAMP(3) NOT NULL,
    "source_last_source" TEXT,
    "source_last_activity" TEXT,
    "source_transaction_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_legacy_issue_archive_m_pkey" PRIMARY KEY ("archive_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_issue_m" (
    "project_issue_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "issue_code" VARCHAR(50) NOT NULL,
    "issue_title" TEXT NOT NULL,
    "description" TEXT,
    "issue_type_code" TEXT NOT NULL DEFAULT 'bug',
    "status_code" TEXT NOT NULL DEFAULT 'open',
    "priority_code" TEXT NOT NULL DEFAULT 'normal',
    "reported_by_user_id" BIGINT,
    "owner_user_id" BIGINT,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" DATE,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_issue_m_pkey" PRIMARY KEY ("project_issue_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_requirement_m" (
    "requirement_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "requirement_code" VARCHAR(50) NOT NULL,
    "requirement_title" TEXT NOT NULL,
    "description" TEXT,
    "status_code" TEXT NOT NULL DEFAULT 'open',
    "priority_code" TEXT NOT NULL DEFAULT 'normal',
    "owner_user_id" BIGINT,
    "due_at" DATE,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_requirement_m_pkey" PRIMARY KEY ("requirement_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_risk_m" (
    "risk_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "risk_code" VARCHAR(50) NOT NULL,
    "risk_title" TEXT NOT NULL,
    "description" TEXT,
    "status_code" TEXT NOT NULL DEFAULT 'identified',
    "impact_code" TEXT NOT NULL DEFAULT 'medium',
    "likelihood_code" TEXT NOT NULL DEFAULT 'medium',
    "response_plan" TEXT,
    "owner_user_id" BIGINT,
    "due_at" DATE,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_risk_m_pkey" PRIMARY KEY ("risk_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_change_request_m" (
    "change_request_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "change_code" VARCHAR(50) NOT NULL,
    "change_title" TEXT NOT NULL,
    "description" TEXT,
    "status_code" TEXT NOT NULL DEFAULT 'requested',
    "priority_code" TEXT NOT NULL DEFAULT 'normal',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "owner_user_id" BIGINT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_change_request_m_pkey" PRIMARY KEY ("change_request_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_event_m" (
    "event_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "event_code" VARCHAR(50) NOT NULL,
    "event_name" TEXT NOT NULL,
    "description" TEXT,
    "event_type_code" TEXT NOT NULL DEFAULT 'general',
    "status_code" TEXT NOT NULL DEFAULT 'planned',
    "scheduled_at" TIMESTAMP(3),
    "occurred_at" TIMESTAMP(3),
    "summary" TEXT,
    "owner_user_id" BIGINT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_event_m_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "common"."cm_user_h" (
    "user_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "user_name" TEXT NOT NULL,
    "display_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "department_code" TEXT,
    "position_code" TEXT,
    "employee_number" TEXT,
    "company_name" TEXT,
    "customer_id" BIGINT,
    "role_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_h_pkey" PRIMARY KEY ("user_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_notification_h" (
    "notification_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMPTZ(6) NOT NULL,
    "recipient_user_id" BIGINT NOT NULL,
    "actor_user_id" BIGINT,
    "source_app_code" VARCHAR(20) NOT NULL,
    "notification_type" VARCHAR(80) NOT NULL,
    "severity_code" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" VARCHAR(1000),
    "reference_type" VARCHAR(50),
    "reference_id" VARCHAR(100),
    "reference_path" VARCHAR(500),
    "action_type" VARCHAR(80),
    "action_payload" JSONB,
    "dedupe_key" VARCHAR(300),
    "is_read" BOOLEAN NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_notification_h_pkey" PRIMARY KEY ("notification_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_user_auth_h" (
    "user_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "login_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "account_status_code" TEXT NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "login_fail_count" INTEGER NOT NULL,
    "locked_until" TIMESTAMP(3),
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_auth_h_pkey" PRIMARY KEY ("user_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_user_session_h" (
    "session_id" UUID NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "session_token_hash" TEXT NOT NULL,
    "issued_app" TEXT NOT NULL,
    "user_agent" TEXT,
    "last_seen_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_session_h_pkey" PRIMARY KEY ("session_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_user_invitation_h" (
    "invitation_id" UUID NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "invited_by_user_id" BIGINT,
    "invitation_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_invitation_h_pkey" PRIMARY KEY ("invitation_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_auth_provider_setting_h" (
    "setting_key" VARCHAR(40) NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "password_login_enabled" BOOLEAN NOT NULL,
    "password_reset_enabled" BOOLEAN NOT NULL,
    "password_change_enabled" BOOLEAN NOT NULL,
    "reset_code_ttl_minutes" INTEGER NOT NULL,
    "reset_code_length" INTEGER NOT NULL,
    "internal_sso_enabled" BOOLEAN NOT NULL,
    "internal_sso_login_url" VARCHAR(1000),
    "microsoft_login_enabled" BOOLEAN NOT NULL,
    "microsoft_signup_request_enabled" BOOLEAN NOT NULL,
    "microsoft_tenant_id" VARCHAR(120),
    "microsoft_client_id" VARCHAR(120),
    "microsoft_client_secret_ciphertext" TEXT,
    "microsoft_client_secret_nonce" VARCHAR(80),
    "microsoft_client_secret_tag" VARCHAR(80),
    "microsoft_redirect_uri" VARCHAR(1000),
    "microsoft_scopes" TEXT[],
    "allowed_tenant_ids" TEXT[],
    "allowed_email_domains" TEXT[],
    "self_signup_enabled" BOOLEAN NOT NULL,
    "email_delivery_mode" VARCHAR(40) NOT NULL,
    "email_from_address" VARCHAR(320),
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_auth_provider_setting_h_pkey" PRIMARY KEY ("setting_key","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_user_external_identity_h" (
    "external_identity_id" UUID NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "provider_code" VARCHAR(40) NOT NULL,
    "tenant_id" VARCHAR(120) NOT NULL,
    "subject_id" VARCHAR(200) NOT NULL,
    "email" VARCHAR(320),
    "user_principal_name" VARCHAR(320),
    "display_name" VARCHAR(200),
    "linked_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_external_identity_h_pkey" PRIMARY KEY ("external_identity_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_user_registration_request_h" (
    "registration_request_id" UUID NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "provider_code" VARCHAR(40) NOT NULL,
    "tenant_id" VARCHAR(120) NOT NULL,
    "subject_id" VARCHAR(200) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "user_principal_name" VARCHAR(320),
    "display_name" VARCHAR(200),
    "raw_claims" JSONB,
    "status_code" VARCHAR(40) NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "decided_at" TIMESTAMP(3),
    "decided_by_user_id" BIGINT,
    "decision_memo" VARCHAR(1000),
    "created_user_id" BIGINT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_registration_request_h_pkey" PRIMARY KEY ("registration_request_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_user_password_reset_challenge_h" (
    "challenge_id" UUID NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "fail_count" INTEGER NOT NULL,
    "locked_until" TIMESTAMP(3),
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_password_reset_challenge_h_pkey" PRIMARY KEY ("challenge_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_auth_email_outbox_h" (
    "message_id" UUID NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "to_email" VARCHAR(320) NOT NULL,
    "from_email" VARCHAR(320),
    "template_code" VARCHAR(80) NOT NULL,
    "subject" VARCHAR(300) NOT NULL,
    "body_text" TEXT NOT NULL,
    "reference_type" VARCHAR(80),
    "reference_id" VARCHAR(120),
    "status_code" VARCHAR(40) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "fail_reason" VARCHAR(1000),
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_auth_email_outbox_h_pkey" PRIMARY KEY ("message_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_organization_h" (
    "org_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "org_code" TEXT NOT NULL,
    "org_name" TEXT NOT NULL,
    "org_type" TEXT NOT NULL,
    "org_class" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "level_type" TEXT,
    "parent_org_id" BIGINT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_organization_h_pkey" PRIMARY KEY ("org_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_user_org_h" (
    "user_org_relation_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "org_id" BIGINT NOT NULL,
    "is_primary" BOOLEAN NOT NULL,
    "is_leader" BOOLEAN NOT NULL,
    "affiliation_role" TEXT,
    "position_code" TEXT,
    "employee_number" TEXT,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_org_h_pkey" PRIMARY KEY ("user_org_relation_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_permission_h" (
    "permission_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "permission_code" TEXT NOT NULL,
    "permission_name" TEXT NOT NULL,
    "domain_code" TEXT NOT NULL,
    "permission_axis" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_permission_h_pkey" PRIMARY KEY ("permission_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_role_h" (
    "role_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "role_code" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "role_scope_code" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_role_h_pkey" PRIMARY KEY ("role_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_role_permission_h" (
    "role_permission_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_role_permission_h_pkey" PRIMARY KEY ("role_permission_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_org_permission_h" (
    "org_permission_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "org_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_org_permission_h_pkey" PRIMARY KEY ("org_permission_id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_user_permission_exception_h" (
    "user_permission_exception_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "exception_axis" TEXT NOT NULL,
    "effect_type" TEXT NOT NULL,
    "target_org_id" BIGINT,
    "target_object_type" TEXT,
    "target_object_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "applied_by_user_id" BIGINT,
    "applied_at" TIMESTAMP(3),
    "reason" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_permission_exception_h_pkey" PRIMARY KEY ("user_permission_exception_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_h" (
    "project_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_name" TEXT NOT NULL,
    "status_code" TEXT NOT NULL,
    "stage_code" TEXT NOT NULL,
    "done_result_code" TEXT,
    "current_owner_user_id" BIGINT,
    "owner_organization_id" BIGINT,
    "handoff_type_code" TEXT,
    "handoff_status_code" TEXT,
    "handoff_requested_at" TIMESTAMP(3),
    "handoff_confirmed_at" TIMESTAMP(3),
    "handoff_confirmed_by" BIGINT,
    "customer_id" BIGINT,
    "plant_id" BIGINT,
    "system_instance_id" BIGINT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_h_pkey" PRIMARY KEY ("project_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_status_h" (
    "project_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "status_goal" TEXT NOT NULL,
    "status_owner_user_id" BIGINT,
    "expected_start_at" DATE,
    "expected_end_at" DATE,
    "actual_start_at" DATE,
    "actual_end_at" DATE,
    "close_condition_group_code" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_status_h_pkey" PRIMARY KEY ("project_id","status_code","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_request_d_h" (
    "project_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "request_source_code" TEXT,
    "request_channel_code" TEXT,
    "request_summary" TEXT,
    "request_received_at" DATE,
    "request_priority_code" TEXT,
    "request_owner_user_id" BIGINT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_request_d_h_pkey" PRIMARY KEY ("project_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_proposal_d_h" (
    "project_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "proposal_owner_user_id" BIGINT,
    "proposal_due_at" DATE,
    "proposal_submitted_at" DATE,
    "proposal_version" INTEGER,
    "estimate_amount" BIGINT,
    "estimate_unit_code" TEXT,
    "proposal_scope_summary" TEXT,
    "decision_deadline_at" DATE,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_proposal_d_h_pkey" PRIMARY KEY ("project_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_execution_d_h" (
    "project_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "contract_signed_at" DATE,
    "contract_amount" BIGINT,
    "contract_unit_code" TEXT,
    "billing_type_code" TEXT,
    "delivery_method_code" TEXT,
    "next_project_id" BIGINT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_execution_d_h_pkey" PRIMARY KEY ("project_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_transition_d_h" (
    "project_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "operation_owner_user_id" BIGINT,
    "operation_reserved_at" DATE,
    "operation_start_at" DATE,
    "transition_due_at" DATE,
    "transition_summary" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_transition_d_h_pkey" PRIMARY KEY ("project_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_deliverable_h" (
    "deliverable_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "deliverable_code" TEXT NOT NULL,
    "deliverable_name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_deliverable_h_pkey" PRIMARY KEY ("deliverable_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_deliverable_group_h" (
    "deliverable_group_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "group_code" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "approval_status_code" TEXT NOT NULL,
    "version_no" INTEGER NOT NULL,
    "approved_by" BIGINT,
    "approved_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_deliverable_group_h_pkey" PRIMARY KEY ("deliverable_group_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_deliverable_group_item_r_h" (
    "group_code" TEXT NOT NULL,
    "deliverable_code" TEXT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_deliverable_group_item_r_h_pkey" PRIMARY KEY ("group_code","deliverable_code","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_close_condition_group_h" (
    "close_condition_group_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "group_code" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "approval_status_code" TEXT NOT NULL,
    "version_no" INTEGER NOT NULL,
    "approved_by" BIGINT,
    "approved_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_close_condition_group_h_pkey" PRIMARY KEY ("close_condition_group_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_close_condition_group_item_r_h" (
    "group_code" TEXT NOT NULL,
    "condition_code" TEXT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "requires_deliverable" BOOLEAN NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_close_condition_group_item_r_h_pkey" PRIMARY KEY ("group_code","condition_code","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_deliverable_r_h" (
    "project_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL,
    "deliverable_code" TEXT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "event_id" BIGINT,
    "submission_status_code" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "submitted_by" BIGINT,
    "storage_object_key" TEXT,
    "original_file_name" TEXT,
    "mime_type" VARCHAR(100),
    "file_size_bytes" BIGINT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_deliverable_r_h_pkey" PRIMARY KEY ("project_id","status_code","deliverable_code","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_close_condition_r_h" (
    "project_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL,
    "condition_code" TEXT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "event_id" BIGINT,
    "requires_deliverable" BOOLEAN NOT NULL,
    "is_checked" BOOLEAN NOT NULL,
    "checked_at" TIMESTAMP(3),
    "checked_by" BIGINT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_close_condition_r_h_pkey" PRIMARY KEY ("project_id","status_code","condition_code","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_member_r_h" (
    "project_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "role_code" TEXT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "organization_id" BIGINT,
    "access_level" TEXT NOT NULL,
    "is_phase_owner" BOOLEAN NOT NULL,
    "assigned_at" DATE NOT NULL,
    "released_at" DATE,
    "allocation_rate" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_member_r_h_pkey" PRIMARY KEY ("project_id","user_id","role_code","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_org_r_h" (
    "project_id" BIGINT NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "role_code" TEXT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_org_r_h_pkey" PRIMARY KEY ("project_id","organization_id","role_code","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_relation_r_h" (
    "source_project_id" BIGINT NOT NULL,
    "target_project_id" BIGINT NOT NULL,
    "relation_type_code" TEXT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_relation_r_h_pkey" PRIMARY KEY ("source_project_id","target_project_id","relation_type_code","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_handoff_h" (
    "handoff_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_id" BIGINT NOT NULL,
    "from_phase_code" TEXT,
    "to_phase_code" TEXT NOT NULL,
    "handoff_type_code" TEXT NOT NULL,
    "from_user_id" BIGINT,
    "to_user_id" BIGINT,
    "requested_by_user_id" BIGINT,
    "handoff_status_code" TEXT NOT NULL,
    "condition_note" TEXT,
    "assigned_role_code" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "responded_by_user_id" BIGINT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_handoff_h_pkey" PRIMARY KEY ("handoff_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_contract_h" (
    "contract_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_id" BIGINT NOT NULL,
    "contract_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contract_type_code" TEXT NOT NULL,
    "total_amount" BIGINT,
    "currency_code" TEXT NOT NULL,
    "contract_status_code" TEXT NOT NULL,
    "contract_date" DATE,
    "start_date" DATE,
    "end_date" DATE,
    "manager_user_id" BIGINT,
    "billing_type_code" TEXT,
    "delivery_method_code" TEXT,
    "is_primary" BOOLEAN NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_contract_h_pkey" PRIMARY KEY ("contract_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_contract_payment_h" (
    "contract_payment_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "contract_id" BIGINT NOT NULL,
    "payment_type_code" TEXT NOT NULL,
    "amount" BIGINT,
    "trigger_event" TEXT,
    "payment_status_code" TEXT NOT NULL,
    "due_date" DATE,
    "paid_date" DATE,
    "requested_by_user_id" BIGINT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_contract_payment_h_pkey" PRIMARY KEY ("contract_payment_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_role_permission_h" (
    "project_role_permission_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "role_code" TEXT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_role_permission_h_pkey" PRIMARY KEY ("project_role_permission_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_objective_h" (
    "objective_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_id" BIGINT NOT NULL,
    "parent_objective_id" BIGINT,
    "objective_code" VARCHAR(50) NOT NULL,
    "objective_name" TEXT NOT NULL,
    "description" TEXT,
    "status_code" TEXT NOT NULL,
    "due_at" DATE,
    "achieved_at" DATE,
    "depth" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_objective_h_pkey" PRIMARY KEY ("objective_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_wbs_h" (
    "wbs_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_id" BIGINT NOT NULL,
    "objective_id" BIGINT,
    "parent_wbs_id" BIGINT,
    "wbs_code" VARCHAR(50) NOT NULL,
    "wbs_name" TEXT NOT NULL,
    "description" TEXT,
    "status_code" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_wbs_h_pkey" PRIMARY KEY ("wbs_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_task_h" (
    "task_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_id" BIGINT NOT NULL,
    "wbs_id" BIGINT,
    "parent_task_id" BIGINT,
    "task_code" VARCHAR(50) NOT NULL,
    "task_name" TEXT NOT NULL,
    "description" TEXT,
    "task_type_code" TEXT,
    "status_code" TEXT NOT NULL,
    "priority_code" TEXT NOT NULL,
    "assignee_user_id" BIGINT,
    "planned_start_at" DATE,
    "planned_end_at" DATE,
    "actual_start_at" DATE,
    "actual_end_at" DATE,
    "progress_rate" INTEGER NOT NULL,
    "estimated_hours" DECIMAL(8,1),
    "actual_hours" DECIMAL(8,1),
    "depth" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_task_h_pkey" PRIMARY KEY ("task_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_task_effort_log_h" (
    "effort_log_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_id" BIGINT NOT NULL,
    "task_id" BIGINT NOT NULL,
    "user_id" BIGINT,
    "work_date" DATE NOT NULL,
    "actual_hours" DECIMAL(8,1) NOT NULL,
    "work_type_code" VARCHAR(50) NOT NULL,
    "summary" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_task_effort_log_h_pkey" PRIMARY KEY ("effort_log_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_milestone_h" (
    "milestone_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_id" BIGINT NOT NULL,
    "objective_id" BIGINT,
    "milestone_code" VARCHAR(50) NOT NULL,
    "milestone_name" TEXT NOT NULL,
    "description" TEXT,
    "status_code" TEXT NOT NULL,
    "due_at" DATE,
    "achieved_at" DATE,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_milestone_h_pkey" PRIMARY KEY ("milestone_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_issue_h" (
    "issue_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_id" BIGINT NOT NULL,
    "issue_code" VARCHAR(50) NOT NULL,
    "issue_title" TEXT NOT NULL,
    "description" TEXT,
    "issue_type_code" TEXT NOT NULL,
    "status_code" TEXT NOT NULL,
    "priority_code" TEXT NOT NULL,
    "reported_by_user_id" BIGINT,
    "assignee_user_id" BIGINT,
    "reported_at" TIMESTAMP(3) NOT NULL,
    "due_at" DATE,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_issue_h_pkey" PRIMARY KEY ("issue_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_legacy_issue_archive_h" (
    "archive_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "source_issue_id" BIGINT NOT NULL,
    "project_id" BIGINT NOT NULL,
    "issue_code" VARCHAR(50) NOT NULL,
    "issue_title" TEXT NOT NULL,
    "description" TEXT,
    "issue_type_code" TEXT NOT NULL,
    "status_code" TEXT NOT NULL,
    "priority_code" TEXT NOT NULL,
    "reported_by_user_id" BIGINT,
    "assignee_user_id" BIGINT,
    "reported_at" TIMESTAMP(3) NOT NULL,
    "due_at" DATE,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "sort_order" INTEGER NOT NULL,
    "source_is_active" BOOLEAN NOT NULL,
    "archived_reason_code" VARCHAR(50) NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL,
    "source_created_by" BIGINT,
    "source_created_at" TIMESTAMP(3) NOT NULL,
    "source_updated_by" BIGINT,
    "source_updated_at" TIMESTAMP(3) NOT NULL,
    "source_last_source" TEXT,
    "source_last_activity" TEXT,
    "source_transaction_id" UUID,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_legacy_issue_archive_h_pkey" PRIMARY KEY ("archive_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_issue_h" (
    "project_issue_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_id" BIGINT NOT NULL,
    "issue_code" VARCHAR(50) NOT NULL,
    "issue_title" TEXT NOT NULL,
    "description" TEXT,
    "issue_type_code" TEXT NOT NULL,
    "status_code" TEXT NOT NULL,
    "priority_code" TEXT NOT NULL,
    "reported_by_user_id" BIGINT,
    "owner_user_id" BIGINT,
    "reported_at" TIMESTAMP(3) NOT NULL,
    "due_at" DATE,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_issue_h_pkey" PRIMARY KEY ("project_issue_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_requirement_h" (
    "requirement_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_id" BIGINT NOT NULL,
    "requirement_code" VARCHAR(50) NOT NULL,
    "requirement_title" TEXT NOT NULL,
    "description" TEXT,
    "status_code" TEXT NOT NULL,
    "priority_code" TEXT NOT NULL,
    "owner_user_id" BIGINT,
    "due_at" DATE,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_requirement_h_pkey" PRIMARY KEY ("requirement_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_risk_h" (
    "risk_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_id" BIGINT NOT NULL,
    "risk_code" VARCHAR(50) NOT NULL,
    "risk_title" TEXT NOT NULL,
    "description" TEXT,
    "status_code" TEXT NOT NULL,
    "impact_code" TEXT NOT NULL,
    "likelihood_code" TEXT NOT NULL,
    "response_plan" TEXT,
    "owner_user_id" BIGINT,
    "due_at" DATE,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_risk_h_pkey" PRIMARY KEY ("risk_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_change_request_h" (
    "change_request_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_id" BIGINT NOT NULL,
    "change_code" VARCHAR(50) NOT NULL,
    "change_title" TEXT NOT NULL,
    "description" TEXT,
    "status_code" TEXT NOT NULL,
    "priority_code" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "decided_at" TIMESTAMP(3),
    "owner_user_id" BIGINT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_change_request_h_pkey" PRIMARY KEY ("change_request_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_event_h" (
    "event_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_id" BIGINT NOT NULL,
    "event_code" VARCHAR(50) NOT NULL,
    "event_name" TEXT NOT NULL,
    "description" TEXT,
    "event_type_code" TEXT NOT NULL,
    "status_code" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "occurred_at" TIMESTAMP(3),
    "summary" TEXT,
    "owner_user_id" BIGINT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_event_h_pkey" PRIMARY KEY ("event_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_site_m" (
    "site_id" BIGSERIAL NOT NULL,
    "customer_id" BIGINT,
    "site_code" VARCHAR(80) NOT NULL,
    "site_name" VARCHAR(200) NOT NULL,
    "site_type_code" VARCHAR(40),
    "region_code" VARCHAR(40),
    "address" VARCHAR(500),
    "timezone" VARCHAR(80),
    "operation_owner_name" VARCHAR(120),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_site_m_pkey" PRIMARY KEY ("site_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_site_h" (
    "site_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "customer_id" BIGINT,
    "site_code" VARCHAR(80) NOT NULL,
    "site_name" VARCHAR(200) NOT NULL,
    "site_type_code" VARCHAR(40),
    "region_code" VARCHAR(40),
    "address" VARCHAR(500),
    "timezone" VARCHAR(80),
    "operation_owner_name" VARCHAR(120),
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_site_h_pkey" PRIMARY KEY ("site_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_system_catalog_m" (
    "system_catalog_id" BIGSERIAL NOT NULL,
    "parent_system_catalog_id" BIGINT,
    "catalog_code" VARCHAR(80) NOT NULL,
    "catalog_name" VARCHAR(200) NOT NULL,
    "category_code" VARCHAR(40),
    "vendor_name" VARCHAR(120),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_system_catalog_m_pkey" PRIMARY KEY ("system_catalog_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_system_catalog_h" (
    "system_catalog_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "parent_system_catalog_id" BIGINT,
    "catalog_code" VARCHAR(80) NOT NULL,
    "catalog_name" VARCHAR(200) NOT NULL,
    "category_code" VARCHAR(40),
    "vendor_name" VARCHAR(120),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_system_catalog_h_pkey" PRIMARY KEY ("system_catalog_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_system_instance_m" (
    "system_instance_id" BIGSERIAL NOT NULL,
    "customer_id" BIGINT,
    "site_id" BIGINT,
    "system_catalog_id" BIGINT,
    "instance_code" VARCHAR(100) NOT NULL,
    "instance_name" VARCHAR(220) NOT NULL,
    "environment_code" VARCHAR(40),
    "operation_owner_type_code" VARCHAR(40),
    "operation_owner_name" VARCHAR(120),
    "lifecycle_status_code" VARCHAR(40) NOT NULL DEFAULT 'active',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_system_instance_m_pkey" PRIMARY KEY ("system_instance_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_system_instance_h" (
    "system_instance_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "customer_id" BIGINT,
    "site_id" BIGINT,
    "system_catalog_id" BIGINT,
    "instance_code" VARCHAR(100) NOT NULL,
    "instance_name" VARCHAR(220) NOT NULL,
    "environment_code" VARCHAR(40),
    "operation_owner_type_code" VARCHAR(40),
    "operation_owner_name" VARCHAR(120),
    "lifecycle_status_code" VARCHAR(40) NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_system_instance_h_pkey" PRIMARY KEY ("system_instance_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_integration_m" (
    "integration_id" BIGSERIAL NOT NULL,
    "integration_code" VARCHAR(100) NOT NULL,
    "integration_name" VARCHAR(220) NOT NULL,
    "source_system_instance_id" BIGINT NOT NULL,
    "target_system_instance_id" BIGINT NOT NULL,
    "direction_code" VARCHAR(40),
    "interface_type_code" VARCHAR(40),
    "status_code" VARCHAR(40) NOT NULL DEFAULT 'active',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_integration_m_pkey" PRIMARY KEY ("integration_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_integration_h" (
    "integration_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "integration_code" VARCHAR(100) NOT NULL,
    "integration_name" VARCHAR(220) NOT NULL,
    "source_system_instance_id" BIGINT NOT NULL,
    "target_system_instance_id" BIGINT NOT NULL,
    "direction_code" VARCHAR(40),
    "interface_type_code" VARCHAR(40),
    "status_code" VARCHAR(40) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_integration_h_pkey" PRIMARY KEY ("integration_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_master_import_profile_m" (
    "profile_id" BIGSERIAL NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "profile_name" VARCHAR(160) NOT NULL,
    "column_mapping" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_master_import_profile_m_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_master_import_profile_h" (
    "profile_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "profile_name" VARCHAR(160) NOT NULL,
    "column_mapping" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_master_import_profile_h_pkey" PRIMARY KEY ("profile_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."cm_customer_m" (
    "customer_id" BIGSERIAL NOT NULL,
    "customer_code" VARCHAR(50) NOT NULL,
    "customer_name" VARCHAR(200) NOT NULL,
    "customer_type" VARCHAR(50),
    "industry" VARCHAR(100),
    "address" VARCHAR(500),
    "phone" VARCHAR(50),
    "email" VARCHAR(200),
    "contact_person" VARCHAR(100),
    "contact_phone" VARCHAR(50),
    "website" VARCHAR(300),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_customer_m_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "pms"."cm_customer_h" (
    "customer_id" BIGINT NOT NULL,
    "history_seq" SERIAL NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "customer_code" VARCHAR(50) NOT NULL,
    "customer_name" VARCHAR(200) NOT NULL,
    "customer_type" VARCHAR(50),
    "industry" VARCHAR(100),
    "address" VARCHAR(500),
    "phone" VARCHAR(50),
    "email" VARCHAR(200),
    "contact_person" VARCHAR(100),
    "contact_phone" VARCHAR(50),
    "website" VARCHAR(300),
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_customer_h_pkey" PRIMARY KEY ("customer_id","history_seq")
);

-- CreateTable
CREATE TABLE "crm"."crm_opportunity_m" (
    "opportunity_id" BIGSERIAL NOT NULL,
    "opportunity_code" VARCHAR(80) NOT NULL,
    "opportunity_group_code" VARCHAR(80) NOT NULL,
    "customer_name" VARCHAR(200) NOT NULL,
    "opportunity_name" VARCHAR(300) NOT NULL,
    "owner_name" VARCHAR(100) NOT NULL,
    "owner_user_id" BIGINT,
    "business_type" VARCHAR(120) NOT NULL,
    "industry_line" VARCHAR(120) NOT NULL,
    "region_code" VARCHAR(30) NOT NULL DEFAULT 'domestic',
    "status_code" VARCHAR(40) NOT NULL DEFAULT 'draft',
    "priority_code" VARCHAR(40) NOT NULL DEFAULT 'medium',
    "version_no" INTEGER NOT NULL DEFAULT 1,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "contract_created" BOOLEAN NOT NULL DEFAULT false,
    "contract_created_at" TIMESTAMP(3),
    "contract_code" VARCHAR(80),
    "expected_start_date" DATE,
    "expected_end_date" DATE,
    "payment_term_code" VARCHAR(80),
    "quote_status_code" VARCHAR(40) NOT NULL DEFAULT 'draft',
    "quote_client_contact_name" VARCHAR(120),
    "quote_issued_at" TIMESTAMP(3),
    "quote_valid_until" DATE,
    "quote_memo" VARCHAR(1000),
    "revenue_subtotal" BIGINT NOT NULL DEFAULT 0,
    "special_discount_type_code" VARCHAR(30) NOT NULL DEFAULT 'amount',
    "special_discount_value" DECIMAL(12,2),
    "special_discount_amount" BIGINT NOT NULL DEFAULT 0,
    "revenue_total" BIGINT NOT NULL DEFAULT 0,
    "cost_total" BIGINT NOT NULL DEFAULT 0,
    "pms_handoff_status_code" VARCHAR(40) NOT NULL DEFAULT 'planned',
    "dms_link_status_code" VARCHAR(40) NOT NULL DEFAULT 'planned',
    "admin_boundary_code" VARCHAR(40) NOT NULL DEFAULT 'shared-admin',
    "next_action" VARCHAR(1000) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_opportunity_m_pkey" PRIMARY KEY ("opportunity_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_quote_dms_handoff_m" (
    "quote_dms_handoff_id" BIGSERIAL NOT NULL,
    "opportunity_id" BIGINT NOT NULL,
    "opportunity_code" VARCHAR(80) NOT NULL,
    "quote_number" VARCHAR(120) NOT NULL,
    "document_type_code" VARCHAR(40) NOT NULL DEFAULT 'quote',
    "document_title" VARCHAR(300) NOT NULL,
    "template_key" VARCHAR(120) NOT NULL,
    "folder_hint" VARCHAR(500) NOT NULL,
    "file_name_hint" VARCHAR(300) NOT NULL,
    "draft_path" VARCHAR(800) NOT NULL,
    "status_code" VARCHAR(40) NOT NULL DEFAULT 'draft-created',
    "document_snapshot" JSONB NOT NULL,
    "variables_snapshot" JSONB NOT NULL,
    "memo" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "saved_by" BIGINT,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_quote_dms_handoff_m_pkey" PRIMARY KEY ("quote_dms_handoff_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_opportunity_h" (
    "opportunity_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "opportunity_code" VARCHAR(80) NOT NULL,
    "opportunity_group_code" VARCHAR(80) NOT NULL,
    "customer_name" VARCHAR(200) NOT NULL,
    "opportunity_name" VARCHAR(300) NOT NULL,
    "owner_name" VARCHAR(100) NOT NULL,
    "owner_user_id" BIGINT,
    "business_type" VARCHAR(120) NOT NULL,
    "industry_line" VARCHAR(120) NOT NULL,
    "region_code" VARCHAR(30) NOT NULL,
    "status_code" VARCHAR(40) NOT NULL,
    "priority_code" VARCHAR(40) NOT NULL,
    "version_no" INTEGER NOT NULL,
    "confirmed" BOOLEAN NOT NULL,
    "contract_created" BOOLEAN NOT NULL,
    "contract_created_at" TIMESTAMP(3),
    "contract_code" VARCHAR(80),
    "expected_start_date" DATE,
    "expected_end_date" DATE,
    "payment_term_code" VARCHAR(80),
    "quote_status_code" VARCHAR(40) NOT NULL,
    "quote_client_contact_name" VARCHAR(120),
    "quote_issued_at" TIMESTAMP(3),
    "quote_valid_until" DATE,
    "quote_memo" VARCHAR(1000),
    "revenue_subtotal" BIGINT NOT NULL,
    "special_discount_type_code" VARCHAR(30) NOT NULL,
    "special_discount_value" DECIMAL(12,2),
    "special_discount_amount" BIGINT NOT NULL,
    "revenue_total" BIGINT NOT NULL,
    "cost_total" BIGINT NOT NULL,
    "pms_handoff_status_code" VARCHAR(40) NOT NULL,
    "dms_link_status_code" VARCHAR(40) NOT NULL,
    "admin_boundary_code" VARCHAR(40) NOT NULL,
    "next_action" VARCHAR(1000) NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_opportunity_h_pkey" PRIMARY KEY ("opportunity_id","history_seq")
);

-- CreateTable
CREATE TABLE "crm"."crm_opportunity_line_d" (
    "opportunity_line_id" BIGSERIAL NOT NULL,
    "opportunity_id" BIGINT NOT NULL,
    "line_code" VARCHAR(80) NOT NULL,
    "line_kind_code" VARCHAR(30) NOT NULL,
    "category_code" VARCHAR(60) NOT NULL,
    "line_label" VARCHAR(300) NOT NULL,
    "quantity" DECIMAL(12,2),
    "unit_price" BIGINT,
    "amount" BIGINT NOT NULL DEFAULT 0,
    "margin_rate" DECIMAL(7,2),
    "trunc_unit" BIGINT,
    "department" VARCHAR(120),
    "member_name" VARCHAR(120),
    "grade" VARCHAR(80),
    "service_type_code" VARCHAR(30),
    "revenue_linked" BOOLEAN NOT NULL DEFAULT false,
    "linked_cost_line_code" VARCHAR(80),
    "revenue_unit_price" BIGINT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_opportunity_line_d_pkey" PRIMARY KEY ("opportunity_line_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_opportunity_line_h" (
    "opportunity_line_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "opportunity_id" BIGINT NOT NULL,
    "line_code" VARCHAR(80) NOT NULL,
    "line_kind_code" VARCHAR(30) NOT NULL,
    "category_code" VARCHAR(60) NOT NULL,
    "line_label" VARCHAR(300) NOT NULL,
    "quantity" DECIMAL(12,2),
    "unit_price" BIGINT,
    "amount" BIGINT NOT NULL,
    "margin_rate" DECIMAL(7,2),
    "trunc_unit" BIGINT,
    "department" VARCHAR(120),
    "member_name" VARCHAR(120),
    "grade" VARCHAR(80),
    "service_type_code" VARCHAR(30),
    "revenue_linked" BOOLEAN NOT NULL,
    "linked_cost_line_code" VARCHAR(80),
    "revenue_unit_price" BIGINT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_opportunity_line_h_pkey" PRIMARY KEY ("opportunity_line_id","history_seq")
);

-- CreateTable
CREATE TABLE "crm"."crm_customer_m" (
    "customer_id" BIGSERIAL NOT NULL,
    "customer_code" VARCHAR(80) NOT NULL,
    "customer_name" VARCHAR(200) NOT NULL,
    "customer_type_code" VARCHAR(40) NOT NULL DEFAULT 'prospect',
    "industry_line" VARCHAR(120) NOT NULL,
    "region_code" VARCHAR(30) NOT NULL DEFAULT 'domestic',
    "owner_name" VARCHAR(100) NOT NULL,
    "owner_user_id" BIGINT,
    "contact_name" VARCHAR(120),
    "contact_email" VARCHAR(200),
    "contact_phone" VARCHAR(80),
    "source_opportunity_id" BIGINT,
    "latest_opportunity_code" VARCHAR(80),
    "latest_activity_at" TIMESTAMP(3),
    "last_interaction_summary" VARCHAR(1000),
    "next_action" VARCHAR(1000) NOT NULL,
    "admin_boundary_code" VARCHAR(40) NOT NULL DEFAULT 'shared-admin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_customer_m_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_customer_h" (
    "customer_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "customer_code" VARCHAR(80) NOT NULL,
    "customer_name" VARCHAR(200) NOT NULL,
    "customer_type_code" VARCHAR(40) NOT NULL,
    "industry_line" VARCHAR(120) NOT NULL,
    "region_code" VARCHAR(30) NOT NULL,
    "owner_name" VARCHAR(100) NOT NULL,
    "owner_user_id" BIGINT,
    "contact_name" VARCHAR(120),
    "contact_email" VARCHAR(200),
    "contact_phone" VARCHAR(80),
    "source_opportunity_id" BIGINT,
    "latest_opportunity_code" VARCHAR(80),
    "latest_activity_at" TIMESTAMP(3),
    "last_interaction_summary" VARCHAR(1000),
    "next_action" VARCHAR(1000) NOT NULL,
    "admin_boundary_code" VARCHAR(40) NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_customer_h_pkey" PRIMARY KEY ("customer_id","history_seq")
);

-- CreateTable
CREATE TABLE "crm"."crm_customer_activity_d" (
    "activity_id" BIGSERIAL NOT NULL,
    "activity_code" VARCHAR(80) NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "source_opportunity_id" BIGINT,
    "source_opportunity_code" VARCHAR(80),
    "activity_type_code" VARCHAR(40) NOT NULL DEFAULT 'meeting',
    "activity_status_code" VARCHAR(40) NOT NULL DEFAULT 'done',
    "subject" VARCHAR(300) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMP(3),
    "owner_name" VARCHAR(100) NOT NULL,
    "owner_user_id" BIGINT,
    "summary" VARCHAR(1000) NOT NULL,
    "next_action" VARCHAR(1000),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_customer_activity_d_pkey" PRIMARY KEY ("activity_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_customer_activity_h" (
    "activity_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "activity_code" VARCHAR(80) NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "source_opportunity_id" BIGINT,
    "source_opportunity_code" VARCHAR(80),
    "activity_type_code" VARCHAR(40) NOT NULL,
    "activity_status_code" VARCHAR(40) NOT NULL,
    "subject" VARCHAR(300) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "due_at" TIMESTAMP(3),
    "owner_name" VARCHAR(100) NOT NULL,
    "owner_user_id" BIGINT,
    "summary" VARCHAR(1000) NOT NULL,
    "next_action" VARCHAR(1000),
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_customer_activity_h_pkey" PRIMARY KEY ("activity_id","history_seq")
);

-- CreateTable
CREATE TABLE "crm"."crm_quote_seller_profile_m" (
    "seller_profile_id" BIGSERIAL NOT NULL,
    "profile_code" VARCHAR(80) NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "ceo_name" VARCHAR(120),
    "business_registration_no" VARCHAR(80),
    "address" VARCHAR(500),
    "tel" VARCHAR(80),
    "fax" VARCHAR(80),
    "website" VARCHAR(200),
    "email" VARCHAR(200),
    "ci_status_code" VARCHAR(40) NOT NULL DEFAULT 'dms-planned',
    "ci_storage_ref" VARCHAR(300),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_quote_seller_profile_m_pkey" PRIMARY KEY ("seller_profile_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_quote_seller_profile_h" (
    "seller_profile_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "profile_code" VARCHAR(80) NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "ceo_name" VARCHAR(120),
    "business_registration_no" VARCHAR(80),
    "address" VARCHAR(500),
    "tel" VARCHAR(80),
    "fax" VARCHAR(80),
    "website" VARCHAR(200),
    "email" VARCHAR(200),
    "ci_status_code" VARCHAR(40) NOT NULL,
    "ci_storage_ref" VARCHAR(300),
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_quote_seller_profile_h_pkey" PRIMARY KEY ("seller_profile_id","history_seq")
);

-- CreateTable
CREATE TABLE "crm"."crm_contract_m" (
    "contract_id" BIGSERIAL NOT NULL,
    "contract_code" VARCHAR(80) NOT NULL,
    "source_opportunity_id" BIGINT,
    "source_opportunity_code" VARCHAR(80),
    "customer_name" VARCHAR(200) NOT NULL,
    "contract_name" VARCHAR(300) NOT NULL,
    "owner_name" VARCHAR(100) NOT NULL,
    "business_type" VARCHAR(120) NOT NULL,
    "industry_line" VARCHAR(120) NOT NULL,
    "region_code" VARCHAR(30) NOT NULL DEFAULT 'domestic',
    "status_code" VARCHAR(40) NOT NULL DEFAULT 'review',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "contract_start_date" DATE NOT NULL,
    "contract_end_date" DATE NOT NULL,
    "wbs_code" VARCHAR(80),
    "payment_term_code" VARCHAR(80),
    "revenue_subtotal" BIGINT NOT NULL DEFAULT 0,
    "special_discount_type_code" VARCHAR(30) NOT NULL DEFAULT 'amount',
    "special_discount_value" DECIMAL(12,2),
    "special_discount_amount" BIGINT NOT NULL DEFAULT 0,
    "revenue_total" BIGINT NOT NULL DEFAULT 0,
    "cost_total" BIGINT NOT NULL DEFAULT 0,
    "external_cost_total" BIGINT NOT NULL DEFAULT 0,
    "pms_handoff_status_code" VARCHAR(40) NOT NULL DEFAULT 'planned',
    "dms_link_status_code" VARCHAR(40) NOT NULL DEFAULT 'planned',
    "admin_boundary_code" VARCHAR(40) NOT NULL DEFAULT 'shared-admin',
    "next_action" VARCHAR(1000) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_contract_m_pkey" PRIMARY KEY ("contract_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_contract_dms_handoff_m" (
    "contract_dms_handoff_id" BIGSERIAL NOT NULL,
    "contract_id" BIGINT NOT NULL,
    "contract_code" VARCHAR(80) NOT NULL,
    "document_type_code" VARCHAR(40) NOT NULL DEFAULT 'contract',
    "document_title" VARCHAR(300) NOT NULL,
    "template_key" VARCHAR(120) NOT NULL,
    "folder_hint" VARCHAR(500) NOT NULL,
    "file_name_hint" VARCHAR(300) NOT NULL,
    "draft_path" VARCHAR(800) NOT NULL,
    "status_code" VARCHAR(40) NOT NULL DEFAULT 'draft-created',
    "document_snapshot" JSONB NOT NULL,
    "variables_snapshot" JSONB NOT NULL,
    "attachments_snapshot" JSONB NOT NULL,
    "memo" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "saved_by" BIGINT,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_contract_dms_handoff_m_pkey" PRIMARY KEY ("contract_dms_handoff_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_contract_h" (
    "contract_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "contract_code" VARCHAR(80) NOT NULL,
    "source_opportunity_id" BIGINT,
    "source_opportunity_code" VARCHAR(80),
    "customer_name" VARCHAR(200) NOT NULL,
    "contract_name" VARCHAR(300) NOT NULL,
    "owner_name" VARCHAR(100) NOT NULL,
    "business_type" VARCHAR(120) NOT NULL,
    "industry_line" VARCHAR(120) NOT NULL,
    "region_code" VARCHAR(30) NOT NULL,
    "status_code" VARCHAR(40) NOT NULL,
    "confirmed" BOOLEAN NOT NULL,
    "contract_start_date" DATE NOT NULL,
    "contract_end_date" DATE NOT NULL,
    "wbs_code" VARCHAR(80),
    "payment_term_code" VARCHAR(80),
    "revenue_subtotal" BIGINT NOT NULL,
    "special_discount_type_code" VARCHAR(30) NOT NULL,
    "special_discount_value" DECIMAL(12,2),
    "special_discount_amount" BIGINT NOT NULL,
    "revenue_total" BIGINT NOT NULL,
    "cost_total" BIGINT NOT NULL,
    "external_cost_total" BIGINT NOT NULL,
    "pms_handoff_status_code" VARCHAR(40) NOT NULL,
    "dms_link_status_code" VARCHAR(40) NOT NULL,
    "admin_boundary_code" VARCHAR(40) NOT NULL,
    "next_action" VARCHAR(1000) NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_contract_h_pkey" PRIMARY KEY ("contract_id","history_seq")
);

-- CreateTable
CREATE TABLE "crm"."crm_contract_line_d" (
    "contract_line_id" BIGSERIAL NOT NULL,
    "contract_id" BIGINT NOT NULL,
    "line_code" VARCHAR(80) NOT NULL,
    "line_kind_code" VARCHAR(30) NOT NULL,
    "category_code" VARCHAR(60) NOT NULL,
    "line_label" VARCHAR(300) NOT NULL,
    "quantity" DECIMAL(12,2),
    "unit_price" BIGINT,
    "amount" BIGINT NOT NULL DEFAULT 0,
    "margin_rate" DECIMAL(7,2),
    "trunc_unit" BIGINT,
    "department" VARCHAR(120),
    "member_name" VARCHAR(120),
    "grade" VARCHAR(80),
    "service_type_code" VARCHAR(30),
    "revenue_linked" BOOLEAN NOT NULL DEFAULT false,
    "linked_cost_line_code" VARCHAR(80),
    "revenue_unit_price" BIGINT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_contract_line_d_pkey" PRIMARY KEY ("contract_line_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_contract_billing_plan_d" (
    "contract_billing_plan_id" BIGSERIAL NOT NULL,
    "contract_id" BIGINT NOT NULL,
    "billing_ym" VARCHAR(7) NOT NULL,
    "revenue_amount" BIGINT NOT NULL DEFAULT 0,
    "external_cost_amount" BIGINT NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_contract_billing_plan_d_pkey" PRIMARY KEY ("contract_billing_plan_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_contract_billing_actual_d" (
    "contract_billing_actual_id" BIGSERIAL NOT NULL,
    "contract_id" BIGINT NOT NULL,
    "billing_ym" VARCHAR(7) NOT NULL,
    "revenue_amount" BIGINT NOT NULL DEFAULT 0,
    "external_cost_amount" BIGINT NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_contract_billing_actual_d_pkey" PRIMARY KEY ("contract_billing_actual_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_business_plan_m" (
    "business_plan_id" BIGSERIAL NOT NULL,
    "business_plan_code" VARCHAR(80) NOT NULL,
    "plan_name" VARCHAR(200) NOT NULL,
    "base_year" INTEGER NOT NULL,
    "version_no" INTEGER NOT NULL DEFAULT 1,
    "status_code" VARCHAR(40) NOT NULL DEFAULT 'draft',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "business_type_filter" VARCHAR(120),
    "industry_line_filter" VARCHAR(120),
    "region_filter" VARCHAR(30) NOT NULL DEFAULT 'all',
    "search_filter" VARCHAR(200),
    "pipeline_amount_total" BIGINT NOT NULL DEFAULT 0,
    "contract_plan_amount_total" BIGINT NOT NULL DEFAULT 0,
    "contract_actual_amount_total" BIGINT NOT NULL DEFAULT 0,
    "plan_candidate_amount_total" BIGINT NOT NULL DEFAULT 0,
    "actual_gap_amount_total" BIGINT NOT NULL DEFAULT 0,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_business_plan_m_pkey" PRIMARY KEY ("business_plan_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_business_plan_h" (
    "business_plan_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "business_plan_code" VARCHAR(80) NOT NULL,
    "plan_name" VARCHAR(200) NOT NULL,
    "base_year" INTEGER NOT NULL,
    "version_no" INTEGER NOT NULL,
    "status_code" VARCHAR(40) NOT NULL,
    "confirmed" BOOLEAN NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "business_type_filter" VARCHAR(120),
    "industry_line_filter" VARCHAR(120),
    "region_filter" VARCHAR(30) NOT NULL,
    "search_filter" VARCHAR(200),
    "pipeline_amount_total" BIGINT NOT NULL,
    "contract_plan_amount_total" BIGINT NOT NULL,
    "contract_actual_amount_total" BIGINT NOT NULL,
    "plan_candidate_amount_total" BIGINT NOT NULL,
    "actual_gap_amount_total" BIGINT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_business_plan_h_pkey" PRIMARY KEY ("business_plan_id","history_seq")
);

-- CreateTable
CREATE TABLE "crm"."crm_business_plan_line_d" (
    "business_plan_line_id" BIGSERIAL NOT NULL,
    "business_plan_id" BIGINT NOT NULL,
    "line_code" VARCHAR(80) NOT NULL,
    "target_year" INTEGER NOT NULL,
    "business_type" VARCHAR(120) NOT NULL,
    "industry_line" VARCHAR(120) NOT NULL,
    "owner_name" VARCHAR(100) NOT NULL,
    "region_code" VARCHAR(30) NOT NULL DEFAULT 'domestic',
    "pipeline_amount" BIGINT NOT NULL DEFAULT 0,
    "contract_plan_amount" BIGINT NOT NULL DEFAULT 0,
    "contract_actual_amount" BIGINT NOT NULL DEFAULT 0,
    "plan_candidate_amount" BIGINT NOT NULL DEFAULT 0,
    "plan_monthly_revenue_amounts" JSONB,
    "actual_gap_amount" BIGINT NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_business_plan_line_d_pkey" PRIMARY KEY ("business_plan_line_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_business_plan_performance_actual_d" (
    "business_plan_performance_actual_id" BIGSERIAL NOT NULL,
    "target_year" INTEGER NOT NULL,
    "business_type" VARCHAR(120) NOT NULL,
    "industry_line" VARCHAR(120) NOT NULL,
    "owner_name" VARCHAR(120) NOT NULL,
    "region_code" VARCHAR(20) NOT NULL DEFAULT 'domestic',
    "wbs_code" VARCHAR(120) NOT NULL DEFAULT '',
    "monthly_revenue_amounts" JSONB NOT NULL,
    "monthly_cost_amounts" JSONB NOT NULL,
    "revenue_amount_total" BIGINT NOT NULL DEFAULT 0,
    "cost_amount_total" BIGINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" VARCHAR(100),
    "last_activity" VARCHAR(100),
    "transaction_id" UUID,

    CONSTRAINT "crm_business_plan_performance_actual_d_pkey" PRIMARY KEY ("business_plan_performance_actual_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_report_confirmation_m" (
    "report_confirmation_id" BIGSERIAL NOT NULL,
    "target_year" INTEGER NOT NULL,
    "business_type" VARCHAR(120) NOT NULL DEFAULT '',
    "industry_line" VARCHAR(120) NOT NULL DEFAULT '',
    "region_code" VARCHAR(20) NOT NULL DEFAULT 'all',
    "search_text" VARCHAR(200) NOT NULL DEFAULT '',
    "status_code" VARCHAR(30) NOT NULL DEFAULT 'confirmed',
    "query_snapshot" JSONB NOT NULL,
    "summary_snapshot" JSONB NOT NULL,
    "monthly_trend_snapshot" JSONB NOT NULL,
    "breakdowns_snapshot" JSONB NOT NULL,
    "attention_items_snapshot" JSONB NOT NULL,
    "opportunity_count" INTEGER NOT NULL DEFAULT 0,
    "contract_count" INTEGER NOT NULL DEFAULT 0,
    "breakdown_count" INTEGER NOT NULL DEFAULT 0,
    "attention_item_count" INTEGER NOT NULL DEFAULT 0,
    "pipeline_revenue_total" BIGINT NOT NULL DEFAULT 0,
    "plan_revenue_total" BIGINT NOT NULL DEFAULT 0,
    "actual_revenue_total" BIGINT NOT NULL DEFAULT 0,
    "revenue_delta" BIGINT NOT NULL DEFAULT 0,
    "margin_delta" BIGINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "confirmed_by" BIGINT,
    "confirmed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reopened_by" BIGINT,
    "reopened_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" VARCHAR(100),
    "last_activity" VARCHAR(100),
    "transaction_id" UUID,

    CONSTRAINT "crm_report_confirmation_m_pkey" PRIMARY KEY ("report_confirmation_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_cost_plan_internal_monthly_d" (
    "cost_plan_internal_monthly_id" BIGSERIAL NOT NULL,
    "target_year" INTEGER NOT NULL,
    "business_type" VARCHAR(120) NOT NULL,
    "industry_line" VARCHAR(120) NOT NULL,
    "owner_name" VARCHAR(100) NOT NULL,
    "region_code" VARCHAR(30) NOT NULL DEFAULT 'domestic',
    "wbs_code" VARCHAR(80) NOT NULL DEFAULT '',
    "monthly_plan_amounts" JSONB NOT NULL,
    "monthly_actual_amounts" JSONB NOT NULL,
    "plan_amount_total" BIGINT NOT NULL DEFAULT 0,
    "actual_amount_total" BIGINT NOT NULL DEFAULT 0,
    "gap_amount_total" BIGINT NOT NULL DEFAULT 0,
    "status_code" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" BIGINT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_cost_plan_internal_monthly_d_pkey" PRIMARY KEY ("cost_plan_internal_monthly_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_cost_plan_ams_vendor_wbs_r" (
    "cost_plan_ams_vendor_wbs_mapping_id" BIGSERIAL NOT NULL,
    "target_year" INTEGER NOT NULL,
    "business_type" VARCHAR(120) NOT NULL,
    "industry_line" VARCHAR(120) NOT NULL,
    "owner_name" VARCHAR(100) NOT NULL,
    "region_code" VARCHAR(30) NOT NULL DEFAULT 'domestic',
    "wbs_code" VARCHAR(80) NOT NULL,
    "vendor_name" VARCHAR(200) NOT NULL,
    "vendor_contract_no" VARCHAR(120),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_cost_plan_ams_vendor_wbs_r_pkey" PRIMARY KEY ("cost_plan_ams_vendor_wbs_mapping_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_cost_plan_ams_external_monthly_d" (
    "cost_plan_ams_external_monthly_id" BIGSERIAL NOT NULL,
    "target_year" INTEGER NOT NULL,
    "business_type" VARCHAR(120) NOT NULL,
    "industry_line" VARCHAR(120) NOT NULL,
    "owner_name" VARCHAR(100) NOT NULL,
    "region_code" VARCHAR(30) NOT NULL DEFAULT 'domestic',
    "wbs_code" VARCHAR(80) NOT NULL,
    "vendor_name" VARCHAR(200) NOT NULL,
    "vendor_contract_no" VARCHAR(120),
    "monthly_plan_amounts" JSONB NOT NULL,
    "monthly_actual_amounts" JSONB NOT NULL,
    "plan_amount_total" BIGINT NOT NULL DEFAULT 0,
    "actual_amount_total" BIGINT NOT NULL DEFAULT 0,
    "gap_amount_total" BIGINT NOT NULL DEFAULT 0,
    "status_code" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" BIGINT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_cost_plan_ams_external_monthly_d_pkey" PRIMARY KEY ("cost_plan_ams_external_monthly_id")
);

-- CreateTable
CREATE TABLE "crm"."crm_cost_plan_accounting_handoff_m" (
    "cost_plan_accounting_handoff_id" BIGSERIAL NOT NULL,
    "target_year" INTEGER NOT NULL,
    "business_type_filter" VARCHAR(120) NOT NULL DEFAULT '',
    "industry_line_filter" VARCHAR(120) NOT NULL DEFAULT '',
    "region_filter" VARCHAR(40) NOT NULL DEFAULT 'all',
    "search_filter" VARCHAR(200) NOT NULL DEFAULT '',
    "status_code" VARCHAR(40) NOT NULL DEFAULT 'snapshot-created',
    "line_count" INTEGER NOT NULL DEFAULT 0,
    "settlement_amount_total" BIGINT NOT NULL DEFAULT 0,
    "preview_snapshot" JSONB NOT NULL DEFAULT '{}',
    "lines_snapshot" JSONB NOT NULL DEFAULT '[]',
    "execution_evidence_snapshot" JSONB NOT NULL DEFAULT '[]',
    "execution_evidence_updated_at" TIMESTAMPTZ(6),
    "saved_by" BIGINT,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "crm_cost_plan_accounting_handoff_m_pkey" PRIMARY KEY ("cost_plan_accounting_handoff_id")
);

-- CreateTable
CREATE TABLE "dms"."dm_document_m" (
    "document_id" BIGSERIAL NOT NULL,
    "relative_path" TEXT NOT NULL,
    "visibility_scope" TEXT NOT NULL DEFAULT 'self',
    "target_org_id" BIGINT,
    "owner_user_id" BIGINT NOT NULL,
    "document_status_code" TEXT NOT NULL DEFAULT 'active',
    "sync_status_code" TEXT NOT NULL DEFAULT 'synced',
    "revision_seq" INTEGER NOT NULL DEFAULT 1,
    "content_hash" TEXT NOT NULL,
    "latest_git_commit_hash" TEXT,
    "metadata_jsonb" JSONB,
    "last_scanned_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "last_reconciled_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_document_m_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "dms"."dm_search_query_m" (
    "search_query_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "query" TEXT NOT NULL,
    "normalized_query" TEXT NOT NULL,
    "search_count" INTEGER NOT NULL DEFAULT 1,
    "last_result_count" INTEGER NOT NULL DEFAULT 0,
    "first_searched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_searched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dm_search_query_m_pkey" PRIMARY KEY ("search_query_id")
);

-- CreateTable
CREATE TABLE "dms"."dm_chat_session_m" (
    "chat_session_id" VARCHAR(120) NOT NULL,
    "owner_user_id" BIGINT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "persisted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dm_chat_session_m_pkey" PRIMARY KEY ("chat_session_id")
);

-- CreateTable
CREATE TABLE "dms"."dm_document_h" (
    "document_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "relative_path" TEXT NOT NULL,
    "visibility_scope" TEXT NOT NULL,
    "target_org_id" BIGINT,
    "owner_user_id" BIGINT NOT NULL,
    "document_status_code" TEXT NOT NULL,
    "sync_status_code" TEXT NOT NULL,
    "revision_seq" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "latest_git_commit_hash" TEXT,
    "metadata_jsonb" JSONB,
    "last_scanned_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "last_reconciled_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_document_h_pkey" PRIMARY KEY ("document_id","history_seq")
);

-- CreateTable
CREATE TABLE "dms"."dm_template_m" (
    "template_id" BIGSERIAL NOT NULL,
    "template_key" TEXT NOT NULL,
    "relative_path" TEXT NOT NULL,
    "template_scope_code" TEXT NOT NULL DEFAULT 'personal',
    "template_kind_code" TEXT NOT NULL,
    "owner_ref" TEXT NOT NULL,
    "visibility_code" TEXT NOT NULL DEFAULT 'private',
    "template_status_code" TEXT NOT NULL DEFAULT 'active',
    "source_type_code" TEXT NOT NULL DEFAULT 'markdown-file',
    "origin_type_code" TEXT,
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_template_m_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "dms"."dm_template_h" (
    "template_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "template_key" TEXT NOT NULL,
    "relative_path" TEXT NOT NULL,
    "template_scope_code" TEXT NOT NULL,
    "template_kind_code" TEXT NOT NULL,
    "owner_ref" TEXT NOT NULL,
    "visibility_code" TEXT NOT NULL,
    "template_status_code" TEXT NOT NULL,
    "source_type_code" TEXT NOT NULL,
    "origin_type_code" TEXT,
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_template_h_pkey" PRIMARY KEY ("template_id","history_seq")
);

-- CreateTable
CREATE TABLE "dms"."dm_document_grant_r" (
    "document_grant_id" BIGSERIAL NOT NULL,
    "document_id" BIGINT NOT NULL,
    "principal_type" TEXT NOT NULL,
    "principal_ref" TEXT NOT NULL,
    "role_code" TEXT NOT NULL,
    "grant_source_code" TEXT NOT NULL DEFAULT 'share',
    "granted_from_request_id" BIGINT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by_user_id" BIGINT,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_by_user_id" BIGINT,
    "revoke_reason" TEXT,
    "reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_document_grant_r_pkey" PRIMARY KEY ("document_grant_id")
);

-- CreateTable
CREATE TABLE "dms"."dm_document_grant_h" (
    "document_grant_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "document_id" BIGINT NOT NULL,
    "principal_type" TEXT NOT NULL,
    "principal_ref" TEXT NOT NULL,
    "role_code" TEXT NOT NULL,
    "grant_source_code" TEXT NOT NULL,
    "granted_from_request_id" BIGINT,
    "granted_at" TIMESTAMP(3) NOT NULL,
    "granted_by_user_id" BIGINT,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_by_user_id" BIGINT,
    "revoke_reason" TEXT,
    "reason" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_document_grant_h_pkey" PRIMARY KEY ("document_grant_id","history_seq")
);

-- CreateTable
CREATE TABLE "dms"."dm_document_access_request_m" (
    "access_request_id" BIGSERIAL NOT NULL,
    "document_id" BIGINT NOT NULL,
    "requester_user_id" BIGINT NOT NULL,
    "requested_role" TEXT NOT NULL,
    "status_code" TEXT NOT NULL DEFAULT 'pending',
    "request_message" TEXT,
    "requested_expires_at" TIMESTAMP(3),
    "responded_by_user_id" BIGINT,
    "responded_at" TIMESTAMP(3),
    "response_message" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_document_access_request_m_pkey" PRIMARY KEY ("access_request_id")
);

-- CreateTable
CREATE TABLE "dms"."dm_document_access_request_h" (
    "access_request_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "document_id" BIGINT NOT NULL,
    "requester_user_id" BIGINT NOT NULL,
    "requested_role" TEXT NOT NULL,
    "status_code" TEXT NOT NULL,
    "request_message" TEXT,
    "requested_expires_at" TIMESTAMP(3),
    "responded_by_user_id" BIGINT,
    "responded_at" TIMESTAMP(3),
    "response_message" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_document_access_request_h_pkey" PRIMARY KEY ("access_request_id","history_seq")
);

-- CreateTable
CREATE TABLE "dms"."dm_document_path_history_m" (
    "path_history_id" BIGSERIAL NOT NULL,
    "document_id" BIGINT NOT NULL,
    "relative_path" TEXT NOT NULL,
    "previous_relative_path" TEXT,
    "reason_code" TEXT NOT NULL DEFAULT 'create',
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_user_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_document_path_history_m_pkey" PRIMARY KEY ("path_history_id")
);

-- CreateTable
CREATE TABLE "dms"."dm_document_source_file_m" (
    "source_file_id" BIGSERIAL NOT NULL,
    "document_id" BIGINT NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_path" TEXT NOT NULL,
    "media_type" TEXT,
    "file_size" INTEGER,
    "url" TEXT,
    "storage_uri" TEXT,
    "provider_code" TEXT,
    "version_id" TEXT,
    "etag" TEXT,
    "checksum" TEXT,
    "origin_code" TEXT,
    "status_code" TEXT,
    "storage_mode" TEXT,
    "kind_code" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "projection_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_document_source_file_m_pkey" PRIMARY KEY ("source_file_id")
);

-- CreateTable
CREATE TABLE "dms"."dm_document_source_file_h" (
    "source_file_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "document_id" BIGINT NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_path" TEXT NOT NULL,
    "media_type" TEXT,
    "file_size" INTEGER,
    "url" TEXT,
    "storage_uri" TEXT,
    "provider_code" TEXT,
    "version_id" TEXT,
    "etag" TEXT,
    "checksum" TEXT,
    "origin_code" TEXT,
    "status_code" TEXT,
    "storage_mode" TEXT,
    "kind_code" TEXT,
    "sort_order" INTEGER NOT NULL,
    "projection_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_document_source_file_h_pkey" PRIMARY KEY ("source_file_id","history_seq")
);

-- CreateTable
CREATE TABLE "dms"."dm_document_comment_m" (
    "comment_id" BIGSERIAL NOT NULL,
    "document_id" BIGINT NOT NULL,
    "comment_key" TEXT NOT NULL,
    "parent_comment_key" TEXT,
    "comment_content" TEXT NOT NULL,
    "author_name" VARCHAR(100) NOT NULL,
    "author_email" VARCHAR(255),
    "avatar_url" TEXT,
    "comment_created_at" TIMESTAMPTZ(6) NOT NULL,
    "comment_deleted_at" TIMESTAMPTZ(6),
    "comment_deleted_by" BIGINT,
    "comment_deleted_by_name" VARCHAR(100),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_document_comment_m_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "dms"."dm_document_comment_h" (
    "comment_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "document_id" BIGINT NOT NULL,
    "comment_key" TEXT NOT NULL,
    "parent_comment_key" TEXT,
    "comment_content" TEXT NOT NULL,
    "author_name" VARCHAR(100) NOT NULL,
    "author_email" VARCHAR(255),
    "avatar_url" TEXT,
    "comment_created_at" TIMESTAMPTZ(6) NOT NULL,
    "comment_deleted_at" TIMESTAMPTZ(6),
    "comment_deleted_by" BIGINT,
    "comment_deleted_by_name" VARCHAR(100),
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_document_comment_h_pkey" PRIMARY KEY ("comment_id","history_seq")
);

-- CreateTable
CREATE TABLE "dms"."dm_document_chunk_m" (
    "chunk_id" BIGSERIAL NOT NULL,
    "document_id" BIGINT NOT NULL,
    "chunk_key" TEXT NOT NULL,
    "chunk_seq" INTEGER NOT NULL,
    "chunk_hash" TEXT NOT NULL,
    "chunk_text" TEXT NOT NULL,
    "token_count" INTEGER,
    "char_start" INTEGER,
    "char_end" INTEGER,
    "chunk_status_code" TEXT NOT NULL DEFAULT 'pending',
    "indexed_at" TIMESTAMP(3),
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_document_chunk_m_pkey" PRIMARY KEY ("chunk_id")
);

-- CreateTable
CREATE TABLE "dms"."dm_document_index_state_m" (
    "index_state_id" BIGSERIAL NOT NULL,
    "document_id" BIGINT NOT NULL,
    "index_status_code" TEXT NOT NULL DEFAULT 'pending',
    "index_provider" TEXT,
    "embedding_model" TEXT,
    "embedding_dimension" INTEGER,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "indexed_chunk_count" INTEGER NOT NULL DEFAULT 0,
    "last_indexed_revision_seq" INTEGER,
    "last_requested_at" TIMESTAMP(3),
    "last_indexed_at" TIMESTAMP(3),
    "last_failed_at" TIMESTAMP(3),
    "last_error_message" TEXT,
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_document_index_state_m_pkey" PRIMARY KEY ("index_state_id")
);

-- CreateTable
CREATE TABLE "dms"."dm_document_index_state_h" (
    "index_state_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "document_id" BIGINT NOT NULL,
    "index_status_code" TEXT NOT NULL,
    "index_provider" TEXT,
    "embedding_model" TEXT,
    "embedding_dimension" INTEGER,
    "chunk_count" INTEGER NOT NULL,
    "indexed_chunk_count" INTEGER NOT NULL,
    "last_indexed_revision_seq" INTEGER,
    "last_requested_at" TIMESTAMP(3),
    "last_indexed_at" TIMESTAMP(3),
    "last_failed_at" TIMESTAMP(3),
    "last_error_message" TEXT,
    "metadata_jsonb" JSONB,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_document_index_state_h_pkey" PRIMARY KEY ("index_state_id","history_seq")
);

-- CreateTable
CREATE TABLE "dms"."dm_config_m" (
    "config_id" BIGSERIAL NOT NULL,
    "scope_code" VARCHAR(20) NOT NULL,
    "owner_ref" VARCHAR(100) NOT NULL DEFAULT '_system_',
    "config_data" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "dm_config_m_pkey" PRIMARY KEY ("config_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_board_m" (
    "board_id" BIGSERIAL NOT NULL,
    "board_code" VARCHAR(50) NOT NULL,
    "board_name" VARCHAR(200) NOT NULL,
    "board_type" VARCHAR(50) NOT NULL,
    "description" VARCHAR(1000),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "sns_board_m_pkey" PRIMARY KEY ("board_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_board_h" (
    "board_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "board_code" VARCHAR(50) NOT NULL,
    "board_name" VARCHAR(200) NOT NULL,
    "board_type" VARCHAR(50) NOT NULL,
    "description" VARCHAR(1000),
    "sort_order" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "sns_board_h_pkey" PRIMARY KEY ("board_id","history_seq")
);

-- CreateTable
CREATE TABLE "sns"."sns_board_category_m" (
    "category_id" BIGSERIAL NOT NULL,
    "board_id" BIGINT NOT NULL,
    "category_name" VARCHAR(200) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "sns_board_category_m_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_post_m" (
    "post_id" BIGSERIAL NOT NULL,
    "author_user_id" BIGINT NOT NULL,
    "board_id" BIGINT,
    "category_id" BIGINT,
    "title" VARCHAR(500),
    "content" TEXT NOT NULL,
    "content_type" VARCHAR(30) NOT NULL DEFAULT 'text',
    "visibility_scope_code" VARCHAR(30) NOT NULL DEFAULT 'public',
    "target_org_id" BIGINT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "sns_post_m_pkey" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_post_h" (
    "post_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "author_user_id" BIGINT NOT NULL,
    "board_id" BIGINT,
    "category_id" BIGINT,
    "title" VARCHAR(500),
    "content" TEXT NOT NULL,
    "content_type" VARCHAR(30) NOT NULL,
    "visibility_scope_code" VARCHAR(30) NOT NULL,
    "target_org_id" BIGINT,
    "is_pinned" BOOLEAN NOT NULL,
    "view_count" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "sns_post_h_pkey" PRIMARY KEY ("post_id","history_seq")
);

-- CreateTable
CREATE TABLE "sns"."sns_comment_m" (
    "comment_id" BIGSERIAL NOT NULL,
    "post_id" BIGINT NOT NULL,
    "author_user_id" BIGINT NOT NULL,
    "parent_comment_id" BIGINT,
    "content" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "sns_comment_m_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_comment_h" (
    "comment_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "post_id" BIGINT NOT NULL,
    "author_user_id" BIGINT NOT NULL,
    "parent_comment_id" BIGINT,
    "content" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "sns_comment_h_pkey" PRIMARY KEY ("comment_id","history_seq")
);

-- CreateTable
CREATE TABLE "sns"."sns_reaction_m" (
    "reaction_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "post_id" BIGINT,
    "comment_id" BIGINT,
    "reaction_type" VARCHAR(30) NOT NULL DEFAULT 'like',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sns_reaction_m_pkey" PRIMARY KEY ("reaction_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_tag_m" (
    "tag_id" BIGSERIAL NOT NULL,
    "tag_name" VARCHAR(100) NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sns_tag_m_pkey" PRIMARY KEY ("tag_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_post_tag_r" (
    "post_id" BIGINT NOT NULL,
    "tag_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sns_post_tag_r_pkey" PRIMARY KEY ("post_id","tag_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_mention_m" (
    "mention_id" BIGSERIAL NOT NULL,
    "mentioned_user_id" BIGINT NOT NULL,
    "post_id" BIGINT,
    "comment_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sns_mention_m_pkey" PRIMARY KEY ("mention_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_attachment_m" (
    "attachment_id" BIGSERIAL NOT NULL,
    "post_id" BIGINT NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "file_path" VARCHAR(1000) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "mime_type" VARCHAR(200) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sns_attachment_m_pkey" PRIMARY KEY ("attachment_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_user_profile_m" (
    "profile_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "bio" VARCHAR(2000),
    "cover_image_url" VARCHAR(1000),
    "linkedin_url" VARCHAR(500),
    "website_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "sns_user_profile_m_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_user_profile_h" (
    "profile_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "user_id" BIGINT NOT NULL,
    "bio" VARCHAR(2000),
    "cover_image_url" VARCHAR(1000),
    "linkedin_url" VARCHAR(500),
    "website_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "sns_user_profile_h_pkey" PRIMARY KEY ("profile_id","history_seq")
);

-- CreateTable
CREATE TABLE "sns"."sns_skill_m" (
    "skill_id" BIGSERIAL NOT NULL,
    "skill_name" VARCHAR(200) NOT NULL,
    "skill_category" VARCHAR(100) NOT NULL,
    "parent_skill_id" BIGINT,
    "description" VARCHAR(1000),
    "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "sns_skill_m_pkey" PRIMARY KEY ("skill_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_user_skill_r" (
    "user_skill_id" BIGSERIAL NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "skill_id" BIGINT NOT NULL,
    "proficiency_level" INTEGER NOT NULL DEFAULT 1,
    "years_of_experience" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sns_user_skill_r_pkey" PRIMARY KEY ("user_skill_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_user_career_m" (
    "career_id" BIGSERIAL NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "project_id" BIGINT,
    "company_name" VARCHAR(200),
    "project_name" VARCHAR(300) NOT NULL,
    "role_name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(2000),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "sns_user_career_m_pkey" PRIMARY KEY ("career_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_endorsement_m" (
    "endorsement_id" BIGSERIAL NOT NULL,
    "endorser_user_id" BIGINT NOT NULL,
    "endorsee_profile_id" BIGINT NOT NULL,
    "user_skill_id" BIGINT NOT NULL,
    "skill_id" BIGINT NOT NULL,
    "comment" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sns_endorsement_m_pkey" PRIMARY KEY ("endorsement_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_follow_r" (
    "follow_id" BIGSERIAL NOT NULL,
    "follower_user_id" BIGINT NOT NULL,
    "following_user_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sns_follow_r_pkey" PRIMARY KEY ("follow_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_bookmark_m" (
    "bookmark_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "post_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sns_bookmark_m_pkey" PRIMARY KEY ("bookmark_id")
);

-- CreateTable
CREATE TABLE "sns"."sns_notification_m" (
    "notification_id" BIGSERIAL NOT NULL,
    "recipient_user_id" BIGINT NOT NULL,
    "actor_user_id" BIGINT NOT NULL,
    "notification_type" VARCHAR(50) NOT NULL,
    "reference_type" VARCHAR(30) NOT NULL,
    "reference_id" BIGINT NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sns_notification_m_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
CREATE INDEX "ix_cm_code_m_group" ON "pms"."cm_code_m"("code_group");

-- CreateIndex
CREATE INDEX "ix_cm_code_m_active" ON "pms"."cm_code_m"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "cm_code_m_code_group_code_value_key" ON "pms"."cm_code_m"("code_group", "code_value");

-- CreateIndex
CREATE INDEX "ix_cm_code_h_event_at" ON "pms"."cm_code_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_code_h_tx" ON "pms"."cm_code_h"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "cm_menu_m_menu_code_key" ON "pms"."cm_menu_m"("menu_code");

-- CreateIndex
CREATE INDEX "ix_cm_menu_m_parent" ON "pms"."cm_menu_m"("parent_menu_id");

-- CreateIndex
CREATE INDEX "ix_cm_menu_m_level_order" ON "pms"."cm_menu_m"("menu_level", "sort_order");

-- CreateIndex
CREATE INDEX "ix_cm_menu_m_active" ON "pms"."cm_menu_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_cm_menu_h_event_at" ON "pms"."cm_menu_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_menu_h_tx" ON "pms"."cm_menu_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_role_menu_r_menu" ON "pms"."cm_role_menu_r"("menu_id");

-- CreateIndex
CREATE INDEX "ix_cm_role_menu_r_role" ON "pms"."cm_role_menu_r"("role_code");

-- CreateIndex
CREATE UNIQUE INDEX "cm_role_menu_r_role_code_menu_id_key" ON "pms"."cm_role_menu_r"("role_code", "menu_id");

-- CreateIndex
CREATE INDEX "ix_cm_role_menu_h_event_at" ON "pms"."cm_role_menu_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_role_menu_h_tx" ON "pms"."cm_role_menu_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_menu_r_user" ON "pms"."cm_user_menu_r"("user_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_menu_r_expires" ON "pms"."cm_user_menu_r"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "cm_user_menu_r_user_id_menu_id_key" ON "pms"."cm_user_menu_r"("user_id", "menu_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_menu_h_event_at" ON "pms"."cm_user_menu_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_menu_h_tx" ON "pms"."cm_user_menu_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_favorite_r_user" ON "pms"."cm_user_favorite_r"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cm_user_favorite_r_user_id_menu_id_key" ON "pms"."cm_user_favorite_r"("user_id", "menu_id");

-- CreateIndex
CREATE UNIQUE INDEX "cm_user_m_email_key" ON "common"."cm_user_m"("email");

-- CreateIndex
CREATE INDEX "ix_cm_notification_m_recipient_read" ON "common"."cm_notification_m"("recipient_user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "ix_cm_notification_m_source_type" ON "common"."cm_notification_m"("source_app_code", "notification_type", "created_at");

-- CreateIndex
CREATE INDEX "ix_cm_notification_m_actor" ON "common"."cm_notification_m"("actor_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cm_notification_m_recipient_user_id_dedupe_key_key" ON "common"."cm_notification_m"("recipient_user_id", "dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "cm_ai_source_m_source_app_code_key" ON "common"."cm_ai_source_m"("source_app_code");

-- CreateIndex
CREATE INDEX "ix_cm_ai_source_m_status_active" ON "common"."cm_ai_source_m"("source_status_code", "is_active");

-- CreateIndex
CREATE INDEX "ix_cm_ai_source_h_event_at" ON "common"."cm_ai_source_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_ai_source_h_tx" ON "common"."cm_ai_source_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_ai_object_m_source_updated" ON "common"."cm_ai_object_m"("ai_source_id", "updated_at");

-- CreateIndex
CREATE INDEX "ix_cm_ai_object_m_app_entity_type" ON "common"."cm_ai_object_m"("source_app_code", "entity_type_code");

-- CreateIndex
CREATE INDEX "ix_cm_ai_object_m_sensitivity_context" ON "common"."cm_ai_object_m"("sensitivity_code", "context_eligible");

-- CreateIndex
CREATE UNIQUE INDEX "cm_ai_object_m_source_app_code_entity_type_code_entity_id_key" ON "common"."cm_ai_object_m"("source_app_code", "entity_type_code", "entity_id");

-- CreateIndex
CREATE INDEX "ix_cm_ai_object_h_event_at" ON "common"."cm_ai_object_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_ai_object_h_tx" ON "common"."cm_ai_object_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_ai_chunk_m_object_active" ON "common"."cm_ai_chunk_m"("ai_object_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "cm_ai_chunk_m_ai_object_id_chunk_seq_key" ON "common"."cm_ai_chunk_m"("ai_object_id", "chunk_seq");

-- CreateIndex
CREATE UNIQUE INDEX "cm_ai_chunk_m_ai_object_id_chunk_key_key" ON "common"."cm_ai_chunk_m"("ai_object_id", "chunk_key");

-- CreateIndex
CREATE INDEX "ix_cm_ai_embedding_m_profile_model" ON "common"."cm_ai_embedding_m"("profile_code", "provider_code", "model_name");

-- CreateIndex
CREATE UNIQUE INDEX "cm_ai_embedding_m_ai_chunk_id_profile_code_key" ON "common"."cm_ai_embedding_m"("ai_chunk_id", "profile_code");

-- CreateIndex
CREATE INDEX "ix_cm_ai_acl_snapshot_m_object_active" ON "common"."cm_ai_acl_snapshot_m"("ai_object_id", "is_active");

-- CreateIndex
CREATE INDEX "ix_cm_ai_acl_snapshot_m_scope" ON "common"."cm_ai_acl_snapshot_m"("access_scope_code", "sensitivity_code");

-- CreateIndex
CREATE INDEX "ix_cm_ai_index_job_m_status_priority" ON "common"."cm_ai_index_job_m"("job_status_code", "priority_no", "requested_at");

-- CreateIndex
CREATE INDEX "ix_cm_ai_index_job_m_entity" ON "common"."cm_ai_index_job_m"("source_app_code", "entity_type_code", "entity_id");

-- CreateIndex
CREATE INDEX "ix_cm_ai_index_job_m_source_status" ON "common"."cm_ai_index_job_m"("ai_source_id", "job_status_code");

-- CreateIndex
CREATE INDEX "ix_cm_ai_index_job_m_object" ON "common"."cm_ai_index_job_m"("ai_object_id");

-- CreateIndex
CREATE INDEX "ix_cm_ai_index_state_m_source_status" ON "common"."cm_ai_index_state_m"("ai_source_id", "index_status_code");

-- CreateIndex
CREATE INDEX "ix_cm_ai_index_state_m_last_indexed_at" ON "common"."cm_ai_index_state_m"("last_indexed_at");

-- CreateIndex
CREATE UNIQUE INDEX "cm_ai_index_state_m_ai_object_id_profile_code_key" ON "common"."cm_ai_index_state_m"("ai_object_id", "profile_code");

-- CreateIndex
CREATE INDEX "ix_cm_ai_index_state_h_event_at" ON "common"."cm_ai_index_state_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_ai_index_state_h_tx" ON "common"."cm_ai_index_state_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_ai_retrieval_log_m_source_created" ON "common"."cm_ai_retrieval_log_m"("source_app_code", "created_at");

-- CreateIndex
CREATE INDEX "ix_cm_ai_retrieval_log_m_user_created" ON "common"."cm_ai_retrieval_log_m"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_cm_ai_retrieval_log_item_m_log_rank" ON "common"."cm_ai_retrieval_log_item_m"("ai_retrieval_log_id", "rank_no");

-- CreateIndex
CREATE INDEX "ix_cm_ai_retrieval_log_item_m_object" ON "common"."cm_ai_retrieval_log_item_m"("ai_object_id");

-- CreateIndex
CREATE INDEX "ix_cm_ai_conversation_m_owner_updated" ON "common"."cm_ai_conversation_m"("owner_user_id", "updated_at");

-- CreateIndex
CREATE INDEX "ix_cm_ai_conversation_m_source_status" ON "common"."cm_ai_conversation_m"("source_app_code", "conversation_status_code");

-- CreateIndex
CREATE INDEX "ix_cm_ai_message_m_conversation_created" ON "common"."cm_ai_message_m"("ai_conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cm_ai_message_m_ai_conversation_id_message_seq_key" ON "common"."cm_ai_message_m"("ai_conversation_id", "message_seq");

-- CreateIndex
CREATE INDEX "ix_cm_ai_reference_m_conversation_created" ON "common"."cm_ai_reference_m"("ai_conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_cm_ai_reference_m_object" ON "common"."cm_ai_reference_m"("ai_object_id");

-- CreateIndex
CREATE INDEX "ix_cm_ai_run_m_conversation_created" ON "common"."cm_ai_run_m"("ai_conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_cm_ai_run_m_status_created" ON "common"."cm_ai_run_m"("run_status_code", "created_at");

-- CreateIndex
CREATE INDEX "ix_cm_ai_run_source_r_run_rank" ON "common"."cm_ai_run_source_r"("ai_run_id", "rank_no");

-- CreateIndex
CREATE INDEX "ix_cm_ai_run_source_r_object" ON "common"."cm_ai_run_source_r"("ai_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "cm_user_auth_m_login_id_key" ON "common"."cm_user_auth_m"("login_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_session_m_user" ON "common"."cm_user_session_m"("user_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_session_m_expires_at" ON "common"."cm_user_session_m"("expires_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_invitation_m_user" ON "common"."cm_user_invitation_m"("user_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_invitation_m_expires_at" ON "common"."cm_user_invitation_m"("expires_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_external_identity_m_user" ON "common"."cm_user_external_identity_m"("user_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_external_identity_m_email" ON "common"."cm_user_external_identity_m"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cm_user_external_identity_m_provider_code_tenant_id_subject_key" ON "common"."cm_user_external_identity_m"("provider_code", "tenant_id", "subject_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_registration_request_m_status_requested" ON "common"."cm_user_registration_request_m"("status_code", "requested_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_registration_request_m_email" ON "common"."cm_user_registration_request_m"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cm_user_registration_request_m_provider_code_tenant_id_subj_key" ON "common"."cm_user_registration_request_m"("provider_code", "tenant_id", "subject_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_password_reset_challenge_m_user_expires" ON "common"."cm_user_password_reset_challenge_m"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_password_reset_challenge_m_email_created" ON "common"."cm_user_password_reset_challenge_m"("email", "created_at");

-- CreateIndex
CREATE INDEX "ix_cm_auth_email_outbox_m_status_created" ON "common"."cm_auth_email_outbox_m"("status_code", "created_at");

-- CreateIndex
CREATE INDEX "ix_cm_auth_email_outbox_m_reference" ON "common"."cm_auth_email_outbox_m"("reference_type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "cm_organization_m_org_code_key" ON "common"."cm_organization_m"("org_code");

-- CreateIndex
CREATE INDEX "ix_cm_organization_m_org_type" ON "common"."cm_organization_m"("org_type");

-- CreateIndex
CREATE INDEX "ix_cm_organization_m_org_class" ON "common"."cm_organization_m"("org_class");

-- CreateIndex
CREATE INDEX "ix_cm_organization_m_scope" ON "common"."cm_organization_m"("scope");

-- CreateIndex
CREATE INDEX "ix_cm_organization_m_parent" ON "common"."cm_organization_m"("parent_org_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_org_r_user" ON "common"."cm_user_org_r"("user_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_org_r_org" ON "common"."cm_user_org_r"("org_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_org_r_user_org_active" ON "common"."cm_user_org_r"("user_id", "org_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "cm_permission_m_permission_code_key" ON "common"."cm_permission_m"("permission_code");

-- CreateIndex
CREATE INDEX "ix_cm_permission_m_domain" ON "common"."cm_permission_m"("domain_code");

-- CreateIndex
CREATE INDEX "ix_cm_permission_m_axis" ON "common"."cm_permission_m"("permission_axis");

-- CreateIndex
CREATE UNIQUE INDEX "cm_role_m_role_code_key" ON "common"."cm_role_m"("role_code");

-- CreateIndex
CREATE INDEX "ix_cm_role_m_scope" ON "common"."cm_role_m"("role_scope_code");

-- CreateIndex
CREATE INDEX "ix_cm_role_permission_r_permission" ON "common"."cm_role_permission_r"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "cm_role_permission_r_role_id_permission_id_key" ON "common"."cm_role_permission_r"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "ix_cm_org_permission_r_permission" ON "common"."cm_org_permission_r"("permission_id");

-- CreateIndex
CREATE INDEX "ix_cm_org_permission_r_effective_to" ON "common"."cm_org_permission_r"("effective_to");

-- CreateIndex
CREATE UNIQUE INDEX "cm_org_permission_r_org_id_permission_id_key" ON "common"."cm_org_permission_r"("org_id", "permission_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_permission_exception_r_user" ON "common"."cm_user_permission_exception_r"("user_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_permission_exception_r_permission" ON "common"."cm_user_permission_exception_r"("permission_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_permission_exception_r_target_org" ON "common"."cm_user_permission_exception_r"("target_org_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_permission_exception_r_expires_at" ON "common"."cm_user_permission_exception_r"("expires_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_permission_exception_r_object" ON "common"."cm_user_permission_exception_r"("target_object_type", "target_object_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_m_status_stage" ON "pms"."pr_project_m"("status_code", "stage_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_m_owner" ON "pms"."pr_project_m"("current_owner_user_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_m_owner_org" ON "pms"."pr_project_m"("owner_organization_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_m_customer" ON "pms"."pr_project_m"("customer_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_m_system_instance" ON "pms"."pr_project_m"("system_instance_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_m_handoff" ON "pms"."pr_project_m"("handoff_status_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_m_updated_at" ON "pms"."pr_project_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_status_m_owner" ON "pms"."pr_project_status_m"("status_owner_user_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_status_m_dates" ON "pms"."pr_project_status_m"("expected_start_at", "expected_end_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_status_m_updated_at" ON "pms"."pr_project_status_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_request_d_owner" ON "pms"."pr_project_request_d"("request_owner_user_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_proposal_d_owner" ON "pms"."pr_project_proposal_d"("proposal_owner_user_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_proposal_d_due" ON "pms"."pr_project_proposal_d"("proposal_due_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_execution_d_next_project" ON "pms"."pr_project_execution_d"("next_project_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_transition_d_owner" ON "pms"."pr_project_transition_d"("operation_owner_user_id");

-- CreateIndex
CREATE INDEX "ix_pr_handoff_m_project_status" ON "pms"."pr_handoff_m"("project_id", "handoff_status_code");

-- CreateIndex
CREATE INDEX "ix_pr_handoff_m_project_requested_at" ON "pms"."pr_handoff_m"("project_id", "requested_at");

-- CreateIndex
CREATE INDEX "ix_pr_handoff_m_to_phase" ON "pms"."pr_handoff_m"("to_phase_code");

-- CreateIndex
CREATE INDEX "ix_pr_contract_m_project_status" ON "pms"."pr_contract_m"("project_id", "contract_status_code");

-- CreateIndex
CREATE INDEX "ix_pr_contract_m_manager" ON "pms"."pr_contract_m"("manager_user_id");

-- CreateIndex
CREATE INDEX "ix_pr_contract_m_primary" ON "pms"."pr_contract_m"("is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "pr_contract_m_project_id_contract_code_key" ON "pms"."pr_contract_m"("project_id", "contract_code");

-- CreateIndex
CREATE INDEX "ix_pr_contract_payment_m_contract_status" ON "pms"."pr_contract_payment_m"("contract_id", "payment_status_code");

-- CreateIndex
CREATE INDEX "ix_pr_contract_payment_m_due_date" ON "pms"."pr_contract_payment_m"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "pr_deliverable_m_deliverable_code_key" ON "pms"."pr_deliverable_m"("deliverable_code");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_m_active" ON "pms"."pr_deliverable_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_m_sort" ON "pms"."pr_deliverable_m"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "pr_deliverable_group_m_group_code_key" ON "pms"."pr_deliverable_group_m"("group_code");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_m_active" ON "pms"."pr_deliverable_group_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_m_sort" ON "pms"."pr_deliverable_group_m"("sort_order");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_item_r_m_active" ON "pms"."pr_deliverable_group_item_r_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_item_r_m_deliverable" ON "pms"."pr_deliverable_group_item_r_m"("deliverable_code");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_item_r_m_sort" ON "pms"."pr_deliverable_group_item_r_m"("group_code", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "pr_close_condition_group_m_group_code_key" ON "pms"."pr_close_condition_group_m"("group_code");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_m_active" ON "pms"."pr_close_condition_group_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_m_sort" ON "pms"."pr_close_condition_group_m"("sort_order");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_item_r_m_active" ON "pms"."pr_close_condition_group_item_r_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_item_r_m_condition" ON "pms"."pr_close_condition_group_item_r_m"("condition_code");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_item_r_m_sort" ON "pms"."pr_close_condition_group_item_r_m"("group_code", "sort_order");

-- CreateIndex
CREATE INDEX "ix_pr_project_deliverable_r_m_status" ON "pms"."pr_project_deliverable_r_m"("project_id", "status_code", "submission_status_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_deliverable_r_m_deliverable" ON "pms"."pr_project_deliverable_r_m"("deliverable_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_deliverable_r_m_event" ON "pms"."pr_project_deliverable_r_m"("event_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_deliverable_r_m_updated_at" ON "pms"."pr_project_deliverable_r_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_close_condition_r_m_checked" ON "pms"."pr_project_close_condition_r_m"("project_id", "status_code", "is_checked");

-- CreateIndex
CREATE INDEX "ix_pr_project_close_condition_r_m_condition" ON "pms"."pr_project_close_condition_r_m"("condition_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_close_condition_r_m_event" ON "pms"."pr_project_close_condition_r_m"("event_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_close_condition_r_m_updated_at" ON "pms"."pr_project_close_condition_r_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_closeout_approval_step_m_sequence" ON "pms"."pr_project_closeout_approval_step_m"("project_id", "status_code", "target_type_code", "target_code", "sequence_no");

-- CreateIndex
CREATE INDEX "ix_pr_project_closeout_approval_step_m_target" ON "pms"."pr_project_closeout_approval_step_m"("project_id", "status_code", "target_type_code", "target_code", "is_active");

-- CreateIndex
CREATE INDEX "ix_pr_project_closeout_approval_step_m_approver" ON "pms"."pr_project_closeout_approval_step_m"("approver_user_id", "approval_status_code", "is_active");

-- CreateIndex
CREATE INDEX "ix_pr_project_closeout_approval_step_m_updated_at" ON "pms"."pr_project_closeout_approval_step_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_member_r_m_role" ON "pms"."pr_project_member_r_m"("project_id", "role_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_member_r_m_access" ON "pms"."pr_project_member_r_m"("project_id", "access_level");

-- CreateIndex
CREATE INDEX "ix_pr_project_member_r_m_phase_owner" ON "pms"."pr_project_member_r_m"("project_id", "is_phase_owner");

-- CreateIndex
CREATE INDEX "ix_pr_project_member_r_m_org" ON "pms"."pr_project_member_r_m"("organization_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_member_r_m_user" ON "pms"."pr_project_member_r_m"("user_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_member_r_m_updated_at" ON "pms"."pr_project_member_r_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_org_r_m_role" ON "pms"."pr_project_org_r_m"("project_id", "role_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_org_r_m_org" ON "pms"."pr_project_org_r_m"("organization_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_org_r_m_updated_at" ON "pms"."pr_project_org_r_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_relation_r_m_source" ON "pms"."pr_project_relation_r_m"("source_project_id", "relation_type_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_relation_r_m_target" ON "pms"."pr_project_relation_r_m"("target_project_id", "relation_type_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_relation_r_m_updated_at" ON "pms"."pr_project_relation_r_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_role_permission_r_role" ON "pms"."pr_project_role_permission_r"("role_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_role_permission_r_permission" ON "pms"."pr_project_role_permission_r"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "pr_project_role_permission_r_role_code_permission_id_key" ON "pms"."pr_project_role_permission_r"("role_code", "permission_id");

-- CreateIndex
CREATE INDEX "ix_pr_objective_m_project_status" ON "pms"."pr_objective_m"("project_id", "status_code");

-- CreateIndex
CREATE INDEX "ix_pr_objective_m_hierarchy" ON "pms"."pr_objective_m"("project_id", "parent_objective_id");

-- CreateIndex
CREATE INDEX "ix_pr_objective_m_due_at" ON "pms"."pr_objective_m"("due_at");

-- CreateIndex
CREATE INDEX "ix_pr_objective_m_updated_at" ON "pms"."pr_objective_m"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "pr_objective_m_project_id_objective_code_key" ON "pms"."pr_objective_m"("project_id", "objective_code");

-- CreateIndex
CREATE INDEX "ix_pr_wbs_m_project_status" ON "pms"."pr_wbs_m"("project_id", "status_code");

-- CreateIndex
CREATE INDEX "ix_pr_wbs_m_hierarchy" ON "pms"."pr_wbs_m"("project_id", "parent_wbs_id");

-- CreateIndex
CREATE INDEX "ix_pr_wbs_m_objective" ON "pms"."pr_wbs_m"("objective_id");

-- CreateIndex
CREATE INDEX "ix_pr_wbs_m_updated_at" ON "pms"."pr_wbs_m"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "pr_wbs_m_project_id_wbs_code_key" ON "pms"."pr_wbs_m"("project_id", "wbs_code");

-- CreateIndex
CREATE INDEX "ix_pr_task_m_project_status" ON "pms"."pr_task_m"("project_id", "status_code");

-- CreateIndex
CREATE INDEX "ix_pr_task_m_hierarchy" ON "pms"."pr_task_m"("project_id", "parent_task_id");

-- CreateIndex
CREATE INDEX "ix_pr_task_m_wbs" ON "pms"."pr_task_m"("wbs_id");

-- CreateIndex
CREATE INDEX "ix_pr_task_m_assignee" ON "pms"."pr_task_m"("assignee_user_id");

-- CreateIndex
CREATE INDEX "ix_pr_task_m_updated_at" ON "pms"."pr_task_m"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "pr_task_m_project_id_task_code_key" ON "pms"."pr_task_m"("project_id", "task_code");

-- CreateIndex
CREATE INDEX "ix_pr_task_effort_log_m_project_date" ON "pms"."pr_task_effort_log_m"("project_id", "work_date");

-- CreateIndex
CREATE INDEX "ix_pr_task_effort_log_m_task_date" ON "pms"."pr_task_effort_log_m"("task_id", "work_date");

-- CreateIndex
CREATE INDEX "ix_pr_task_effort_log_m_user_date" ON "pms"."pr_task_effort_log_m"("user_id", "work_date");

-- CreateIndex
CREATE INDEX "ix_pr_task_effort_log_m_updated_at" ON "pms"."pr_task_effort_log_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_pr_milestone_m_project_status" ON "pms"."pr_milestone_m"("project_id", "status_code");

-- CreateIndex
CREATE INDEX "ix_pr_milestone_m_objective" ON "pms"."pr_milestone_m"("objective_id");

-- CreateIndex
CREATE INDEX "ix_pr_milestone_m_due_at" ON "pms"."pr_milestone_m"("due_at");

-- CreateIndex
CREATE INDEX "ix_pr_milestone_m_updated_at" ON "pms"."pr_milestone_m"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "pr_milestone_m_project_id_milestone_code_key" ON "pms"."pr_milestone_m"("project_id", "milestone_code");

-- CreateIndex
CREATE INDEX "ix_pr_issue_m_project_status" ON "pms"."pr_issue_m"("project_id", "status_code");

-- CreateIndex
CREATE INDEX "ix_pr_issue_m_project_type" ON "pms"."pr_issue_m"("project_id", "issue_type_code");

-- CreateIndex
CREATE INDEX "ix_pr_issue_m_assignee" ON "pms"."pr_issue_m"("assignee_user_id");

-- CreateIndex
CREATE INDEX "ix_pr_issue_m_updated_at" ON "pms"."pr_issue_m"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "pr_issue_m_project_id_issue_code_key" ON "pms"."pr_issue_m"("project_id", "issue_code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_pr_legacy_issue_archive_m_source_issue" ON "pms"."pr_legacy_issue_archive_m"("source_issue_id");

-- CreateIndex
CREATE INDEX "ix_pr_legacy_issue_archive_m_project_archived" ON "pms"."pr_legacy_issue_archive_m"("project_id", "archived_at");

-- CreateIndex
CREATE INDEX "ix_pr_legacy_issue_archive_m_reason" ON "pms"."pr_legacy_issue_archive_m"("archived_reason_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_issue_m_project_status" ON "pms"."pr_project_issue_m"("project_id", "status_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_issue_m_project_type" ON "pms"."pr_project_issue_m"("project_id", "issue_type_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_issue_m_owner" ON "pms"."pr_project_issue_m"("owner_user_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_issue_m_updated_at" ON "pms"."pr_project_issue_m"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "pr_project_issue_m_project_id_issue_code_key" ON "pms"."pr_project_issue_m"("project_id", "issue_code");

-- CreateIndex
CREATE INDEX "ix_pr_requirement_m_project_status" ON "pms"."pr_requirement_m"("project_id", "status_code");

-- CreateIndex
CREATE INDEX "ix_pr_requirement_m_project_priority" ON "pms"."pr_requirement_m"("project_id", "priority_code");

-- CreateIndex
CREATE INDEX "ix_pr_requirement_m_updated_at" ON "pms"."pr_requirement_m"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "pr_requirement_m_project_id_requirement_code_key" ON "pms"."pr_requirement_m"("project_id", "requirement_code");

-- CreateIndex
CREATE INDEX "ix_pr_risk_m_project_status" ON "pms"."pr_risk_m"("project_id", "status_code");

-- CreateIndex
CREATE INDEX "ix_pr_risk_m_project_impact" ON "pms"."pr_risk_m"("project_id", "impact_code");

-- CreateIndex
CREATE INDEX "ix_pr_risk_m_updated_at" ON "pms"."pr_risk_m"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "pr_risk_m_project_id_risk_code_key" ON "pms"."pr_risk_m"("project_id", "risk_code");

-- CreateIndex
CREATE INDEX "ix_pr_change_request_m_project_status" ON "pms"."pr_change_request_m"("project_id", "status_code");

-- CreateIndex
CREATE INDEX "ix_pr_change_request_m_project_priority" ON "pms"."pr_change_request_m"("project_id", "priority_code");

-- CreateIndex
CREATE INDEX "ix_pr_change_request_m_updated_at" ON "pms"."pr_change_request_m"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "pr_change_request_m_project_id_change_code_key" ON "pms"."pr_change_request_m"("project_id", "change_code");

-- CreateIndex
CREATE INDEX "ix_pr_event_m_project_status" ON "pms"."pr_event_m"("project_id", "status_code");

-- CreateIndex
CREATE INDEX "ix_pr_event_m_project_type" ON "pms"."pr_event_m"("project_id", "event_type_code");

-- CreateIndex
CREATE INDEX "ix_pr_event_m_updated_at" ON "pms"."pr_event_m"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "pr_event_m_project_id_event_code_key" ON "pms"."pr_event_m"("project_id", "event_code");

-- CreateIndex
CREATE INDEX "ix_cm_user_h_event_at" ON "common"."cm_user_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_h_tx" ON "common"."cm_user_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_notification_h_event_at" ON "common"."cm_notification_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_notification_h_tx" ON "common"."cm_notification_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_auth_h_event_at" ON "common"."cm_user_auth_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_auth_h_tx" ON "common"."cm_user_auth_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_session_h_event_at" ON "common"."cm_user_session_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_session_h_tx" ON "common"."cm_user_session_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_invitation_h_event_at" ON "common"."cm_user_invitation_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_invitation_h_tx" ON "common"."cm_user_invitation_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_auth_provider_setting_h_event_at" ON "common"."cm_auth_provider_setting_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_auth_provider_setting_h_tx" ON "common"."cm_auth_provider_setting_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_external_identity_h_event_at" ON "common"."cm_user_external_identity_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_external_identity_h_tx" ON "common"."cm_user_external_identity_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_registration_request_h_event_at" ON "common"."cm_user_registration_request_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_registration_request_h_tx" ON "common"."cm_user_registration_request_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_password_reset_challenge_h_event_at" ON "common"."cm_user_password_reset_challenge_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_password_reset_challenge_h_tx" ON "common"."cm_user_password_reset_challenge_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_auth_email_outbox_h_event_at" ON "common"."cm_auth_email_outbox_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_auth_email_outbox_h_tx" ON "common"."cm_auth_email_outbox_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_organization_h_event_at" ON "common"."cm_organization_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_organization_h_tx" ON "common"."cm_organization_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_org_h_event_at" ON "common"."cm_user_org_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_org_h_tx" ON "common"."cm_user_org_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_permission_h_event_at" ON "common"."cm_permission_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_permission_h_tx" ON "common"."cm_permission_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_role_h_event_at" ON "common"."cm_role_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_role_h_tx" ON "common"."cm_role_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_role_permission_h_event_at" ON "common"."cm_role_permission_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_role_permission_h_tx" ON "common"."cm_role_permission_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_org_permission_h_event_at" ON "common"."cm_org_permission_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_org_permission_h_tx" ON "common"."cm_org_permission_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_permission_exception_h_event_at" ON "common"."cm_user_permission_exception_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_permission_exception_h_tx" ON "common"."cm_user_permission_exception_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_h_event_at" ON "pms"."pr_project_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_h_tx" ON "pms"."pr_project_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_status_h_event_at" ON "pms"."pr_project_status_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_status_h_tx" ON "pms"."pr_project_status_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_request_d_h_event_at" ON "pms"."pr_project_request_d_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_request_d_h_tx" ON "pms"."pr_project_request_d_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_proposal_d_h_event_at" ON "pms"."pr_project_proposal_d_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_proposal_d_h_tx" ON "pms"."pr_project_proposal_d_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_execution_d_h_event_at" ON "pms"."pr_project_execution_d_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_execution_d_h_tx" ON "pms"."pr_project_execution_d_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_transition_d_h_event_at" ON "pms"."pr_project_transition_d_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_transition_d_h_tx" ON "pms"."pr_project_transition_d_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_h_event_at" ON "pms"."pr_deliverable_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_h_tx" ON "pms"."pr_deliverable_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_h_event_at" ON "pms"."pr_deliverable_group_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_h_tx" ON "pms"."pr_deliverable_group_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_item_r_h_event_at" ON "pms"."pr_deliverable_group_item_r_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_item_r_h_tx" ON "pms"."pr_deliverable_group_item_r_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_h_event_at" ON "pms"."pr_close_condition_group_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_h_tx" ON "pms"."pr_close_condition_group_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_item_r_h_event_at" ON "pms"."pr_close_condition_group_item_r_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_item_r_h_tx" ON "pms"."pr_close_condition_group_item_r_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_deliverable_r_h_event_at" ON "pms"."pr_project_deliverable_r_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_deliverable_r_h_tx" ON "pms"."pr_project_deliverable_r_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_close_condition_r_h_event_at" ON "pms"."pr_project_close_condition_r_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_close_condition_r_h_tx" ON "pms"."pr_project_close_condition_r_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_member_r_h_event_at" ON "pms"."pr_project_member_r_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_member_r_h_tx" ON "pms"."pr_project_member_r_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_org_r_h_event_at" ON "pms"."pr_project_org_r_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_org_r_h_tx" ON "pms"."pr_project_org_r_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_relation_r_h_event_at" ON "pms"."pr_project_relation_r_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_relation_r_h_tx" ON "pms"."pr_project_relation_r_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_handoff_h_event_at" ON "pms"."pr_handoff_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_handoff_h_tx" ON "pms"."pr_handoff_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_contract_h_event_at" ON "pms"."pr_contract_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_contract_h_tx" ON "pms"."pr_contract_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_contract_payment_h_event_at" ON "pms"."pr_contract_payment_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_contract_payment_h_tx" ON "pms"."pr_contract_payment_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_role_permission_h_event_at" ON "pms"."pr_project_role_permission_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_role_permission_h_tx" ON "pms"."pr_project_role_permission_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_objective_h_event_at" ON "pms"."pr_objective_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_objective_h_tx" ON "pms"."pr_objective_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_wbs_h_event_at" ON "pms"."pr_wbs_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_wbs_h_tx" ON "pms"."pr_wbs_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_task_h_event_at" ON "pms"."pr_task_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_task_h_tx" ON "pms"."pr_task_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_task_effort_log_h_event_at" ON "pms"."pr_task_effort_log_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_task_effort_log_h_tx" ON "pms"."pr_task_effort_log_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_milestone_h_event_at" ON "pms"."pr_milestone_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_milestone_h_tx" ON "pms"."pr_milestone_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_issue_h_event_at" ON "pms"."pr_issue_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_issue_h_tx" ON "pms"."pr_issue_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_legacy_issue_archive_h_event_at" ON "pms"."pr_legacy_issue_archive_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_legacy_issue_archive_h_tx" ON "pms"."pr_legacy_issue_archive_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_issue_h_event_at" ON "pms"."pr_project_issue_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_issue_h_tx" ON "pms"."pr_project_issue_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_requirement_h_event_at" ON "pms"."pr_requirement_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_requirement_h_tx" ON "pms"."pr_requirement_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_risk_h_event_at" ON "pms"."pr_risk_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_risk_h_tx" ON "pms"."pr_risk_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_change_request_h_event_at" ON "pms"."pr_change_request_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_change_request_h_tx" ON "pms"."pr_change_request_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_event_h_event_at" ON "pms"."pr_event_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_event_h_tx" ON "pms"."pr_event_h"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "pr_site_m_site_code_key" ON "pms"."pr_site_m"("site_code");

-- CreateIndex
CREATE INDEX "ix_pr_site_m_customer" ON "pms"."pr_site_m"("customer_id");

-- CreateIndex
CREATE INDEX "ix_pr_site_m_name" ON "pms"."pr_site_m"("site_name");

-- CreateIndex
CREATE INDEX "ix_pr_site_m_active" ON "pms"."pr_site_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_pr_site_h_event_at" ON "pms"."pr_site_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_site_h_tx" ON "pms"."pr_site_h"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "pr_system_catalog_m_catalog_code_key" ON "pms"."pr_system_catalog_m"("catalog_code");

-- CreateIndex
CREATE INDEX "ix_pr_system_catalog_m_parent" ON "pms"."pr_system_catalog_m"("parent_system_catalog_id");

-- CreateIndex
CREATE INDEX "ix_pr_system_catalog_m_category" ON "pms"."pr_system_catalog_m"("category_code");

-- CreateIndex
CREATE INDEX "ix_pr_system_catalog_m_active" ON "pms"."pr_system_catalog_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_pr_system_catalog_h_event_at" ON "pms"."pr_system_catalog_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_system_catalog_h_tx" ON "pms"."pr_system_catalog_h"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "pr_system_instance_m_instance_code_key" ON "pms"."pr_system_instance_m"("instance_code");

-- CreateIndex
CREATE INDEX "ix_pr_system_instance_m_customer" ON "pms"."pr_system_instance_m"("customer_id");

-- CreateIndex
CREATE INDEX "ix_pr_system_instance_m_site" ON "pms"."pr_system_instance_m"("site_id");

-- CreateIndex
CREATE INDEX "ix_pr_system_instance_m_catalog" ON "pms"."pr_system_instance_m"("system_catalog_id");

-- CreateIndex
CREATE INDEX "ix_pr_system_instance_m_lifecycle" ON "pms"."pr_system_instance_m"("lifecycle_status_code");

-- CreateIndex
CREATE INDEX "ix_pr_system_instance_m_active" ON "pms"."pr_system_instance_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_pr_system_instance_h_event_at" ON "pms"."pr_system_instance_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_system_instance_h_tx" ON "pms"."pr_system_instance_h"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "pr_integration_m_integration_code_key" ON "pms"."pr_integration_m"("integration_code");

-- CreateIndex
CREATE INDEX "ix_pr_integration_m_source" ON "pms"."pr_integration_m"("source_system_instance_id");

-- CreateIndex
CREATE INDEX "ix_pr_integration_m_target" ON "pms"."pr_integration_m"("target_system_instance_id");

-- CreateIndex
CREATE INDEX "ix_pr_integration_m_status" ON "pms"."pr_integration_m"("status_code");

-- CreateIndex
CREATE INDEX "ix_pr_integration_m_active" ON "pms"."pr_integration_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_pr_integration_h_event_at" ON "pms"."pr_integration_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_integration_h_tx" ON "pms"."pr_integration_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_master_import_profile_m_entity" ON "pms"."pr_master_import_profile_m"("entity_type");

-- CreateIndex
CREATE INDEX "ix_pr_master_import_profile_m_default" ON "pms"."pr_master_import_profile_m"("is_default");

-- CreateIndex
CREATE INDEX "ix_pr_master_import_profile_m_active" ON "pms"."pr_master_import_profile_m"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "pr_master_import_profile_m_entity_type_profile_name_key" ON "pms"."pr_master_import_profile_m"("entity_type", "profile_name");

-- CreateIndex
CREATE INDEX "ix_pr_master_import_profile_h_event_at" ON "pms"."pr_master_import_profile_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_master_import_profile_h_tx" ON "pms"."pr_master_import_profile_h"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "cm_customer_m_customer_code_key" ON "pms"."cm_customer_m"("customer_code");

-- CreateIndex
CREATE INDEX "ix_cm_customer_m_name" ON "pms"."cm_customer_m"("customer_name");

-- CreateIndex
CREATE INDEX "ix_cm_customer_m_active" ON "pms"."cm_customer_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_cm_customer_h_event_at" ON "pms"."cm_customer_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_customer_h_tx" ON "pms"."cm_customer_h"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "crm_opportunity_m_opportunity_code_key" ON "crm"."crm_opportunity_m"("opportunity_code");

-- CreateIndex
CREATE INDEX "ix_crm_opportunity_m_group_version" ON "crm"."crm_opportunity_m"("opportunity_group_code", "version_no");

-- CreateIndex
CREATE INDEX "ix_crm_opportunity_m_contract_code" ON "crm"."crm_opportunity_m"("contract_code");

-- CreateIndex
CREATE INDEX "ix_crm_opportunity_m_quote_status" ON "crm"."crm_opportunity_m"("quote_status_code", "is_active");

-- CreateIndex
CREATE INDEX "ix_crm_opportunity_m_status_active" ON "crm"."crm_opportunity_m"("status_code", "is_active");

-- CreateIndex
CREATE INDEX "ix_crm_opportunity_m_customer" ON "crm"."crm_opportunity_m"("customer_name");

-- CreateIndex
CREATE INDEX "ix_crm_opportunity_m_owner_user" ON "crm"."crm_opportunity_m"("owner_user_id");

-- CreateIndex
CREATE INDEX "ix_crm_opportunity_m_updated" ON "crm"."crm_opportunity_m"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "crm_opportunity_m_opportunity_group_code_version_no_key" ON "crm"."crm_opportunity_m"("opportunity_group_code", "version_no");

-- CreateIndex
CREATE INDEX "ix_crm_quote_dms_handoff_m_opportunity_template" ON "crm"."crm_quote_dms_handoff_m"("opportunity_id", "template_key");

-- CreateIndex
CREATE INDEX "ix_crm_quote_dms_handoff_m_opportunity_code" ON "crm"."crm_quote_dms_handoff_m"("opportunity_code", "is_active", "saved_at");

-- CreateIndex
CREATE INDEX "ix_crm_quote_dms_handoff_m_saved_at" ON "crm"."crm_quote_dms_handoff_m"("saved_at");

-- CreateIndex
CREATE INDEX "ix_crm_opportunity_h_event_at" ON "crm"."crm_opportunity_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_crm_opportunity_h_tx" ON "crm"."crm_opportunity_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_crm_opportunity_line_d_kind" ON "crm"."crm_opportunity_line_d"("opportunity_id", "line_kind_code");

-- CreateIndex
CREATE UNIQUE INDEX "crm_opportunity_line_d_opportunity_id_line_code_key" ON "crm"."crm_opportunity_line_d"("opportunity_id", "line_code");

-- CreateIndex
CREATE INDEX "ix_crm_opportunity_line_h_event_at" ON "crm"."crm_opportunity_line_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_crm_opportunity_line_h_tx" ON "crm"."crm_opportunity_line_h"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_crm_customer_m_code" ON "crm"."crm_customer_m"("customer_code");

-- CreateIndex
CREATE INDEX "ix_crm_customer_m_name" ON "crm"."crm_customer_m"("customer_name");

-- CreateIndex
CREATE INDEX "ix_crm_customer_m_type_active" ON "crm"."crm_customer_m"("customer_type_code", "is_active");

-- CreateIndex
CREATE INDEX "ix_crm_customer_m_owner_user" ON "crm"."crm_customer_m"("owner_user_id");

-- CreateIndex
CREATE INDEX "ix_crm_customer_m_source_opportunity" ON "crm"."crm_customer_m"("source_opportunity_id");

-- CreateIndex
CREATE INDEX "ix_crm_customer_m_updated" ON "crm"."crm_customer_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_crm_customer_h_event_at" ON "crm"."crm_customer_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_crm_customer_h_tx" ON "crm"."crm_customer_h"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_crm_customer_activity_d_code" ON "crm"."crm_customer_activity_d"("activity_code");

-- CreateIndex
CREATE INDEX "ix_crm_customer_activity_d_customer_at" ON "crm"."crm_customer_activity_d"("customer_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ix_crm_customer_activity_d_source_opportunity" ON "crm"."crm_customer_activity_d"("source_opportunity_id");

-- CreateIndex
CREATE INDEX "ix_crm_customer_activity_d_type_active" ON "crm"."crm_customer_activity_d"("activity_type_code", "is_active");

-- CreateIndex
CREATE INDEX "ix_crm_customer_activity_d_owner_user" ON "crm"."crm_customer_activity_d"("owner_user_id");

-- CreateIndex
CREATE INDEX "ix_crm_customer_activity_h_event_at" ON "crm"."crm_customer_activity_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_crm_customer_activity_h_tx" ON "crm"."crm_customer_activity_h"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_crm_quote_seller_profile_m_code" ON "crm"."crm_quote_seller_profile_m"("profile_code");

-- CreateIndex
CREATE INDEX "ix_crm_quote_seller_profile_m_active" ON "crm"."crm_quote_seller_profile_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_crm_quote_seller_profile_h_event_at" ON "crm"."crm_quote_seller_profile_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_crm_quote_seller_profile_h_tx" ON "crm"."crm_quote_seller_profile_h"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_crm_contract_m_code" ON "crm"."crm_contract_m"("contract_code");

-- CreateIndex
CREATE INDEX "ix_crm_contract_m_status_active" ON "crm"."crm_contract_m"("status_code", "is_active");

-- CreateIndex
CREATE INDEX "ix_crm_contract_m_customer" ON "crm"."crm_contract_m"("customer_name");

-- CreateIndex
CREATE INDEX "ix_crm_contract_m_updated" ON "crm"."crm_contract_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_crm_contract_m_source_opportunity" ON "crm"."crm_contract_m"("source_opportunity_id");

-- CreateIndex
CREATE INDEX "ix_crm_contract_dms_handoff_m_contract_template" ON "crm"."crm_contract_dms_handoff_m"("contract_id", "template_key");

-- CreateIndex
CREATE INDEX "ix_crm_contract_dms_handoff_m_contract_code" ON "crm"."crm_contract_dms_handoff_m"("contract_code", "is_active", "saved_at");

-- CreateIndex
CREATE INDEX "ix_crm_contract_dms_handoff_m_saved_at" ON "crm"."crm_contract_dms_handoff_m"("saved_at");

-- CreateIndex
CREATE INDEX "ix_crm_contract_h_event_at" ON "crm"."crm_contract_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_crm_contract_h_tx" ON "crm"."crm_contract_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_crm_contract_line_d_kind" ON "crm"."crm_contract_line_d"("contract_id", "line_kind_code");

-- CreateIndex
CREATE UNIQUE INDEX "crm_contract_line_d_contract_id_line_code_key" ON "crm"."crm_contract_line_d"("contract_id", "line_code");

-- CreateIndex
CREATE INDEX "ix_crm_contract_billing_plan_d_ym" ON "crm"."crm_contract_billing_plan_d"("billing_ym");

-- CreateIndex
CREATE UNIQUE INDEX "crm_contract_billing_plan_d_contract_id_billing_ym_key" ON "crm"."crm_contract_billing_plan_d"("contract_id", "billing_ym");

-- CreateIndex
CREATE INDEX "ix_crm_contract_billing_actual_d_ym" ON "crm"."crm_contract_billing_actual_d"("billing_ym");

-- CreateIndex
CREATE UNIQUE INDEX "crm_contract_billing_actual_d_contract_id_billing_ym_key" ON "crm"."crm_contract_billing_actual_d"("contract_id", "billing_ym");

-- CreateIndex
CREATE UNIQUE INDEX "ux_crm_business_plan_m_code" ON "crm"."crm_business_plan_m"("business_plan_code");

-- CreateIndex
CREATE INDEX "ix_crm_business_plan_m_year_active" ON "crm"."crm_business_plan_m"("base_year", "is_active");

-- CreateIndex
CREATE INDEX "ix_crm_business_plan_m_status_active" ON "crm"."crm_business_plan_m"("status_code", "is_active");

-- CreateIndex
CREATE INDEX "ix_crm_business_plan_m_updated" ON "crm"."crm_business_plan_m"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "crm_business_plan_m_base_year_version_no_key" ON "crm"."crm_business_plan_m"("base_year", "version_no");

-- CreateIndex
CREATE INDEX "ix_crm_business_plan_h_event_at" ON "crm"."crm_business_plan_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_crm_business_plan_h_tx" ON "crm"."crm_business_plan_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_crm_business_plan_line_d_plan_year" ON "crm"."crm_business_plan_line_d"("business_plan_id", "target_year");

-- CreateIndex
CREATE INDEX "ix_crm_business_plan_line_d_target_year" ON "crm"."crm_business_plan_line_d"("target_year");

-- CreateIndex
CREATE UNIQUE INDEX "crm_business_plan_line_d_business_plan_id_line_code_key" ON "crm"."crm_business_plan_line_d"("business_plan_id", "line_code");

-- CreateIndex
CREATE INDEX "ix_crm_business_plan_performance_actual_d_year_active" ON "crm"."crm_business_plan_performance_actual_d"("target_year", "is_active");

-- CreateIndex
CREATE INDEX "ix_crm_business_plan_performance_actual_d_business" ON "crm"."crm_business_plan_performance_actual_d"("business_type", "industry_line");

-- CreateIndex
CREATE UNIQUE INDEX "ux_crm_business_plan_performance_actual_d_basis" ON "crm"."crm_business_plan_performance_actual_d"("target_year", "business_type", "industry_line", "owner_name", "region_code", "wbs_code");

-- CreateIndex
CREATE INDEX "ix_crm_report_confirmation_m_year_status" ON "crm"."crm_report_confirmation_m"("target_year", "status_code", "is_active");

-- CreateIndex
CREATE INDEX "ix_crm_report_confirmation_m_confirmed_at" ON "crm"."crm_report_confirmation_m"("confirmed_at" DESC);

-- CreateIndex
CREATE INDEX "ix_crm_cost_plan_internal_monthly_d_year_active" ON "crm"."crm_cost_plan_internal_monthly_d"("target_year", "is_active");

-- CreateIndex
CREATE INDEX "ix_crm_cost_plan_internal_monthly_d_business" ON "crm"."crm_cost_plan_internal_monthly_d"("business_type", "industry_line");

-- CreateIndex
CREATE INDEX "ix_crm_cost_plan_internal_monthly_d_year_status" ON "crm"."crm_cost_plan_internal_monthly_d"("target_year", "status_code");

-- CreateIndex
CREATE UNIQUE INDEX "crm_cost_plan_internal_monthly_d_target_year_business_type__key" ON "crm"."crm_cost_plan_internal_monthly_d"("target_year", "business_type", "industry_line", "owner_name", "region_code", "wbs_code");

-- CreateIndex
CREATE INDEX "ix_crm_cost_plan_ams_vendor_wbs_r_year_active" ON "crm"."crm_cost_plan_ams_vendor_wbs_r"("target_year", "is_active");

-- CreateIndex
CREATE INDEX "ix_crm_cost_plan_ams_vendor_wbs_r_vendor" ON "crm"."crm_cost_plan_ams_vendor_wbs_r"("vendor_name");

-- CreateIndex
CREATE UNIQUE INDEX "crm_cost_plan_ams_vendor_wbs_r_target_year_business_type_in_key" ON "crm"."crm_cost_plan_ams_vendor_wbs_r"("target_year", "business_type", "industry_line", "owner_name", "region_code", "wbs_code");

-- CreateIndex
CREATE INDEX "ix_crm_cost_plan_ams_external_monthly_d_year_active" ON "crm"."crm_cost_plan_ams_external_monthly_d"("target_year", "is_active");

-- CreateIndex
CREATE INDEX "ix_crm_cost_plan_ams_external_monthly_d_year_status" ON "crm"."crm_cost_plan_ams_external_monthly_d"("target_year", "status_code");

-- CreateIndex
CREATE INDEX "ix_crm_cost_plan_ams_external_monthly_d_vendor" ON "crm"."crm_cost_plan_ams_external_monthly_d"("vendor_name");

-- CreateIndex
CREATE UNIQUE INDEX "crm_cost_plan_ams_external_monthly_d_target_year_business_t_key" ON "crm"."crm_cost_plan_ams_external_monthly_d"("target_year", "business_type", "industry_line", "owner_name", "region_code", "wbs_code", "vendor_name");

-- CreateIndex
CREATE INDEX "ix_crm_cost_plan_accounting_handoff_m_year_status" ON "crm"."crm_cost_plan_accounting_handoff_m"("target_year", "status_code", "is_active");

-- CreateIndex
CREATE INDEX "ix_crm_cost_plan_accounting_handoff_m_saved_at" ON "crm"."crm_cost_plan_accounting_handoff_m"("saved_at");

-- CreateIndex
CREATE INDEX "ix_dm_document_m_owner_user" ON "dms"."dm_document_m"("owner_user_id");

-- CreateIndex
CREATE INDEX "ix_dm_document_m_target_org" ON "dms"."dm_document_m"("target_org_id");

-- CreateIndex
CREATE INDEX "ix_dm_document_m_visibility_active" ON "dms"."dm_document_m"("visibility_scope", "is_active");

-- CreateIndex
CREATE INDEX "ix_dm_document_m_sync_status" ON "dms"."dm_document_m"("sync_status_code");

-- CreateIndex
CREATE INDEX "ix_dm_document_m_updated_at" ON "dms"."dm_document_m"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "dm_document_m_relative_path_key" ON "dms"."dm_document_m"("relative_path");

-- CreateIndex
CREATE INDEX "ix_dm_search_query_m_user_last" ON "dms"."dm_search_query_m"("user_id", "last_searched_at");

-- CreateIndex
CREATE INDEX "ix_dm_search_query_m_popular" ON "dms"."dm_search_query_m"("normalized_query", "search_count", "last_searched_at");

-- CreateIndex
CREATE UNIQUE INDEX "dm_search_query_m_user_id_normalized_query_key" ON "dms"."dm_search_query_m"("user_id", "normalized_query");

-- CreateIndex
CREATE INDEX "ix_dm_chat_session_m_owner_updated" ON "dms"."dm_chat_session_m"("owner_user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "ix_dm_chat_session_m_persisted" ON "dms"."dm_chat_session_m"("persisted_at" DESC);

-- CreateIndex
CREATE INDEX "ix_dm_document_h_event_at" ON "dms"."dm_document_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_dm_document_h_tx" ON "dms"."dm_document_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_dm_template_m_scope_owner" ON "dms"."dm_template_m"("template_scope_code", "owner_ref");

-- CreateIndex
CREATE INDEX "ix_dm_template_m_kind" ON "dms"."dm_template_m"("template_kind_code");

-- CreateIndex
CREATE INDEX "ix_dm_template_m_status_updated_at" ON "dms"."dm_template_m"("template_status_code", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "dm_template_m_template_scope_code_owner_ref_template_key_key" ON "dms"."dm_template_m"("template_scope_code", "owner_ref", "template_key");

-- CreateIndex
CREATE UNIQUE INDEX "dm_template_m_relative_path_key" ON "dms"."dm_template_m"("relative_path");

-- CreateIndex
CREATE INDEX "ix_dm_template_h_event_at" ON "dms"."dm_template_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_dm_template_h_tx" ON "dms"."dm_template_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_dm_document_grant_r_principal" ON "dms"."dm_document_grant_r"("principal_type", "principal_ref");

-- CreateIndex
CREATE INDEX "ix_dm_document_grant_r_expires_at" ON "dms"."dm_document_grant_r"("expires_at");

-- CreateIndex
CREATE INDEX "ix_dm_document_grant_r_document_active" ON "dms"."dm_document_grant_r"("document_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "dm_document_grant_r_document_id_principal_type_principal_re_key" ON "dms"."dm_document_grant_r"("document_id", "principal_type", "principal_ref", "role_code");

-- CreateIndex
CREATE UNIQUE INDEX "dm_document_grant_r_granted_from_request_id_key" ON "dms"."dm_document_grant_r"("granted_from_request_id");

-- CreateIndex
CREATE INDEX "ix_dm_document_grant_h_event_at" ON "dms"."dm_document_grant_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_dm_document_grant_h_tx" ON "dms"."dm_document_grant_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_dm_document_access_request_m_document_status" ON "dms"."dm_document_access_request_m"("document_id", "status_code");

-- CreateIndex
CREATE INDEX "ix_dm_document_access_request_m_requester_status" ON "dms"."dm_document_access_request_m"("requester_user_id", "status_code");

-- CreateIndex
CREATE INDEX "ix_dm_document_access_request_m_responded_at" ON "dms"."dm_document_access_request_m"("responded_at");

-- CreateIndex
CREATE INDEX "ix_dm_document_access_request_h_event_at" ON "dms"."dm_document_access_request_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_dm_document_access_request_h_tx" ON "dms"."dm_document_access_request_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_dm_document_path_history_m_document_changed_at" ON "dms"."dm_document_path_history_m"("document_id", "changed_at");

-- CreateIndex
CREATE INDEX "ix_dm_document_path_history_m_relative_path" ON "dms"."dm_document_path_history_m"("relative_path");

-- CreateIndex
CREATE INDEX "ix_dm_document_source_file_m_document_sort" ON "dms"."dm_document_source_file_m"("document_id", "sort_order");

-- CreateIndex
CREATE INDEX "ix_dm_document_source_file_m_storage_uri" ON "dms"."dm_document_source_file_m"("storage_uri");

-- CreateIndex
CREATE INDEX "ix_dm_document_source_file_m_checksum" ON "dms"."dm_document_source_file_m"("checksum");

-- CreateIndex
CREATE INDEX "ix_dm_document_source_file_m_origin" ON "dms"."dm_document_source_file_m"("origin_code");

-- CreateIndex
CREATE UNIQUE INDEX "dm_document_source_file_m_document_id_source_path_key" ON "dms"."dm_document_source_file_m"("document_id", "source_path");

-- CreateIndex
CREATE INDEX "ix_dm_document_source_file_h_event_at" ON "dms"."dm_document_source_file_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_dm_document_source_file_h_tx" ON "dms"."dm_document_source_file_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_dm_document_comment_m_document_sort" ON "dms"."dm_document_comment_m"("document_id", "sort_order");

-- CreateIndex
CREATE INDEX "ix_dm_document_comment_m_parent_key" ON "dms"."dm_document_comment_m"("parent_comment_key");

-- CreateIndex
CREATE INDEX "ix_dm_document_comment_m_created_at" ON "dms"."dm_document_comment_m"("comment_created_at");

-- CreateIndex
CREATE UNIQUE INDEX "dm_document_comment_m_document_id_comment_key_key" ON "dms"."dm_document_comment_m"("document_id", "comment_key");

-- CreateIndex
CREATE INDEX "ix_dm_document_comment_h_event_at" ON "dms"."dm_document_comment_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_dm_document_comment_h_tx" ON "dms"."dm_document_comment_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_dm_document_chunk_m_document_seq" ON "dms"."dm_document_chunk_m"("document_id", "chunk_seq");

-- CreateIndex
CREATE INDEX "ix_dm_document_chunk_m_status" ON "dms"."dm_document_chunk_m"("chunk_status_code");

-- CreateIndex
CREATE INDEX "ix_dm_document_chunk_m_document_active" ON "dms"."dm_document_chunk_m"("document_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "dm_document_chunk_m_document_id_chunk_key_key" ON "dms"."dm_document_chunk_m"("document_id", "chunk_key");

-- CreateIndex
CREATE INDEX "ix_dm_document_index_state_m_status" ON "dms"."dm_document_index_state_m"("index_status_code");

-- CreateIndex
CREATE INDEX "ix_dm_document_index_state_m_last_indexed_at" ON "dms"."dm_document_index_state_m"("last_indexed_at");

-- CreateIndex
CREATE UNIQUE INDEX "dm_document_index_state_m_document_id_key" ON "dms"."dm_document_index_state_m"("document_id");

-- CreateIndex
CREATE INDEX "ix_dm_document_index_state_h_event_at" ON "dms"."dm_document_index_state_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_dm_document_index_state_h_tx" ON "dms"."dm_document_index_state_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_dm_config_m_scope" ON "dms"."dm_config_m"("scope_code");

-- CreateIndex
CREATE UNIQUE INDEX "dm_config_m_scope_code_owner_ref_key" ON "dms"."dm_config_m"("scope_code", "owner_ref");

-- CreateIndex
CREATE UNIQUE INDEX "sns_board_m_board_code_key" ON "sns"."sns_board_m"("board_code");

-- CreateIndex
CREATE INDEX "ix_sns_board_m_type" ON "sns"."sns_board_m"("board_type");

-- CreateIndex
CREATE INDEX "ix_sns_board_m_sort" ON "sns"."sns_board_m"("sort_order");

-- CreateIndex
CREATE INDEX "ix_sns_board_h_event_at" ON "sns"."sns_board_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_sns_board_h_tx" ON "sns"."sns_board_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_sns_board_category_m_board" ON "sns"."sns_board_category_m"("board_id");

-- CreateIndex
CREATE INDEX "ix_sns_post_m_author" ON "sns"."sns_post_m"("author_user_id");

-- CreateIndex
CREATE INDEX "ix_sns_post_m_board" ON "sns"."sns_post_m"("board_id");

-- CreateIndex
CREATE INDEX "ix_sns_post_m_category" ON "sns"."sns_post_m"("category_id");

-- CreateIndex
CREATE INDEX "ix_sns_post_m_created" ON "sns"."sns_post_m"("created_at");

-- CreateIndex
CREATE INDEX "ix_sns_post_m_pinned" ON "sns"."sns_post_m"("is_pinned", "created_at");

-- CreateIndex
CREATE INDEX "ix_sns_post_m_visibility" ON "sns"."sns_post_m"("visibility_scope_code", "created_at");

-- CreateIndex
CREATE INDEX "ix_sns_post_m_target_org" ON "sns"."sns_post_m"("target_org_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_sns_post_h_event_at" ON "sns"."sns_post_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_sns_post_h_tx" ON "sns"."sns_post_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_sns_comment_m_post" ON "sns"."sns_comment_m"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_sns_comment_m_author" ON "sns"."sns_comment_m"("author_user_id");

-- CreateIndex
CREATE INDEX "ix_sns_comment_m_parent" ON "sns"."sns_comment_m"("parent_comment_id");

-- CreateIndex
CREATE INDEX "ix_sns_comment_h_event_at" ON "sns"."sns_comment_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_sns_comment_h_tx" ON "sns"."sns_comment_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_sns_reaction_m_post" ON "sns"."sns_reaction_m"("post_id");

-- CreateIndex
CREATE INDEX "ix_sns_reaction_m_comment" ON "sns"."sns_reaction_m"("comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "sns_reaction_m_user_id_post_id_reaction_type_key" ON "sns"."sns_reaction_m"("user_id", "post_id", "reaction_type");

-- CreateIndex
CREATE UNIQUE INDEX "sns_reaction_m_user_id_comment_id_reaction_type_key" ON "sns"."sns_reaction_m"("user_id", "comment_id", "reaction_type");

-- CreateIndex
CREATE UNIQUE INDEX "sns_tag_m_tag_name_key" ON "sns"."sns_tag_m"("tag_name");

-- CreateIndex
CREATE INDEX "ix_sns_tag_m_usage" ON "sns"."sns_tag_m"("usage_count");

-- CreateIndex
CREATE INDEX "ix_sns_post_tag_r_tag" ON "sns"."sns_post_tag_r"("tag_id");

-- CreateIndex
CREATE INDEX "ix_sns_mention_m_user" ON "sns"."sns_mention_m"("mentioned_user_id");

-- CreateIndex
CREATE INDEX "ix_sns_mention_m_post" ON "sns"."sns_mention_m"("post_id");

-- CreateIndex
CREATE INDEX "ix_sns_mention_m_comment" ON "sns"."sns_mention_m"("comment_id");

-- CreateIndex
CREATE INDEX "ix_sns_attachment_m_post" ON "sns"."sns_attachment_m"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "sns_user_profile_m_user_id_key" ON "sns"."sns_user_profile_m"("user_id");

-- CreateIndex
CREATE INDEX "ix_sns_user_profile_h_event_at" ON "sns"."sns_user_profile_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_sns_user_profile_h_tx" ON "sns"."sns_user_profile_h"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "sns_skill_m_skill_name_key" ON "sns"."sns_skill_m"("skill_name");

-- CreateIndex
CREATE INDEX "ix_sns_skill_m_category" ON "sns"."sns_skill_m"("skill_category");

-- CreateIndex
CREATE INDEX "ix_sns_skill_m_parent" ON "sns"."sns_skill_m"("parent_skill_id");

-- CreateIndex
CREATE INDEX "ix_sns_user_skill_r_skill" ON "sns"."sns_user_skill_r"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "sns_user_skill_r_profile_id_skill_id_key" ON "sns"."sns_user_skill_r"("profile_id", "skill_id");

-- CreateIndex
CREATE INDEX "ix_sns_user_career_m_profile" ON "sns"."sns_user_career_m"("profile_id");

-- CreateIndex
CREATE INDEX "ix_sns_user_career_m_project" ON "sns"."sns_user_career_m"("project_id");

-- CreateIndex
CREATE INDEX "ix_sns_endorsement_m_endorsee" ON "sns"."sns_endorsement_m"("endorsee_profile_id");

-- CreateIndex
CREATE INDEX "ix_sns_endorsement_m_skill" ON "sns"."sns_endorsement_m"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "sns_endorsement_m_endorser_user_id_user_skill_id_key" ON "sns"."sns_endorsement_m"("endorser_user_id", "user_skill_id");

-- CreateIndex
CREATE INDEX "ix_sns_follow_r_following" ON "sns"."sns_follow_r"("following_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sns_follow_r_follower_user_id_following_user_id_key" ON "sns"."sns_follow_r"("follower_user_id", "following_user_id");

-- CreateIndex
CREATE INDEX "ix_sns_bookmark_m_user" ON "sns"."sns_bookmark_m"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sns_bookmark_m_user_id_post_id_key" ON "sns"."sns_bookmark_m"("user_id", "post_id");

-- CreateIndex
CREATE INDEX "ix_sns_notification_m_recipient" ON "sns"."sns_notification_m"("recipient_user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "ix_sns_notification_m_actor" ON "sns"."sns_notification_m"("actor_user_id");

-- AddForeignKey
ALTER TABLE "pms"."cm_menu_m" ADD CONSTRAINT "cm_menu_m_parent_menu_id_fkey" FOREIGN KEY ("parent_menu_id") REFERENCES "pms"."cm_menu_m"("menu_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."cm_role_menu_r" ADD CONSTRAINT "cm_role_menu_r_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "pms"."cm_menu_m"("menu_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."cm_user_menu_r" ADD CONSTRAINT "cm_user_menu_r_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."cm_user_menu_r" ADD CONSTRAINT "cm_user_menu_r_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "pms"."cm_menu_m"("menu_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."cm_user_favorite_r" ADD CONSTRAINT "cm_user_favorite_r_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."cm_user_favorite_r" ADD CONSTRAINT "cm_user_favorite_r_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "pms"."cm_menu_m"("menu_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_object_m" ADD CONSTRAINT "cm_ai_object_m_ai_source_id_fkey" FOREIGN KEY ("ai_source_id") REFERENCES "common"."cm_ai_source_m"("ai_source_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_chunk_m" ADD CONSTRAINT "cm_ai_chunk_m_ai_object_id_fkey" FOREIGN KEY ("ai_object_id") REFERENCES "common"."cm_ai_object_m"("ai_object_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_embedding_m" ADD CONSTRAINT "cm_ai_embedding_m_ai_chunk_id_fkey" FOREIGN KEY ("ai_chunk_id") REFERENCES "common"."cm_ai_chunk_m"("ai_chunk_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_acl_snapshot_m" ADD CONSTRAINT "cm_ai_acl_snapshot_m_ai_object_id_fkey" FOREIGN KEY ("ai_object_id") REFERENCES "common"."cm_ai_object_m"("ai_object_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_index_job_m" ADD CONSTRAINT "cm_ai_index_job_m_ai_source_id_fkey" FOREIGN KEY ("ai_source_id") REFERENCES "common"."cm_ai_source_m"("ai_source_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_index_job_m" ADD CONSTRAINT "cm_ai_index_job_m_ai_object_id_fkey" FOREIGN KEY ("ai_object_id") REFERENCES "common"."cm_ai_object_m"("ai_object_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_index_state_m" ADD CONSTRAINT "cm_ai_index_state_m_ai_source_id_fkey" FOREIGN KEY ("ai_source_id") REFERENCES "common"."cm_ai_source_m"("ai_source_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_index_state_m" ADD CONSTRAINT "cm_ai_index_state_m_ai_object_id_fkey" FOREIGN KEY ("ai_object_id") REFERENCES "common"."cm_ai_object_m"("ai_object_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_retrieval_log_item_m" ADD CONSTRAINT "cm_ai_retrieval_log_item_m_ai_retrieval_log_id_fkey" FOREIGN KEY ("ai_retrieval_log_id") REFERENCES "common"."cm_ai_retrieval_log_m"("ai_retrieval_log_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_retrieval_log_item_m" ADD CONSTRAINT "cm_ai_retrieval_log_item_m_ai_object_id_fkey" FOREIGN KEY ("ai_object_id") REFERENCES "common"."cm_ai_object_m"("ai_object_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_retrieval_log_item_m" ADD CONSTRAINT "cm_ai_retrieval_log_item_m_ai_chunk_id_fkey" FOREIGN KEY ("ai_chunk_id") REFERENCES "common"."cm_ai_chunk_m"("ai_chunk_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_message_m" ADD CONSTRAINT "cm_ai_message_m_ai_conversation_id_fkey" FOREIGN KEY ("ai_conversation_id") REFERENCES "common"."cm_ai_conversation_m"("ai_conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_reference_m" ADD CONSTRAINT "cm_ai_reference_m_ai_conversation_id_fkey" FOREIGN KEY ("ai_conversation_id") REFERENCES "common"."cm_ai_conversation_m"("ai_conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_reference_m" ADD CONSTRAINT "cm_ai_reference_m_ai_message_id_fkey" FOREIGN KEY ("ai_message_id") REFERENCES "common"."cm_ai_message_m"("ai_message_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_reference_m" ADD CONSTRAINT "cm_ai_reference_m_ai_object_id_fkey" FOREIGN KEY ("ai_object_id") REFERENCES "common"."cm_ai_object_m"("ai_object_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_reference_m" ADD CONSTRAINT "cm_ai_reference_m_ai_chunk_id_fkey" FOREIGN KEY ("ai_chunk_id") REFERENCES "common"."cm_ai_chunk_m"("ai_chunk_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_run_m" ADD CONSTRAINT "cm_ai_run_m_ai_conversation_id_fkey" FOREIGN KEY ("ai_conversation_id") REFERENCES "common"."cm_ai_conversation_m"("ai_conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_run_m" ADD CONSTRAINT "cm_ai_run_m_request_message_id_fkey" FOREIGN KEY ("request_message_id") REFERENCES "common"."cm_ai_message_m"("ai_message_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_run_m" ADD CONSTRAINT "cm_ai_run_m_response_message_id_fkey" FOREIGN KEY ("response_message_id") REFERENCES "common"."cm_ai_message_m"("ai_message_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_run_source_r" ADD CONSTRAINT "cm_ai_run_source_r_ai_run_id_fkey" FOREIGN KEY ("ai_run_id") REFERENCES "common"."cm_ai_run_m"("ai_run_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_run_source_r" ADD CONSTRAINT "cm_ai_run_source_r_ai_reference_id_fkey" FOREIGN KEY ("ai_reference_id") REFERENCES "common"."cm_ai_reference_m"("ai_reference_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_run_source_r" ADD CONSTRAINT "cm_ai_run_source_r_ai_object_id_fkey" FOREIGN KEY ("ai_object_id") REFERENCES "common"."cm_ai_object_m"("ai_object_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_ai_run_source_r" ADD CONSTRAINT "cm_ai_run_source_r_ai_chunk_id_fkey" FOREIGN KEY ("ai_chunk_id") REFERENCES "common"."cm_ai_chunk_m"("ai_chunk_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_user_auth_m" ADD CONSTRAINT "cm_user_auth_m_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_user_session_m" ADD CONSTRAINT "cm_user_session_m_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_user_invitation_m" ADD CONSTRAINT "cm_user_invitation_m_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_user_invitation_m" ADD CONSTRAINT "cm_user_invitation_m_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_user_external_identity_m" ADD CONSTRAINT "cm_user_external_identity_m_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_user_registration_request_m" ADD CONSTRAINT "cm_user_registration_request_m_created_user_id_fkey" FOREIGN KEY ("created_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_user_registration_request_m" ADD CONSTRAINT "cm_user_registration_request_m_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_user_password_reset_challenge_m" ADD CONSTRAINT "cm_user_password_reset_challenge_m_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_organization_m" ADD CONSTRAINT "cm_organization_m_parent_org_id_fkey" FOREIGN KEY ("parent_org_id") REFERENCES "common"."cm_organization_m"("org_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_user_org_r" ADD CONSTRAINT "cm_user_org_r_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_user_org_r" ADD CONSTRAINT "cm_user_org_r_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "common"."cm_organization_m"("org_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_role_permission_r" ADD CONSTRAINT "cm_role_permission_r_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "common"."cm_role_m"("role_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_role_permission_r" ADD CONSTRAINT "cm_role_permission_r_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "common"."cm_permission_m"("permission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_org_permission_r" ADD CONSTRAINT "cm_org_permission_r_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "common"."cm_organization_m"("org_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_org_permission_r" ADD CONSTRAINT "cm_org_permission_r_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "common"."cm_permission_m"("permission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_user_permission_exception_r" ADD CONSTRAINT "cm_user_permission_exception_r_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_user_permission_exception_r" ADD CONSTRAINT "cm_user_permission_exception_r_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "common"."cm_permission_m"("permission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_user_permission_exception_r" ADD CONSTRAINT "cm_user_permission_exception_r_target_org_id_fkey" FOREIGN KEY ("target_org_id") REFERENCES "common"."cm_organization_m"("org_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_m" ADD CONSTRAINT "pr_project_m_current_owner_user_id_fkey" FOREIGN KEY ("current_owner_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_m" ADD CONSTRAINT "pr_project_m_owner_organization_id_fkey" FOREIGN KEY ("owner_organization_id") REFERENCES "common"."cm_organization_m"("org_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_status_m" ADD CONSTRAINT "pr_project_status_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_request_d" ADD CONSTRAINT "pr_project_request_d_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_proposal_d" ADD CONSTRAINT "pr_project_proposal_d_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_execution_d" ADD CONSTRAINT "pr_project_execution_d_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_transition_d" ADD CONSTRAINT "pr_project_transition_d_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_handoff_m" ADD CONSTRAINT "pr_handoff_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_handoff_m" ADD CONSTRAINT "pr_handoff_m_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_handoff_m" ADD CONSTRAINT "pr_handoff_m_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_handoff_m" ADD CONSTRAINT "pr_handoff_m_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_handoff_m" ADD CONSTRAINT "pr_handoff_m_responded_by_user_id_fkey" FOREIGN KEY ("responded_by_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_contract_m" ADD CONSTRAINT "pr_contract_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_contract_m" ADD CONSTRAINT "pr_contract_m_manager_user_id_fkey" FOREIGN KEY ("manager_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_contract_payment_m" ADD CONSTRAINT "pr_contract_payment_m_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "pms"."pr_contract_m"("contract_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_contract_payment_m" ADD CONSTRAINT "pr_contract_payment_m_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_deliverable_group_item_r_m" ADD CONSTRAINT "pr_deliverable_group_item_r_m_group_code_fkey" FOREIGN KEY ("group_code") REFERENCES "pms"."pr_deliverable_group_m"("group_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_deliverable_group_item_r_m" ADD CONSTRAINT "pr_deliverable_group_item_r_m_deliverable_code_fkey" FOREIGN KEY ("deliverable_code") REFERENCES "pms"."pr_deliverable_m"("deliverable_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_close_condition_group_item_r_m" ADD CONSTRAINT "pr_close_condition_group_item_r_m_group_code_fkey" FOREIGN KEY ("group_code") REFERENCES "pms"."pr_close_condition_group_m"("group_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_deliverable_r_m" ADD CONSTRAINT "pr_project_deliverable_r_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_deliverable_r_m" ADD CONSTRAINT "pr_project_deliverable_r_m_deliverable_code_fkey" FOREIGN KEY ("deliverable_code") REFERENCES "pms"."pr_deliverable_m"("deliverable_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_deliverable_r_m" ADD CONSTRAINT "pr_project_deliverable_r_m_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "pms"."pr_event_m"("event_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_close_condition_r_m" ADD CONSTRAINT "pr_project_close_condition_r_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_close_condition_r_m" ADD CONSTRAINT "pr_project_close_condition_r_m_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "pms"."pr_event_m"("event_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_closeout_approval_step_m" ADD CONSTRAINT "pr_project_closeout_approval_step_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_member_r_m" ADD CONSTRAINT "pr_project_member_r_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_member_r_m" ADD CONSTRAINT "pr_project_member_r_m_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_org_r_m" ADD CONSTRAINT "pr_project_org_r_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_org_r_m" ADD CONSTRAINT "pr_project_org_r_m_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "common"."cm_organization_m"("org_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_relation_r_m" ADD CONSTRAINT "pr_project_relation_r_m_source_project_id_fkey" FOREIGN KEY ("source_project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_relation_r_m" ADD CONSTRAINT "pr_project_relation_r_m_target_project_id_fkey" FOREIGN KEY ("target_project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_role_permission_r" ADD CONSTRAINT "pr_project_role_permission_r_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "common"."cm_permission_m"("permission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_objective_m" ADD CONSTRAINT "pr_objective_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_objective_m" ADD CONSTRAINT "pr_objective_m_parent_objective_id_fkey" FOREIGN KEY ("parent_objective_id") REFERENCES "pms"."pr_objective_m"("objective_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_wbs_m" ADD CONSTRAINT "pr_wbs_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_wbs_m" ADD CONSTRAINT "pr_wbs_m_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "pms"."pr_objective_m"("objective_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_wbs_m" ADD CONSTRAINT "pr_wbs_m_parent_wbs_id_fkey" FOREIGN KEY ("parent_wbs_id") REFERENCES "pms"."pr_wbs_m"("wbs_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_task_m" ADD CONSTRAINT "pr_task_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_task_m" ADD CONSTRAINT "pr_task_m_wbs_id_fkey" FOREIGN KEY ("wbs_id") REFERENCES "pms"."pr_wbs_m"("wbs_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_task_m" ADD CONSTRAINT "pr_task_m_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "pms"."pr_task_m"("task_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_task_m" ADD CONSTRAINT "pr_task_m_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_task_effort_log_m" ADD CONSTRAINT "pr_task_effort_log_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_task_effort_log_m" ADD CONSTRAINT "pr_task_effort_log_m_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "pms"."pr_task_m"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_task_effort_log_m" ADD CONSTRAINT "pr_task_effort_log_m_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_milestone_m" ADD CONSTRAINT "pr_milestone_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_milestone_m" ADD CONSTRAINT "pr_milestone_m_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "pms"."pr_objective_m"("objective_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_issue_m" ADD CONSTRAINT "pr_issue_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_issue_m" ADD CONSTRAINT "pr_issue_m_reported_by_user_id_fkey" FOREIGN KEY ("reported_by_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_issue_m" ADD CONSTRAINT "pr_issue_m_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_issue_m" ADD CONSTRAINT "pr_project_issue_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_issue_m" ADD CONSTRAINT "pr_project_issue_m_reported_by_user_id_fkey" FOREIGN KEY ("reported_by_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_issue_m" ADD CONSTRAINT "pr_project_issue_m_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_requirement_m" ADD CONSTRAINT "pr_requirement_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_risk_m" ADD CONSTRAINT "pr_risk_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_change_request_m" ADD CONSTRAINT "pr_change_request_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_event_m" ADD CONSTRAINT "pr_event_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."crm_quote_dms_handoff_m" ADD CONSTRAINT "crm_quote_dms_handoff_m_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "crm"."crm_opportunity_m"("opportunity_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."crm_opportunity_line_d" ADD CONSTRAINT "crm_opportunity_line_d_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "crm"."crm_opportunity_m"("opportunity_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."crm_customer_m" ADD CONSTRAINT "crm_customer_m_source_opportunity_id_fkey" FOREIGN KEY ("source_opportunity_id") REFERENCES "crm"."crm_opportunity_m"("opportunity_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."crm_customer_activity_d" ADD CONSTRAINT "crm_customer_activity_d_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm"."crm_customer_m"("customer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."crm_customer_activity_d" ADD CONSTRAINT "crm_customer_activity_d_source_opportunity_id_fkey" FOREIGN KEY ("source_opportunity_id") REFERENCES "crm"."crm_opportunity_m"("opportunity_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."crm_contract_m" ADD CONSTRAINT "crm_contract_m_source_opportunity_id_fkey" FOREIGN KEY ("source_opportunity_id") REFERENCES "crm"."crm_opportunity_m"("opportunity_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."crm_contract_dms_handoff_m" ADD CONSTRAINT "crm_contract_dms_handoff_m_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "crm"."crm_contract_m"("contract_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."crm_contract_line_d" ADD CONSTRAINT "crm_contract_line_d_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "crm"."crm_contract_m"("contract_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."crm_contract_billing_plan_d" ADD CONSTRAINT "crm_contract_billing_plan_d_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "crm"."crm_contract_m"("contract_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."crm_contract_billing_actual_d" ADD CONSTRAINT "crm_contract_billing_actual_d_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "crm"."crm_contract_m"("contract_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."crm_business_plan_line_d" ADD CONSTRAINT "crm_business_plan_line_d_business_plan_id_fkey" FOREIGN KEY ("business_plan_id") REFERENCES "crm"."crm_business_plan_m"("business_plan_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dms"."dm_document_m" ADD CONSTRAINT "dm_document_m_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dms"."dm_document_m" ADD CONSTRAINT "dm_document_m_target_org_id_fkey" FOREIGN KEY ("target_org_id") REFERENCES "common"."cm_organization_m"("org_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dms"."dm_search_query_m" ADD CONSTRAINT "dm_search_query_m_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dms"."dm_chat_session_m" ADD CONSTRAINT "fk_dm_chat_session_m_owner_user" FOREIGN KEY ("owner_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dms"."dm_document_grant_r" ADD CONSTRAINT "dm_document_grant_r_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dms"."dm_document_m"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dms"."dm_document_grant_r" ADD CONSTRAINT "dm_document_grant_r_granted_from_request_id_fkey" FOREIGN KEY ("granted_from_request_id") REFERENCES "dms"."dm_document_access_request_m"("access_request_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dms"."dm_document_access_request_m" ADD CONSTRAINT "dm_document_access_request_m_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dms"."dm_document_m"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dms"."dm_document_path_history_m" ADD CONSTRAINT "dm_document_path_history_m_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dms"."dm_document_m"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dms"."dm_document_source_file_m" ADD CONSTRAINT "dm_document_source_file_m_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dms"."dm_document_m"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dms"."dm_document_comment_m" ADD CONSTRAINT "dm_document_comment_m_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dms"."dm_document_m"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dms"."dm_document_chunk_m" ADD CONSTRAINT "dm_document_chunk_m_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dms"."dm_document_m"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dms"."dm_document_index_state_m" ADD CONSTRAINT "dm_document_index_state_m_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dms"."dm_document_m"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_board_category_m" ADD CONSTRAINT "sns_board_category_m_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "sns"."sns_board_m"("board_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_post_m" ADD CONSTRAINT "sns_post_m_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "sns"."sns_board_m"("board_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_post_m" ADD CONSTRAINT "sns_post_m_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "sns"."sns_board_category_m"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_comment_m" ADD CONSTRAINT "sns_comment_m_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "sns"."sns_post_m"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_comment_m" ADD CONSTRAINT "sns_comment_m_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "sns"."sns_comment_m"("comment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_reaction_m" ADD CONSTRAINT "sns_reaction_m_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "sns"."sns_post_m"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_reaction_m" ADD CONSTRAINT "sns_reaction_m_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "sns"."sns_comment_m"("comment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_post_tag_r" ADD CONSTRAINT "sns_post_tag_r_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "sns"."sns_post_m"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_post_tag_r" ADD CONSTRAINT "sns_post_tag_r_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "sns"."sns_tag_m"("tag_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_mention_m" ADD CONSTRAINT "sns_mention_m_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "sns"."sns_post_m"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_mention_m" ADD CONSTRAINT "sns_mention_m_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "sns"."sns_comment_m"("comment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_attachment_m" ADD CONSTRAINT "sns_attachment_m_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "sns"."sns_post_m"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_skill_m" ADD CONSTRAINT "sns_skill_m_parent_skill_id_fkey" FOREIGN KEY ("parent_skill_id") REFERENCES "sns"."sns_skill_m"("skill_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_user_skill_r" ADD CONSTRAINT "sns_user_skill_r_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "sns"."sns_user_profile_m"("profile_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_user_skill_r" ADD CONSTRAINT "sns_user_skill_r_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "sns"."sns_skill_m"("skill_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_user_career_m" ADD CONSTRAINT "sns_user_career_m_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "sns"."sns_user_profile_m"("profile_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_endorsement_m" ADD CONSTRAINT "sns_endorsement_m_endorsee_profile_id_fkey" FOREIGN KEY ("endorsee_profile_id") REFERENCES "sns"."sns_user_profile_m"("profile_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_endorsement_m" ADD CONSTRAINT "sns_endorsement_m_user_skill_id_fkey" FOREIGN KEY ("user_skill_id") REFERENCES "sns"."sns_user_skill_r"("user_skill_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_endorsement_m" ADD CONSTRAINT "sns_endorsement_m_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "sns"."sns_skill_m"("skill_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sns"."sns_bookmark_m" ADD CONSTRAINT "sns_bookmark_m_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "sns"."sns_post_m"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;
