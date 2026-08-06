#!/usr/bin/env bash
set -euo pipefail

job="${1:-}"
CI_PROJECT_DIR="${CI_PROJECT_DIR:?CI_PROJECT_DIR is required}"
APP_DIR="${APP_DIR:?APP_DIR is required}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-app}"
lock_file="${CI_APP_LOCK_FILE:-/tmp/ssoo-app-runtime.lock}"
lock_timeout="${CI_APP_LOCK_TIMEOUT_SECONDS:-7200}"
deploy_health_wait="${CI_DEPLOY_HEALTH_WAIT_SECONDS:-60}"
backup_manifest_dir="${CI_BACKUP_MANIFEST_DIR:-/tmp}"
last_backup_tag_file="${CI_LAST_BACKUP_TAG_FILE:-/tmp/ssoo-ci-last-backup-tag}"
last_backup_manifest_file="${CI_LAST_BACKUP_MANIFEST_FILE:-/tmp/ssoo-ci-last-backup-manifest}"
build_cache_keep_storage="${CI_BUILD_CACHE_KEEP_STORAGE:-8GB}"
build_min_free_kb="${CI_BUILD_MIN_FREE_KB:-8388608}"
build_parallel_limit="${CI_BUILD_PARALLEL_LIMIT:-1}"

if [[ ! "$deploy_health_wait" =~ ^[0-9]+$ ]]; then
  echo "[ci-job] CI_DEPLOY_HEALTH_WAIT_SECONDS must be a non-negative integer" >&2
  exit 1
fi
if [[ ! -d "$backup_manifest_dir" ]]; then
  echo "[ci-job] backup manifest directory is missing: $backup_manifest_dir" >&2
  exit 1
fi
if [[ ! "$build_cache_keep_storage" =~ ^[0-9]+([KMGT]B)?$ ]]; then
  echo "[ci-job] CI_BUILD_CACHE_KEEP_STORAGE must be a Docker storage size such as 8GB" >&2
  exit 1
fi
if [[ ! "$build_min_free_kb" =~ ^[0-9]+$ ]]; then
  echo "[ci-job] CI_BUILD_MIN_FREE_KB must be a non-negative integer" >&2
  exit 1
fi
if [[ ! "$build_parallel_limit" =~ ^[1-9][0-9]*$ ]]; then
  echo "[ci-job] CI_BUILD_PARALLEL_LIMIT must be a positive integer" >&2
  exit 1
fi

case "$job" in
  verify|ai-review|build|deploy) ;;
  *)
    echo "usage: $0 <verify|ai-review|build|deploy>" >&2
    exit 2
    ;;
esac

if ! command -v flock >/dev/null 2>&1; then
  echo "[ci-job] flock is required on the shell runner" >&2
  exit 1
fi

prepare_build_capacity() {
  local context="$1"
  local docker_root capacity_probe available_kb

  echo "[ci-job] Docker capacity preflight context=$context cache_keep=$build_cache_keep_storage min_free_kb=$build_min_free_kb"
  docker system df || true
  docker builder prune --all --force --keep-storage "$build_cache_keep_storage"
  docker image prune --force

  docker_root="$(docker info --format '{{.DockerRootDir}}')"
  if [[ -z "$docker_root" ]]; then
    echo "[ci-job] Docker root directory is unavailable" >&2
    return 1
  fi
  capacity_probe="$docker_root"
  if ! available_kb="$(df -Pk "$capacity_probe" 2>/dev/null | awk 'NR == 2 { print $4 }')"; then
    capacity_probe="$(dirname "$docker_root")"
    available_kb="$(df -Pk "$capacity_probe" | awk 'NR == 2 { print $4 }')"
  fi
  if [[ ! "$available_kb" =~ ^[0-9]+$ ]]; then
    echo "[ci-job] unable to determine Docker filesystem capacity root=$docker_root probe=$capacity_probe" >&2
    return 1
  fi

  if (( available_kb < build_min_free_kb )); then
    echo "[ci-job] Docker capacity pressure detected; pruning all unused BuildKit cache available_kb=$available_kb required_kb=$build_min_free_kb"
    docker builder prune --all --force
    docker image prune --force

    capacity_probe="$docker_root"
    if ! available_kb="$(df -Pk "$capacity_probe" 2>/dev/null | awk 'NR == 2 { print $4 }')"; then
      capacity_probe="$(dirname "$docker_root")"
      available_kb="$(df -Pk "$capacity_probe" | awk 'NR == 2 { print $4 }')"
    fi
    if [[ ! "$available_kb" =~ ^[0-9]+$ ]]; then
      echo "[ci-job] unable to determine Docker filesystem capacity after pressure cleanup root=$docker_root probe=$capacity_probe" >&2
      return 1
    fi
  fi

  docker system df || true
  echo "[ci-job] Docker capacity ready context=$context root=$docker_root probe=$capacity_probe available_kb=$available_kb min_free_kb=$build_min_free_kb"
  if (( available_kb < build_min_free_kb )); then
    echo "[ci-job] insufficient Docker filesystem capacity after safe cache cleanup: available_kb=$available_kb required_kb=$build_min_free_kb" >&2
    return 1
  fi
}

