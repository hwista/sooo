-- PMS execution asset master baseline.
-- CRM keeps opportunity/quote/contract/billing/revenue/cost ledgers; PMS owns execution
-- anchors for customer sites, system catalogs, system instances, and integrations.

CREATE SCHEMA IF NOT EXISTS "pms";

CREATE TABLE IF NOT EXISTS "pms"."pr_site_m" (
  "site_id" BIGSERIAL PRIMARY KEY,
  "customer_id" BIGINT,
  "site_code" VARCHAR(80) NOT NULL,
  "site_name" VARCHAR(200) NOT NULL,
  "site_type_code" VARCHAR(40),
  "region_code" VARCHAR(40),
  "address" VARCHAR(500),
  "timezone" VARCHAR(80),
  "operation_owner_name" VARCHAR(120),
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS "pr_site_m_site_code_key"
  ON "pms"."pr_site_m" ("site_code");
CREATE INDEX IF NOT EXISTS "ix_pr_site_m_customer"
  ON "pms"."pr_site_m" ("customer_id");
CREATE INDEX IF NOT EXISTS "ix_pr_site_m_name"
  ON "pms"."pr_site_m" ("site_name");
CREATE INDEX IF NOT EXISTS "ix_pr_site_m_active"
  ON "pms"."pr_site_m" ("is_active");

CREATE TABLE IF NOT EXISTS "pms"."pr_site_h" (
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
  CONSTRAINT "pk_pr_site_h" PRIMARY KEY ("site_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_pr_site_h_event_at"
  ON "pms"."pr_site_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_pr_site_h_tx"
  ON "pms"."pr_site_h" ("transaction_id");

CREATE TABLE IF NOT EXISTS "pms"."pr_system_catalog_m" (
  "system_catalog_id" BIGSERIAL PRIMARY KEY,
  "parent_system_catalog_id" BIGINT,
  "catalog_code" VARCHAR(80) NOT NULL,
  "catalog_name" VARCHAR(200) NOT NULL,
  "category_code" VARCHAR(40),
  "vendor_name" VARCHAR(120),
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS "pr_system_catalog_m_catalog_code_key"
  ON "pms"."pr_system_catalog_m" ("catalog_code");
CREATE INDEX IF NOT EXISTS "ix_pr_system_catalog_m_parent"
  ON "pms"."pr_system_catalog_m" ("parent_system_catalog_id");
CREATE INDEX IF NOT EXISTS "ix_pr_system_catalog_m_category"
  ON "pms"."pr_system_catalog_m" ("category_code");
CREATE INDEX IF NOT EXISTS "ix_pr_system_catalog_m_active"
  ON "pms"."pr_system_catalog_m" ("is_active");

CREATE TABLE IF NOT EXISTS "pms"."pr_system_catalog_h" (
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
  CONSTRAINT "pk_pr_system_catalog_h" PRIMARY KEY ("system_catalog_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_pr_system_catalog_h_event_at"
  ON "pms"."pr_system_catalog_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_pr_system_catalog_h_tx"
  ON "pms"."pr_system_catalog_h" ("transaction_id");

CREATE TABLE IF NOT EXISTS "pms"."pr_system_instance_m" (
  "system_instance_id" BIGSERIAL PRIMARY KEY,
  "customer_id" BIGINT,
  "site_id" BIGINT,
  "system_catalog_id" BIGINT,
  "instance_code" VARCHAR(100) NOT NULL,
  "instance_name" VARCHAR(220) NOT NULL,
  "environment_code" VARCHAR(40),
  "operation_owner_type_code" VARCHAR(40),
  "operation_owner_name" VARCHAR(120),
  "lifecycle_status_code" VARCHAR(40) NOT NULL DEFAULT 'active',
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS "pr_system_instance_m_instance_code_key"
  ON "pms"."pr_system_instance_m" ("instance_code");
CREATE INDEX IF NOT EXISTS "ix_pr_system_instance_m_customer"
  ON "pms"."pr_system_instance_m" ("customer_id");
CREATE INDEX IF NOT EXISTS "ix_pr_system_instance_m_site"
  ON "pms"."pr_system_instance_m" ("site_id");
CREATE INDEX IF NOT EXISTS "ix_pr_system_instance_m_catalog"
  ON "pms"."pr_system_instance_m" ("system_catalog_id");
CREATE INDEX IF NOT EXISTS "ix_pr_system_instance_m_lifecycle"
  ON "pms"."pr_system_instance_m" ("lifecycle_status_code");
CREATE INDEX IF NOT EXISTS "ix_pr_system_instance_m_active"
  ON "pms"."pr_system_instance_m" ("is_active");

CREATE TABLE IF NOT EXISTS "pms"."pr_system_instance_h" (
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
  CONSTRAINT "pk_pr_system_instance_h" PRIMARY KEY ("system_instance_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_pr_system_instance_h_event_at"
  ON "pms"."pr_system_instance_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_pr_system_instance_h_tx"
  ON "pms"."pr_system_instance_h" ("transaction_id");

CREATE TABLE IF NOT EXISTS "pms"."pr_integration_m" (
  "integration_id" BIGSERIAL PRIMARY KEY,
  "integration_code" VARCHAR(100) NOT NULL,
  "integration_name" VARCHAR(220) NOT NULL,
  "source_system_instance_id" BIGINT NOT NULL,
  "target_system_instance_id" BIGINT NOT NULL,
  "direction_code" VARCHAR(40),
  "interface_type_code" VARCHAR(40),
  "status_code" VARCHAR(40) NOT NULL DEFAULT 'active',
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS "pr_integration_m_integration_code_key"
  ON "pms"."pr_integration_m" ("integration_code");
CREATE INDEX IF NOT EXISTS "ix_pr_integration_m_source"
  ON "pms"."pr_integration_m" ("source_system_instance_id");
CREATE INDEX IF NOT EXISTS "ix_pr_integration_m_target"
  ON "pms"."pr_integration_m" ("target_system_instance_id");
CREATE INDEX IF NOT EXISTS "ix_pr_integration_m_status"
  ON "pms"."pr_integration_m" ("status_code");
CREATE INDEX IF NOT EXISTS "ix_pr_integration_m_active"
  ON "pms"."pr_integration_m" ("is_active");

CREATE TABLE IF NOT EXISTS "pms"."pr_integration_h" (
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
  CONSTRAINT "pk_pr_integration_h" PRIMARY KEY ("integration_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_pr_integration_h_event_at"
  ON "pms"."pr_integration_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_pr_integration_h_tx"
  ON "pms"."pr_integration_h" ("transaction_id");
