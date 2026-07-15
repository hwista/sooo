#!/usr/bin/env bash
set -euo pipefail

job="${1:-}"
CI_PROJECT_DIR="${CI_PROJECT_DIR:?CI_PROJECT_DIR is required}"
APP_DIR="${APP_DIR:?APP_DIR is required}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-app}"
lock_file="${CI_APP_LOCK_FILE:-/tmp/ssoo-app-runtime.lock}"
lock_timeout="${CI_APP_LOCK_TIMEOUT_SECONDS:-7200}"

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

exec 9>"$lock_file"
echo "[ci-job] waiting for lock job=$job file=$lock_file timeout=${lock_timeout}s"
if ! flock -w "$lock_timeout" 9; then
  echo "[ci-job] timed out waiting for shared APP_DIR/Docker lock" >&2
  exit 1
fi

echo "[ci-job] acquired lock job=$job"
bash "$CI_PROJECT_DIR/scripts/ci/prepare-app-source.sh"
cd "$APP_DIR"

case "$job" in
  verify)
    echo "파이프라인 동작 확인"
    echo "푸시한 사람 ${GITLAB_USER_NAME:-unknown}"
    echo "브랜치 $CI_COMMIT_REF_NAME"
    echo "커밋 ${CI_COMMIT_SHORT_SHA:-${CI_COMMIT_SHA:0:8}}"
    pnpm install --frozen-lockfile
    pnpm run verify:gitlab-pipeline
    pnpm run codex:preflight
    pnpm lint
    pnpm test:server
    ;;
  ai-review)
    bash scripts/ci/ai-review.sh
    ;;
  build)
    echo "전체 이미지 빌드 시작 (BuildKit, 순차)"
    docker compose -p "$COMPOSE_PROJECT_NAME" build
    bash scripts/ci/image-provenance.sh tag-build
    echo "빌드 완료"
    ;;
  deploy)
    echo "development 배포 시작"
    backup_tag="ci-backup-$(date +%Y%m%d_%H%M%S)"
    echo "백업 태그 $backup_tag"
    bash scripts/ci/image-provenance.sh backup-running "$backup_tag"
    echo "$backup_tag" > /tmp/ssoo-ci-last-backup-tag
    bash scripts/ci/image-provenance.sh prepare-deploy
    docker compose -p "$COMPOSE_PROJECT_NAME" up -d --no-build
    echo "60초 대기 후 health check"
    sleep 60
    docker compose -p "$COMPOSE_PROJECT_NAME" ps
    health_failed=0
    for service in postgres server pms dms sns admin crm; do
      status="$(docker inspect "ssoo-$service" --format '{{.State.Health.Status}}' 2>/dev/null || echo "na")"
      echo "ssoo-$service $status"
      if [[ "$status" != "healthy" ]]; then
        health_failed=1
      fi
    done
    [[ "$health_failed" == "0" ]] || { echo "[ci-job] deployment health check failed" >&2; exit 1; }
    bash scripts/ci/image-provenance.sh verify-deploy
    echo "배포 완료"
    ;;
esac

echo "[ci-job] completed job=$job"