exec 9>"$lock_file"
echo "[ci-job] waiting for lock job=$job file=$lock_file timeout=${lock_timeout}s"
if ! flock -w "$lock_timeout" 9; then
  echo "[ci-job] timed out waiting for shared APP_DIR/Docker lock" >&2
  exit 1
fi

echo "[ci-job] acquired lock job=$job"
if [[ "$job" == "verify" || "$job" == "build" ]]; then
  prepare_build_capacity "$job"
fi
bash "$CI_PROJECT_DIR/scripts/ci/prepare-app-source.sh"
cd "$APP_DIR"

check_stack_health() {
  local context="$1"
  local health_failed=0
  local service status

  echo "[ci-job] waiting ${deploy_health_wait}s before $context health check"
  if [[ "$deploy_health_wait" -gt 0 ]]; then
    sleep "$deploy_health_wait"
  fi
  docker compose -p "$COMPOSE_PROJECT_NAME" ps || return $?
  for service in postgres server pms dms sns admin crm; do
    status="$(docker inspect "ssoo-$service" --format '{{.State.Health.Status}}' 2>/dev/null || echo "na")"
    echo "[ci-job] health context=$context container=ssoo-$service status=$status"
    if [[ "$status" != "healthy" ]]; then
      health_failed=1
    fi
  done

  if [[ "$health_failed" != "0" ]]; then
    echo "[ci-job] $context health check failed" >&2
    return 1
  fi
}

deploy_selected_images() {
  local backup_manifest="$1"

  bash scripts/ci/image-provenance.sh prepare-deploy || return $?
  docker compose -p "$COMPOSE_PROJECT_NAME" up -d --no-build || return $?
  check_stack_health deployment || return $?
  bash scripts/ci/image-provenance.sh verify-deploy || return $?
  echo "[ci-job] deployment verification passed manifest=$backup_manifest"
}

restore_previous_images() {
  local backup_manifest="$1"

  bash scripts/ci/image-provenance.sh restore-backup "$backup_manifest" || return $?
  docker compose -p "$COMPOSE_PROJECT_NAME" up -d --no-build || return $?
  check_stack_health rollback || return $?
  bash scripts/ci/image-provenance.sh verify-backup "$backup_manifest" || return $?
  echo "[ci-job] rollback verification passed manifest=$backup_manifest"
}

case "$job" in
  verify)
    echo "파이프라인 동작 확인"
    echo "푸시한 사람 ${GITLAB_USER_NAME:-unknown}"
    echo "브랜치 $CI_COMMIT_REF_NAME"
    echo "커밋 ${CI_COMMIT_SHORT_SHA:-${CI_COMMIT_SHA:0:8}}"
    verify_image="app-ci-verify:$CI_COMMIT_SHA"
    cleanup_verify_image() {
      docker image rm "$verify_image" >/dev/null 2>&1 || true
    }
    trap cleanup_verify_image EXIT
    docker build \
      --file docker/ci-verify.Dockerfile \
      --label "com.ssoo.ci.commit=$CI_COMMIT_SHA" \
      --tag "$verify_image" \
      .
    docker run --rm \
      --volume "$APP_DIR/.git:/app/.git:ro" \
      "$verify_image" \
      bash -lc '
        pnpm run verify:gitlab-pipeline
        pnpm run codex:preflight
        pnpm lint
        pnpm test:server
      '
    ;;
  ai-review)
    bash scripts/ci/ai-review.sh
    ;;
  build)
    echo "전체 이미지 빌드 시작 (BuildKit, parallel_limit=$build_parallel_limit)"
    docker compose --parallel "$build_parallel_limit" -p "$COMPOSE_PROJECT_NAME" build
    bash scripts/ci/image-provenance.sh tag-build
    echo "빌드 완료"
    ;;
  deploy)
    echo "development 배포 시작"
    backup_tag="ci-backup-$(date +%Y%m%d_%H%M%S)-${CI_JOB_ID:-$$}"
    backup_manifest="$backup_manifest_dir/ssoo-${backup_tag}.manifest"
    echo "백업 태그 $backup_tag"
    bash scripts/ci/image-provenance.sh backup-running "$backup_tag" "$backup_manifest"
    echo "$backup_tag" > "$last_backup_tag_file"
    echo "$backup_manifest" > "$last_backup_manifest_file"

    set +e
    deploy_selected_images "$backup_manifest"
    deploy_status=$?
    set -e
    if [[ "$deploy_status" != "0" ]]; then
      echo "[ci-job] deployment failed status=$deploy_status; starting automatic rollback" >&2
      set +e
      restore_previous_images "$backup_manifest"
      rollback_status=$?
      set -e
      if [[ "$rollback_status" == "0" ]]; then
        echo "[ci-job] deployment failed but automatic rollback succeeded" >&2
      else
        echo "[ci-job] deployment and automatic rollback failed rollback_status=$rollback_status; manual recovery required manifest=$backup_manifest" >&2
      fi
      exit 1
    fi
    echo "배포 완료"
    ;;
esac

echo "[ci-job] completed job=$job"
