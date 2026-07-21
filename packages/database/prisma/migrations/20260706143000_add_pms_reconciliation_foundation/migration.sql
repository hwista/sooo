-- PMS reconciliation foundation protected baseline.
-- This migration is intentionally non-destructive and PMS-owned only.
-- CRM keeps sales opportunity, contract, billing, revenue, and cost ledgers.

CREATE SCHEMA IF NOT EXISTS "pms";

DO $migration$
BEGIN
  IF to_regclass('pms.pr_project_m') IS NULL THEN
    RAISE NOTICE 'Skipping PMS reconciliation foundation baseline because pms.pr_project_m is not installed yet.';
  ELSE
    EXECUTE $sql$
      ALTER TABLE "pms"."pr_project_m"
        ADD COLUMN IF NOT EXISTS "owner_organization_id" BIGINT,
        ADD COLUMN IF NOT EXISTS "handoff_type_code" TEXT,
        ADD COLUMN IF NOT EXISTS "handoff_status_code" TEXT,
        ADD COLUMN IF NOT EXISTS "handoff_requested_at" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "handoff_confirmed_at" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "handoff_confirmed_by" BIGINT,
        ADD COLUMN IF NOT EXISTS "customer_id" BIGINT,
        ADD COLUMN IF NOT EXISTS "plant_id" BIGINT,
        ADD COLUMN IF NOT EXISTS "system_instance_id" BIGINT
    $sql$;

    EXECUTE $sql$
      ALTER TABLE "pms"."pr_project_h"
        ADD COLUMN IF NOT EXISTS "owner_organization_id" BIGINT,
        ADD COLUMN IF NOT EXISTS "handoff_type_code" TEXT,
        ADD COLUMN IF NOT EXISTS "handoff_status_code" TEXT,
        ADD COLUMN IF NOT EXISTS "handoff_requested_at" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "handoff_confirmed_at" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "handoff_confirmed_by" BIGINT,
        ADD COLUMN IF NOT EXISTS "customer_id" BIGINT,
        ADD COLUMN IF NOT EXISTS "plant_id" BIGINT,
        ADD COLUMN IF NOT EXISTS "system_instance_id" BIGINT
    $sql$;

    EXECUTE $sql$
      ALTER TABLE "pms"."pr_project_execution_d"
        ADD COLUMN IF NOT EXISTS "next_project_id" BIGINT
    $sql$;

    EXECUTE $sql$
      ALTER TABLE "pms"."pr_project_execution_d_h"
        ADD COLUMN IF NOT EXISTS "next_project_id" BIGINT
    $sql$;

    EXECUTE $sql$
      ALTER TABLE "pms"."pr_project_deliverable_r_m"
        ADD COLUMN IF NOT EXISTS "event_id" BIGINT
    $sql$;

    EXECUTE $sql$
      ALTER TABLE "pms"."pr_project_deliverable_r_h"
        ADD COLUMN IF NOT EXISTS "event_id" BIGINT
    $sql$;

    EXECUTE $sql$
      ALTER TABLE "pms"."pr_project_close_condition_r_m"
        ADD COLUMN IF NOT EXISTS "event_id" BIGINT,
        ADD COLUMN IF NOT EXISTS "requires_deliverable" BOOLEAN NOT NULL DEFAULT FALSE
    $sql$;

    EXECUTE $sql$
      ALTER TABLE "pms"."pr_project_close_condition_r_h"
        ADD COLUMN IF NOT EXISTS "event_id" BIGINT,
        ADD COLUMN IF NOT EXISTS "requires_deliverable" BOOLEAN NOT NULL DEFAULT FALSE
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_project_member_r_m" (
        "project_id" BIGINT NOT NULL,
        "user_id" BIGINT NOT NULL,
        "role_code" TEXT NOT NULL,
        "organization_id" BIGINT,
        "access_level" TEXT NOT NULL DEFAULT 'participant',
        "is_phase_owner" BOOLEAN NOT NULL DEFAULT FALSE,
        "assigned_at" DATE NOT NULL DEFAULT CURRENT_DATE,
        "released_at" DATE,
        "allocation_rate" INTEGER NOT NULL DEFAULT 100,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID,
        CONSTRAINT "pk_pr_project_member_r_m" PRIMARY KEY ("project_id", "user_id", "role_code")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_project_org_r_m" (
        "project_id" BIGINT NOT NULL,
        "organization_id" BIGINT NOT NULL,
        "role_code" TEXT NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID,
        CONSTRAINT "pk_pr_project_org_r_m" PRIMARY KEY ("project_id", "organization_id", "role_code")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_project_relation_r_m" (
        "source_project_id" BIGINT NOT NULL,
        "target_project_id" BIGINT NOT NULL,
        "relation_type_code" TEXT NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID,
        CONSTRAINT "pk_pr_project_relation_r_m" PRIMARY KEY ("source_project_id", "target_project_id", "relation_type_code")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_project_role_permission_r" (
        "project_role_permission_id" BIGSERIAL PRIMARY KEY,
        "role_code" TEXT NOT NULL,
        "permission_id" BIGINT NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_handoff_m" (
        "handoff_id" BIGSERIAL PRIMARY KEY,
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
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_contract_m" (
        "contract_id" BIGSERIAL PRIMARY KEY,
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
        "is_primary" BOOLEAN NOT NULL DEFAULT FALSE,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_contract_payment_m" (
        "contract_payment_id" BIGSERIAL PRIMARY KEY,
        "contract_id" BIGINT NOT NULL,
        "payment_type_code" TEXT NOT NULL DEFAULT 'other',
        "amount" BIGINT,
        "trigger_event" TEXT,
        "payment_status_code" TEXT NOT NULL DEFAULT 'scheduled',
        "due_date" DATE,
        "paid_date" DATE,
        "requested_by_user_id" BIGINT,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_objective_m" (
        "objective_id" BIGSERIAL PRIMARY KEY,
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
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_wbs_m" (
        "wbs_id" BIGSERIAL PRIMARY KEY,
        "project_id" BIGINT NOT NULL,
        "objective_id" BIGINT,
        "parent_wbs_id" BIGINT,
        "wbs_code" VARCHAR(50) NOT NULL,
        "wbs_name" TEXT NOT NULL,
        "description" TEXT,
        "status_code" TEXT NOT NULL DEFAULT 'not_started',
        "depth" INTEGER NOT NULL DEFAULT 0,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_task_m" (
        "task_id" BIGSERIAL PRIMARY KEY,
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
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_milestone_m" (
        "milestone_id" BIGSERIAL PRIMARY KEY,
        "project_id" BIGINT NOT NULL,
        "objective_id" BIGINT,
        "milestone_code" VARCHAR(50) NOT NULL,
        "milestone_name" TEXT NOT NULL,
        "description" TEXT,
        "status_code" TEXT NOT NULL DEFAULT 'not_started',
        "due_at" DATE,
        "achieved_at" DATE,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_issue_m" (
        "issue_id" BIGSERIAL PRIMARY KEY,
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
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_project_issue_m" (
        "project_issue_id" BIGSERIAL PRIMARY KEY,
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
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_requirement_m" (
        "requirement_id" BIGSERIAL PRIMARY KEY,
        "project_id" BIGINT NOT NULL,
        "requirement_code" VARCHAR(50) NOT NULL,
        "requirement_title" TEXT NOT NULL,
        "description" TEXT,
        "status_code" TEXT NOT NULL DEFAULT 'open',
        "priority_code" TEXT NOT NULL DEFAULT 'normal',
        "owner_user_id" BIGINT,
        "due_at" DATE,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_risk_m" (
        "risk_id" BIGSERIAL PRIMARY KEY,
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
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_change_request_m" (
        "change_request_id" BIGSERIAL PRIMARY KEY,
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
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_event_m" (
        "event_id" BIGSERIAL PRIMARY KEY,
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
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "memo" TEXT,
        "created_by" BIGINT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_source" TEXT,
        "last_activity" TEXT,
        "transaction_id" UUID
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_project_member_r_h" (
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
        CONSTRAINT "pk_pr_project_member_r_h" PRIMARY KEY ("project_id", "user_id", "role_code", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_project_org_r_h" (
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
        CONSTRAINT "pk_pr_project_org_r_h" PRIMARY KEY ("project_id", "organization_id", "role_code", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_project_relation_r_h" (
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
        CONSTRAINT "pk_pr_project_relation_r_h" PRIMARY KEY ("source_project_id", "target_project_id", "relation_type_code", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_project_role_permission_h" (
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
        CONSTRAINT "pk_pr_project_role_permission_h" PRIMARY KEY ("project_role_permission_id", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_handoff_h" (
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
        CONSTRAINT "pk_pr_handoff_h" PRIMARY KEY ("handoff_id", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_contract_h" (
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
        CONSTRAINT "pk_pr_contract_h" PRIMARY KEY ("contract_id", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_contract_payment_h" (
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
        CONSTRAINT "pk_pr_contract_payment_h" PRIMARY KEY ("contract_payment_id", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_objective_h" (
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
        CONSTRAINT "pk_pr_objective_h" PRIMARY KEY ("objective_id", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_wbs_h" (
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
        CONSTRAINT "pk_pr_wbs_h" PRIMARY KEY ("wbs_id", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_task_h" (
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
        CONSTRAINT "pk_pr_task_h" PRIMARY KEY ("task_id", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_milestone_h" (
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
        CONSTRAINT "pk_pr_milestone_h" PRIMARY KEY ("milestone_id", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_issue_h" (
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
        CONSTRAINT "pk_pr_issue_h" PRIMARY KEY ("issue_id", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_project_issue_h" (
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
        CONSTRAINT "pk_pr_project_issue_h" PRIMARY KEY ("project_issue_id", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_requirement_h" (
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
        CONSTRAINT "pk_pr_requirement_h" PRIMARY KEY ("requirement_id", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_risk_h" (
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
        CONSTRAINT "pk_pr_risk_h" PRIMARY KEY ("risk_id", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_change_request_h" (
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
        CONSTRAINT "pk_pr_change_request_h" PRIMARY KEY ("change_request_id", "history_seq")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE IF NOT EXISTS "pms"."pr_event_h" (
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
        CONSTRAINT "pk_pr_event_h" PRIMARY KEY ("event_id", "history_seq")
      )
    $sql$;

    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_m_owner_org" ON "pms"."pr_project_m" ("owner_organization_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_m_customer" ON "pms"."pr_project_m" ("customer_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_m_system_instance" ON "pms"."pr_project_m" ("system_instance_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_m_handoff" ON "pms"."pr_project_m" ("handoff_status_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_execution_d_next_project" ON "pms"."pr_project_execution_d" ("next_project_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_deliverable_r_m_event" ON "pms"."pr_project_deliverable_r_m" ("event_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_close_condition_r_m_event" ON "pms"."pr_project_close_condition_r_m" ("event_id") $sql$;

    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_member_r_m_role" ON "pms"."pr_project_member_r_m" ("project_id", "role_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_member_r_m_access" ON "pms"."pr_project_member_r_m" ("project_id", "access_level") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_member_r_m_phase_owner" ON "pms"."pr_project_member_r_m" ("project_id", "is_phase_owner") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_member_r_m_org" ON "pms"."pr_project_member_r_m" ("organization_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_member_r_m_user" ON "pms"."pr_project_member_r_m" ("user_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_member_r_m_updated_at" ON "pms"."pr_project_member_r_m" ("updated_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_org_r_m_role" ON "pms"."pr_project_org_r_m" ("project_id", "role_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_org_r_m_org" ON "pms"."pr_project_org_r_m" ("organization_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_org_r_m_updated_at" ON "pms"."pr_project_org_r_m" ("updated_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_relation_r_m_source" ON "pms"."pr_project_relation_r_m" ("source_project_id", "relation_type_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_relation_r_m_target" ON "pms"."pr_project_relation_r_m" ("target_project_id", "relation_type_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_relation_r_m_updated_at" ON "pms"."pr_project_relation_r_m" ("updated_at") $sql$;
    EXECUTE $sql$ CREATE UNIQUE INDEX IF NOT EXISTS "ux_pr_project_role_permission_r_role_permission" ON "pms"."pr_project_role_permission_r" ("role_code", "permission_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_role_permission_r_role" ON "pms"."pr_project_role_permission_r" ("role_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_role_permission_r_permission" ON "pms"."pr_project_role_permission_r" ("permission_id") $sql$;

    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_handoff_m_project_status" ON "pms"."pr_handoff_m" ("project_id", "handoff_status_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_handoff_m_project_requested_at" ON "pms"."pr_handoff_m" ("project_id", "requested_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_handoff_m_to_phase" ON "pms"."pr_handoff_m" ("to_phase_code") $sql$;
    EXECUTE $sql$ CREATE UNIQUE INDEX IF NOT EXISTS "ux_pr_contract_m_project_code" ON "pms"."pr_contract_m" ("project_id", "contract_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_contract_m_project_status" ON "pms"."pr_contract_m" ("project_id", "contract_status_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_contract_m_manager" ON "pms"."pr_contract_m" ("manager_user_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_contract_m_primary" ON "pms"."pr_contract_m" ("is_primary") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_contract_payment_m_contract_status" ON "pms"."pr_contract_payment_m" ("contract_id", "payment_status_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_contract_payment_m_due_date" ON "pms"."pr_contract_payment_m" ("due_date") $sql$;

    EXECUTE $sql$ CREATE UNIQUE INDEX IF NOT EXISTS "uq_pr_objective_m_project_code" ON "pms"."pr_objective_m" ("project_id", "objective_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_objective_m_project_status" ON "pms"."pr_objective_m" ("project_id", "status_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_objective_m_hierarchy" ON "pms"."pr_objective_m" ("project_id", "parent_objective_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_objective_m_due_at" ON "pms"."pr_objective_m" ("due_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_objective_m_updated_at" ON "pms"."pr_objective_m" ("updated_at") $sql$;
    EXECUTE $sql$ CREATE UNIQUE INDEX IF NOT EXISTS "uq_pr_wbs_m_project_code" ON "pms"."pr_wbs_m" ("project_id", "wbs_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_wbs_m_project_status" ON "pms"."pr_wbs_m" ("project_id", "status_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_wbs_m_hierarchy" ON "pms"."pr_wbs_m" ("project_id", "parent_wbs_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_wbs_m_objective" ON "pms"."pr_wbs_m" ("objective_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_wbs_m_updated_at" ON "pms"."pr_wbs_m" ("updated_at") $sql$;
    EXECUTE $sql$ CREATE UNIQUE INDEX IF NOT EXISTS "uq_pr_task_m_project_code" ON "pms"."pr_task_m" ("project_id", "task_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_task_m_project_status" ON "pms"."pr_task_m" ("project_id", "status_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_task_m_hierarchy" ON "pms"."pr_task_m" ("project_id", "parent_task_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_task_m_wbs" ON "pms"."pr_task_m" ("wbs_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_task_m_assignee" ON "pms"."pr_task_m" ("assignee_user_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_task_m_updated_at" ON "pms"."pr_task_m" ("updated_at") $sql$;
    EXECUTE $sql$ CREATE UNIQUE INDEX IF NOT EXISTS "uq_pr_milestone_m_project_code" ON "pms"."pr_milestone_m" ("project_id", "milestone_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_milestone_m_project_status" ON "pms"."pr_milestone_m" ("project_id", "status_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_milestone_m_objective" ON "pms"."pr_milestone_m" ("objective_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_milestone_m_due_at" ON "pms"."pr_milestone_m" ("due_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_milestone_m_updated_at" ON "pms"."pr_milestone_m" ("updated_at") $sql$;

    EXECUTE $sql$ CREATE UNIQUE INDEX IF NOT EXISTS "uq_pr_issue_m_project_code" ON "pms"."pr_issue_m" ("project_id", "issue_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_issue_m_project_status" ON "pms"."pr_issue_m" ("project_id", "status_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_issue_m_project_type" ON "pms"."pr_issue_m" ("project_id", "issue_type_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_issue_m_assignee" ON "pms"."pr_issue_m" ("assignee_user_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_issue_m_updated_at" ON "pms"."pr_issue_m" ("updated_at") $sql$;
    EXECUTE $sql$ CREATE UNIQUE INDEX IF NOT EXISTS "uq_pr_project_issue_m_project_code" ON "pms"."pr_project_issue_m" ("project_id", "issue_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_issue_m_project_status" ON "pms"."pr_project_issue_m" ("project_id", "status_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_issue_m_project_type" ON "pms"."pr_project_issue_m" ("project_id", "issue_type_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_issue_m_owner" ON "pms"."pr_project_issue_m" ("owner_user_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_issue_m_updated_at" ON "pms"."pr_project_issue_m" ("updated_at") $sql$;
    EXECUTE $sql$ CREATE UNIQUE INDEX IF NOT EXISTS "uq_pr_requirement_m_project_code" ON "pms"."pr_requirement_m" ("project_id", "requirement_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_requirement_m_project_status" ON "pms"."pr_requirement_m" ("project_id", "status_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_requirement_m_project_priority" ON "pms"."pr_requirement_m" ("project_id", "priority_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_requirement_m_updated_at" ON "pms"."pr_requirement_m" ("updated_at") $sql$;
    EXECUTE $sql$ CREATE UNIQUE INDEX IF NOT EXISTS "uq_pr_risk_m_project_code" ON "pms"."pr_risk_m" ("project_id", "risk_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_risk_m_project_status" ON "pms"."pr_risk_m" ("project_id", "status_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_risk_m_project_impact" ON "pms"."pr_risk_m" ("project_id", "impact_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_risk_m_updated_at" ON "pms"."pr_risk_m" ("updated_at") $sql$;
    EXECUTE $sql$ CREATE UNIQUE INDEX IF NOT EXISTS "uq_pr_change_request_m_project_code" ON "pms"."pr_change_request_m" ("project_id", "change_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_change_request_m_project_status" ON "pms"."pr_change_request_m" ("project_id", "status_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_change_request_m_project_priority" ON "pms"."pr_change_request_m" ("project_id", "priority_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_change_request_m_updated_at" ON "pms"."pr_change_request_m" ("updated_at") $sql$;
    EXECUTE $sql$ CREATE UNIQUE INDEX IF NOT EXISTS "uq_pr_event_m_project_code" ON "pms"."pr_event_m" ("project_id", "event_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_event_m_project_status" ON "pms"."pr_event_m" ("project_id", "status_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_event_m_project_type" ON "pms"."pr_event_m" ("project_id", "event_type_code") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_event_m_updated_at" ON "pms"."pr_event_m" ("updated_at") $sql$;

    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_member_r_h_event_at" ON "pms"."pr_project_member_r_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_member_r_h_tx" ON "pms"."pr_project_member_r_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_org_r_h_event_at" ON "pms"."pr_project_org_r_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_org_r_h_tx" ON "pms"."pr_project_org_r_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_relation_r_h_event_at" ON "pms"."pr_project_relation_r_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_relation_r_h_tx" ON "pms"."pr_project_relation_r_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_role_permission_h_event_at" ON "pms"."pr_project_role_permission_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_role_permission_h_tx" ON "pms"."pr_project_role_permission_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_handoff_h_event_at" ON "pms"."pr_handoff_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_handoff_h_tx" ON "pms"."pr_handoff_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_contract_h_event_at" ON "pms"."pr_contract_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_contract_h_tx" ON "pms"."pr_contract_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_contract_payment_h_event_at" ON "pms"."pr_contract_payment_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_contract_payment_h_tx" ON "pms"."pr_contract_payment_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_objective_h_event_at" ON "pms"."pr_objective_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_objective_h_tx" ON "pms"."pr_objective_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_wbs_h_event_at" ON "pms"."pr_wbs_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_wbs_h_tx" ON "pms"."pr_wbs_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_task_h_event_at" ON "pms"."pr_task_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_task_h_tx" ON "pms"."pr_task_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_milestone_h_event_at" ON "pms"."pr_milestone_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_milestone_h_tx" ON "pms"."pr_milestone_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_issue_h_event_at" ON "pms"."pr_issue_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_issue_h_tx" ON "pms"."pr_issue_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_issue_h_event_at" ON "pms"."pr_project_issue_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_project_issue_h_tx" ON "pms"."pr_project_issue_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_requirement_h_event_at" ON "pms"."pr_requirement_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_requirement_h_tx" ON "pms"."pr_requirement_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_risk_h_event_at" ON "pms"."pr_risk_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_risk_h_tx" ON "pms"."pr_risk_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_change_request_h_event_at" ON "pms"."pr_change_request_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_change_request_h_tx" ON "pms"."pr_change_request_h" ("transaction_id") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_event_h_event_at" ON "pms"."pr_event_h" ("event_at") $sql$;
    EXECUTE $sql$ CREATE INDEX IF NOT EXISTS "ix_pr_event_h_tx" ON "pms"."pr_event_h" ("transaction_id") $sql$;
  END IF;
END
$migration$;
