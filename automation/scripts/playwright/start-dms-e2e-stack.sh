#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(
  git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || {
    cd "$SCRIPT_DIR/../../.." && pwd
  }
)"
cd "$ROOT_DIR"

RUN_ID="${PLAYWRIGHT_RUN_ID:-manual-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
STACK_SELF_TEST=0
if [ "${1:-}" = "--self-test" ]; then
  STACK_SELF_TEST=1
fi
if [[ ! "$RUN_ID" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "[playwright-dms] PLAYWRIGHT_RUN_ID may contain only letters, numbers, dot, underscore, and dash" >&2
  exit 1
fi
RUNTIME_DIR="${PLAYWRIGHT_RUNTIME_DIR:-${TMPDIR:-/tmp}/ssoo-playwright-runtime/$RUN_ID}"
LOG_DIR="${PLAYWRIGHT_LOG_DIR:-$RUNTIME_DIR/logs}"
OWNER_FILE="$RUNTIME_DIR/owner.json"
PG_DATA_DIR="${PLAYWRIGHT_PG_DATA_DIR:-$RUNTIME_DIR/postgres/data}"
PG_LOG_FILE="${PLAYWRIGHT_PG_LOG_FILE:-$LOG_DIR/postgres.log}"
PG_PORT="${PLAYWRIGHT_PG_PORT:-55432}"
PG_HOST="${PLAYWRIGHT_PG_HOST:-127.0.0.1}"
PG_SOCKET_DIR="${PLAYWRIGHT_PG_SOCKET_DIR:-$RUNTIME_DIR/postgres/socket}"
DB_USER="${PLAYWRIGHT_DB_USER:-ssoo}"
DB_NAME="${PLAYWRIGHT_DB_NAME:-ssoo_playwright_test}"
DATABASE_URL_BASE="${PLAYWRIGHT_DATABASE_URL_BASE:-postgresql://${DB_USER}@${PG_HOST}:${PG_PORT}/${DB_NAME}}"
DATABASE_URL="${PLAYWRIGHT_DATABASE_URL:-${DATABASE_URL_BASE}?schema=public}"
SERVER_PORT="${PLAYWRIGHT_SERVER_PORT:-4000}"
DMS_PORT="${PLAYWRIGHT_DMS_PORT:-3003}"
ADMIN_PORT="${PLAYWRIGHT_ADMIN_PORT:-3000}"
DMS_MARKDOWN_ROOT="${PLAYWRIGHT_DMS_MARKDOWN_ROOT:-$RUNTIME_DIR/markdown}"
DMS_LOCAL_ENV_FILE="${PLAYWRIGHT_DMS_LOCAL_ENV_FILE:-$RUNTIME_DIR/dms-local.env}"
SERVER_LOG_FILE="${PLAYWRIGHT_SERVER_LOG_FILE:-$LOG_DIR/server.log}"
WEB_LOG_FILE="${PLAYWRIGHT_WEB_LOG_FILE:-$LOG_DIR/web-dms.log}"
ADMIN_LOG_FILE="${PLAYWRIGHT_ADMIN_LOG_FILE:-$LOG_DIR/web-admin.log}"
SMTP_LOG_FILE="${PLAYWRIGHT_SMTP_LOG_FILE:-$LOG_DIR/smtp.log}"
SMTP_CAPTURE_PATH="${PLAYWRIGHT_SMTP_CAPTURE_PATH:-$LOG_DIR/auth-email.jsonl}"
SMTP_HOST="${PLAYWRIGHT_SMTP_HOST:-127.0.0.1}"
SMTP_PORT="${PLAYWRIGHT_SMTP_PORT:-2525}"
INGEST_QUEUE_ROOT="${PLAYWRIGHT_DMS_INGEST_ROOT:-$RUNTIME_DIR/document-ingest}"
LOCAL_STORAGE_ROOT="${PLAYWRIGHT_DMS_STORAGE_LOCAL_ROOT:-$RUNTIME_DIR/document-storage/local}"
NAS_STORAGE_ROOT="${PLAYWRIGHT_DMS_NAS_ROOT:-$RUNTIME_DIR/document-storage/nas}"
SEED_DIR="$ROOT_DIR/packages/database/prisma/seeds"
SKIP_BUILD="${PLAYWRIGHT_SKIP_BUILD:-0}"
SKIP_DB_RESET="${PLAYWRIGHT_SKIP_DB_RESET:-0}"
WEB_MODE="${PLAYWRIGHT_WEB_MODE:-production}"
PGVECTOR_SQL="${PLAYWRIGHT_PGVECTOR_SQL:-}"
PGVECTOR_MODULE_PATH="${PLAYWRIGHT_PGVECTOR_MODULE_PATH:-}"
PG_BIN_DIR="${PLAYWRIGHT_PG_BIN_DIR:-}"
PG_LIB_DIR="${PLAYWRIGHT_PG_LIB_DIR:-}"
POSTGRES_MODE="${PLAYWRIGHT_POSTGRES_MODE:-auto}"
DOCKER_CLI="${PLAYWRIGHT_DOCKER_CLI:-}"
PG_DOCKER_IMAGE="${PLAYWRIGHT_PG_DOCKER_IMAGE:-pgvector/pgvector:pg17}"
PG_CONTAINER_NAME="ssoo-playwright-pg-${RUN_ID//./-}"

if [ -z "$PG_BIN_DIR" ] && command -v pg_config >/dev/null 2>&1; then
  PG_BIN_DIR="$(pg_config --bindir)"
fi
if [ -z "$PG_BIN_DIR" ]; then
  for candidate in /usr/lib/postgresql/*/bin; do
    if [ -x "$candidate/pg_ctl" ]; then
      PG_BIN_DIR="$candidate"
      break
    fi
  done
fi

if [ -n "$PG_BIN_DIR" ]; then
  [ -d "$PG_BIN_DIR" ] || {
    echo "[playwright-dms] PLAYWRIGHT_PG_BIN_DIR is not a directory: $PG_BIN_DIR" >&2
    exit 1
  }
  export PATH="$PG_BIN_DIR:$PATH"
fi

if [ -n "$PG_LIB_DIR" ]; then
  [ -d "$PG_LIB_DIR" ] || {
    echo "[playwright-dms] PLAYWRIGHT_PG_LIB_DIR is not a directory: $PG_LIB_DIR" >&2
    exit 1
  }
  export LD_LIBRARY_PATH="$PG_LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi

if [ "$STACK_SELF_TEST" != "1" ] && [ -z "$DOCKER_CLI" ]; then
  if command -v docker >/dev/null 2>&1 && docker version >/dev/null 2>&1; then
    DOCKER_CLI="$(command -v docker)"
  elif [ -x "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe" ] \
    && "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe" version >/dev/null 2>&1; then
    DOCKER_CLI="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
  fi
fi

if [ "$STACK_SELF_TEST" != "1" ] && [ "$POSTGRES_MODE" = "auto" ]; then
  if command -v createdb >/dev/null 2>&1 \
    && command -v dropdb >/dev/null 2>&1 \
    && command -v initdb >/dev/null 2>&1 \
    && command -v pg_ctl >/dev/null 2>&1 \
    && command -v pg_isready >/dev/null 2>&1 \
    && command -v psql >/dev/null 2>&1; then
    POSTGRES_MODE="local"
  elif [ -n "$DOCKER_CLI" ]; then
    POSTGRES_MODE="docker"
  else
    echo "[playwright-dms] PostgreSQL tools and a reachable Docker engine are both unavailable" >&2
    exit 1
  fi
fi
if [ "$STACK_SELF_TEST" != "1" ] && [ "$POSTGRES_MODE" != "local" ] && [ "$POSTGRES_MODE" != "docker" ]; then
  echo "[playwright-dms] PLAYWRIGHT_POSTGRES_MODE must be auto, local, or docker" >&2
  exit 1
fi

SERVER_PID=""
WEB_PID=""
ADMIN_PID=""
SMTP_PID=""
POSTGRES_STARTED=0
POSTGRES_CONTAINER_STARTED=0
OWNERSHIP_ACQUIRED=0

seed_files=(
  00_user_code.sql
  01_project_status_code.sql
  02_project_deliverable_status.sql
  03_project_close_condition.sql
  04_project_handoff_type.sql
  08_unit_code.sql
  09_project_request_sample.sql
  10_project_member_task_issue_code.sql
  05_menu_data.sql
  06_role_menu_permission.sql
  99_user_initial_admin.sql
  11_demo_users_customers.sql
  12_org_foundation_bridge.sql
  13_permission_foundation.sql
  14_pms_project_policy_foundation.sql
  15_dms_access_policy_foundation.sql
  16_sns_access_policy_foundation.sql
  17_demo_project_access_context.sql
  12_demo_project_members.sql
  13_demo_tasks.sql
  14_demo_milestones.sql
  15_demo_issues.sql
  16_demo_deliverables_conditions.sql
  07_user_menu_permission.sql
)

log() {
  echo "[playwright-dms] $*"
}

fail() {
  echo "[playwright-dms] $*" >&2
  exit 1
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "missing required command: $cmd"
}

write_owner_manifest() {
  local status="$1"
  local temp_file="$OWNER_FILE.tmp.$$"
  mkdir -p "$RUNTIME_DIR"
  cat >"$temp_file" <<EOF
{
  "schemaVersion": 1,
  "runId": "$RUN_ID",
  "repoRoot": "$ROOT_DIR",
  "ownerPid": $$,
  "status": "$status",
  "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
  chmod 600 "$temp_file"
  mv "$temp_file" "$OWNER_FILE"
}

assert_runtime_ownership() {
  if [ ! -f "$OWNER_FILE" ]; then
    return
  fi
  if ! grep -Fq "\"runId\": \"$RUN_ID\"" "$OWNER_FILE" \
    || ! grep -Fq "\"repoRoot\": \"$ROOT_DIR\"" "$OWNER_FILE"; then
    fail "runtime ownership mismatch; refusing to reuse $RUNTIME_DIR"
  fi
}

recover_owned_stale_postmaster() {
  local pid_file="$PG_DATA_DIR/postmaster.pid"
  [ -f "$pid_file" ] || return 0
  if pg_ctl -D "$PG_DATA_DIR" status >/dev/null 2>&1; then
    return 0
  fi
  local stale_pid
  stale_pid="$(sed -n '1p' "$pid_file")"
  if [[ "$stale_pid" =~ ^[0-9]+$ ]] && kill -0 "$stale_pid" >/dev/null 2>&1; then
    fail "postgres pid $stale_pid is alive but not owned as a healthy cluster; refusing cleanup"
  fi
  assert_runtime_ownership
  log "removing stale postmaster.pid from owned runtime"
  rm -f "$pid_file"
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM

  if [ -n "$WEB_PID" ] && kill -0 "$WEB_PID" >/dev/null 2>&1; then
    kill "$WEB_PID" >/dev/null 2>&1 || true
    wait "$WEB_PID" >/dev/null 2>&1 || true
  fi

  if [ -n "$ADMIN_PID" ] && kill -0 "$ADMIN_PID" >/dev/null 2>&1; then
    kill "$ADMIN_PID" >/dev/null 2>&1 || true
    wait "$ADMIN_PID" >/dev/null 2>&1 || true
  fi

  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi

  if [ -n "$SMTP_PID" ] && kill -0 "$SMTP_PID" >/dev/null 2>&1; then
    kill "$SMTP_PID" >/dev/null 2>&1 || true
    wait "$SMTP_PID" >/dev/null 2>&1 || true
  fi

  if [ "$POSTGRES_STARTED" = "1" ] && [ -f "$PG_DATA_DIR/postmaster.pid" ]; then
    pg_ctl -D "$PG_DATA_DIR" -m fast stop >/dev/null 2>&1 || true
  fi

  if [ "$POSTGRES_CONTAINER_STARTED" = "1" ]; then
    "$DOCKER_CLI" rm -f "$PG_CONTAINER_NAME" >/dev/null 2>&1 || true
  fi

  if [ "$OWNERSHIP_ACQUIRED" = "1" ]; then
    write_owner_manifest "stopped:$status"
  fi
  exit "$status"
}

trap cleanup EXIT INT TERM

wait_for_postgres() {
  for _ in $(seq 1 60); do
    if [ "$POSTGRES_MODE" = "docker" ]; then
      if "$DOCKER_CLI" exec "$PG_CONTAINER_NAME" pg_isready -U "$DB_USER" >/dev/null 2>&1; then
        return
      fi
    elif pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$DB_USER" >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  fail "local postgres did not become ready on port $PG_PORT"
}

wait_for_http() {
  local url="$1"
  local label="$2"

  for _ in $(seq 1 120); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  fail "$label did not become ready: $url"
}

assert_tcp_port_available() {
  local host="$1"
  local port="$2"
  local label="$3"
  if bash -c "</dev/tcp/$host/$port" >/dev/null 2>&1; then
    fail "$label port is already in use: $host:$port"
  fi
}

bootstrap_postgres() {
  mkdir -p "$PG_DATA_DIR" "$PG_SOCKET_DIR" "$LOG_DIR"
  if [ "$POSTGRES_MODE" = "docker" ]; then
    assert_tcp_port_available "$PG_HOST" "$PG_PORT" "Playwright PostgreSQL"
    log "starting owned pgvector container $PG_CONTAINER_NAME on port $PG_PORT"
    "$DOCKER_CLI" run --rm -d \
      --name "$PG_CONTAINER_NAME" \
      -e POSTGRES_HOST_AUTH_METHOD=trust \
      -e "POSTGRES_USER=$DB_USER" \
      -e POSTGRES_DB=postgres \
      -p "$PG_HOST:$PG_PORT:5432" \
      "$PG_DOCKER_IMAGE" >/dev/null
    POSTGRES_CONTAINER_STARTED=1
    wait_for_postgres
    return
  fi
  recover_owned_stale_postmaster

  if [ ! -f "$PG_DATA_DIR/PG_VERSION" ]; then
    log "initializing local postgres cluster"
    initdb -D "$PG_DATA_DIR" -U "$DB_USER" --auth=trust >/dev/null
  fi

  if ! pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$DB_USER" >/dev/null 2>&1; then
    log "starting local postgres on port $PG_PORT"
    pg_ctl -D "$PG_DATA_DIR" -l "$PG_LOG_FILE" -o "-p $PG_PORT -k $PG_SOCKET_DIR" start >/dev/null
    POSTGRES_STARTED=1
  fi

  wait_for_postgres
}

reset_database() {
  log "resetting local playwright database"
  if [ "$POSTGRES_MODE" = "docker" ]; then
    "$DOCKER_CLI" exec "$PG_CONTAINER_NAME" dropdb --if-exists -U "$DB_USER" "$DB_NAME" >/dev/null 2>&1 || true
    "$DOCKER_CLI" exec "$PG_CONTAINER_NAME" createdb -U "$DB_USER" "$DB_NAME"
  else
    dropdb --if-exists -h "$PG_HOST" -p "$PG_PORT" -U "$DB_USER" "$DB_NAME" >/dev/null 2>&1 || true
    createdb -h "$PG_HOST" -p "$PG_PORT" -U "$DB_USER" "$DB_NAME"
  fi

  if { [ "$POSTGRES_MODE" = "docker" ] \
      && "$DOCKER_CLI" exec "$PG_CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS vector'; \
    } >/dev/null 2>&1 \
    || { [ "$POSTGRES_MODE" = "local" ] \
      && psql "$DATABASE_URL_BASE" -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS vector'; \
    } >/dev/null 2>&1; then
    log "pgvector extension enabled in the isolated playwright database"
  elif [ -n "$PGVECTOR_SQL" ] || [ -n "$PGVECTOR_MODULE_PATH" ]; then
    [ -f "$PGVECTOR_SQL" ] || fail "PLAYWRIGHT_PGVECTOR_SQL must point to a readable extension SQL file"
    [ -f "${PGVECTOR_MODULE_PATH}.so" ] || fail "PLAYWRIGHT_PGVECTOR_MODULE_PATH must point to the extension module without .so"
    log "pgvector extension metadata is unavailable; loading the supplied SQL/module fallback"
    tail -n +4 "$PGVECTOR_SQL" \
      | sed "s|MODULE_PATHNAME|$PGVECTOR_MODULE_PATH|g" \
      | psql "$DATABASE_URL_BASE" -v ON_ERROR_STOP=1 >/dev/null
  else
    fail "pgvector extension is unavailable; install it for PostgreSQL or provide PLAYWRIGHT_PGVECTOR_SQL and PLAYWRIGHT_PGVECTOR_MODULE_PATH"
  fi

  env DATABASE_URL="$DATABASE_URL" pnpm --filter @ssoo/database db:generate
  env DATABASE_URL="$DATABASE_URL" pnpm --filter @ssoo/database db:push

  for seed_file in "${seed_files[@]}"; do
    log "seeding $seed_file"
    if [ "$POSTGRES_MODE" = "docker" ]; then
      "$DOCKER_CLI" exec -i "$PG_CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
        < "$SEED_DIR/$seed_file" >/dev/null
    else
      psql "$DATABASE_URL_BASE" -v ON_ERROR_STOP=1 < "$SEED_DIR/$seed_file" >/dev/null
    fi
  done

  env DATABASE_URL="$DATABASE_URL" pnpm --filter @ssoo/database exec ts-node --project tsconfig.json scripts/apply-triggers.ts
}

write_local_test_env() {
  mkdir -p \
    "$(dirname "$DMS_MARKDOWN_ROOT")" \
    "$INGEST_QUEUE_ROOT" \
    "$LOCAL_STORAGE_ROOT" \
    "$NAS_STORAGE_ROOT"
  cat >"$DMS_LOCAL_ENV_FILE" <<EOF
DMS_LOCAL_TEST_PROFILE=playwright-direct-run
DMS_LOCAL_TEST_SKIP_ROOT_ENV=1
DATABASE_URL=$DATABASE_URL
PORT=$SERVER_PORT
NODE_ENV=development
DMS_INSTANCE_ENV=local-test
CORS_ORIGIN=http://127.0.0.1:$DMS_PORT,http://127.0.0.1:$ADMIN_PORT
JWT_SECRET=playwright-jwt-secret
JWT_REFRESH_SECRET=playwright-jwt-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
AUTH_SESSION_COOKIE_NAME=ssoo-session
AUTH_SESSION_COOKIE_DOMAIN=
AUTH_SESSION_COOKIE_SECURE=false
AUTH_SESSION_COOKIE_SAME_SITE=lax
AUTH_EMAIL_OUTBOX_WORKER_ENABLED=true
AUTH_EMAIL_OUTBOX_INTERVAL_MS=5000
AUTH_EMAIL_OUTBOX_BATCH_LIMIT=20
AUTH_EMAIL_OUTBOX_RUN_ON_START=true
AUTH_EMAIL_SMTP_HOST=$SMTP_HOST
AUTH_EMAIL_SMTP_PORT=$SMTP_PORT
AUTH_EMAIL_SMTP_SECURE=false
AUTH_EMAIL_SMTP_USERNAME=playwright-mailer
AUTH_EMAIL_SMTP_PASSWORD=playwright-mail-password
AUTH_EMAIL_FROM_ADDRESS=no-reply@playwright.example.com
DMS_MARKDOWN_ROOT=$DMS_MARKDOWN_ROOT
DMS_INGEST_QUEUE_PATH=$INGEST_QUEUE_ROOT
DMS_STORAGE_LOCAL_BASE_PATH=$LOCAL_STORAGE_ROOT
DMS_STORAGE_NAS_BASE_PATH=$NAS_STORAGE_ROOT
DMS_LOCAL_TEST_EXPECTED_INGEST_PATH=$INGEST_QUEUE_ROOT
DMS_LOCAL_TEST_EXPECTED_STORAGE_PATH=$LOCAL_STORAGE_ROOT
DMS_GIT_BOOTSTRAP_REMOTE_URL=
DMS_GIT_BOOTSTRAP_BRANCH=master
EOF
}

start_smtp() {
  assert_tcp_port_available "$SMTP_HOST" "$SMTP_PORT" "SMTP capture"
  log "starting SMTP capture server"
  env PLAYWRIGHT_SMTP_HOST="$SMTP_HOST" \
    PLAYWRIGHT_SMTP_PORT="$SMTP_PORT" \
    PLAYWRIGHT_SMTP_CAPTURE_PATH="$SMTP_CAPTURE_PATH" \
    node automation/scripts/playwright/smtp-capture-server.mjs >"$SMTP_LOG_FILE" 2>&1 &
  SMTP_PID=$!

  for _ in $(seq 1 30); do
    if ! kill -0 "$SMTP_PID" >/dev/null 2>&1; then
      fail "SMTP capture process exited before readiness; inspect $SMTP_LOG_FILE"
    fi
    if bash -c "</dev/tcp/$SMTP_HOST/$SMTP_PORT" >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  fail "SMTP capture server did not become ready on $SMTP_HOST:$SMTP_PORT"
}

start_server() {
  assert_tcp_port_available "127.0.0.1" "$SERVER_PORT" "DMS server"
  log "starting DMS local-test server"
  env DMS_LOCAL_TEST_ENV_FILE="$DMS_LOCAL_ENV_FILE" \
    DMS_LOCAL_TEST_SKIP_ROOT_ENV=1 \
    DMS_LOCAL_TEST_EXPECTED_INGEST_PATH="$INGEST_QUEUE_ROOT" \
    DMS_LOCAL_TEST_EXPECTED_STORAGE_PATH="$LOCAL_STORAGE_ROOT" \
    pnpm run dms:local-test:start >"$SERVER_LOG_FILE" 2>&1 &
  SERVER_PID=$!
  wait_for_http "http://127.0.0.1:$SERVER_PORT/api/health" "DMS server"
}

start_web() {
  assert_tcp_port_available "127.0.0.1" "$DMS_PORT" "DMS web"
  log "starting DMS web app"
  if [ "$WEB_MODE" = "development" ]; then
    env DMS_SERVER_API_URL="http://127.0.0.1:$SERVER_PORT/api" \
      NEXT_PUBLIC_API_URL="http://127.0.0.1:$SERVER_PORT/api" \
      NEXT_PUBLIC_WS_URL="http://127.0.0.1:$SERVER_PORT" \
      pnpm --filter web-dms exec next dev --port "$DMS_PORT" --hostname 127.0.0.1 >"$WEB_LOG_FILE" 2>&1 &
  else
    env DMS_SERVER_API_URL="http://127.0.0.1:$SERVER_PORT/api" \
      pnpm --filter web-dms exec next start --port "$DMS_PORT" --hostname 127.0.0.1 >"$WEB_LOG_FILE" 2>&1 &
  fi
  WEB_PID=$!
  wait_for_http "http://127.0.0.1:$DMS_PORT/login" "DMS web app"
}

start_admin() {
  assert_tcp_port_available "127.0.0.1" "$ADMIN_PORT" "Admin web"
  log "starting Admin web app"
  if [ "$WEB_MODE" = "development" ]; then
    env ADMIN_SERVER_API_URL="http://127.0.0.1:$SERVER_PORT/api" \
      NEXT_PUBLIC_API_URL="http://127.0.0.1:$SERVER_PORT/api" \
      pnpm --filter web-admin exec next dev --port "$ADMIN_PORT" --hostname 127.0.0.1 >"$ADMIN_LOG_FILE" 2>&1 &
  else
    env ADMIN_SERVER_API_URL="http://127.0.0.1:$SERVER_PORT/api" \
      NEXT_PUBLIC_API_URL="http://127.0.0.1:$SERVER_PORT/api" \
      pnpm --filter web-admin exec next start --port "$ADMIN_PORT" --hostname 127.0.0.1 >"$ADMIN_LOG_FILE" 2>&1 &
  fi
  ADMIN_PID=$!
  wait_for_http "http://127.0.0.1:$ADMIN_PORT/login" "Admin web app"
}

if [ "$STACK_SELF_TEST" = "1" ]; then
  SELF_TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/ssoo-playwright-stack-self-test.XXXXXX")"
  RUNTIME_DIR="$SELF_TEST_ROOT/runtime"
  OWNER_FILE="$RUNTIME_DIR/owner.json"
  write_owner_manifest "self-test"
  assert_runtime_ownership
  if (RUN_ID="different-run" assert_runtime_ownership) >/dev/null 2>&1; then
    fail "runtime ownership mismatch was accepted"
  fi
  if find "$RUNTIME_DIR" -maxdepth 1 -name '*.tmp.*' -print -quit | grep -q .; then
    fail "atomic owner manifest left a temporary file behind"
  fi
  rm -rf "$SELF_TEST_ROOT"
  log "stack self-test passed: atomic owner manifest and ownership mismatch rejection"
  exit 0
fi

require_cmd curl
if [ "$POSTGRES_MODE" = "local" ]; then
  require_cmd createdb
  require_cmd dropdb
  require_cmd initdb
  require_cmd pg_ctl
  require_cmd pg_isready
  require_cmd psql
else
  [ -n "$DOCKER_CLI" ] && [ -x "$DOCKER_CLI" ] || fail "a reachable Docker CLI is required for PLAYWRIGHT_POSTGRES_MODE=docker"
fi

assert_runtime_ownership
OWNERSHIP_ACQUIRED=1
write_owner_manifest "starting"
log "PostgreSQL mode: $POSTGRES_MODE"

if [ "$SKIP_BUILD" != "1" ]; then
  log "building server, DMS, and Admin apps"
  pnpm --filter server build
  env NEXT_PUBLIC_API_URL="http://127.0.0.1:$SERVER_PORT/api" \
    NEXT_PUBLIC_WS_URL="http://127.0.0.1:$SERVER_PORT" \
    pnpm --filter web-dms build
  env NEXT_PUBLIC_API_URL="http://127.0.0.1:$SERVER_PORT/api" \
    pnpm --filter web-admin build
else
  log "skipping build (PLAYWRIGHT_SKIP_BUILD=1)"
fi

bootstrap_postgres
if [ "$SKIP_DB_RESET" = "1" ]; then
  log "skipping database reset (PLAYWRIGHT_SKIP_DB_RESET=1)"
else
  reset_database
fi
write_local_test_env
start_smtp
start_server
start_admin
start_web

log "DMS/Admin Playwright stack is ready"
write_owner_manifest "ready"
wait -n "$SMTP_PID" "$SERVER_PID" "$WEB_PID" "$ADMIN_PID"
