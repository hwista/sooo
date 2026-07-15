#!/usr/bin/env bash
set -euo pipefail

CI_COMMIT_SHA="${CI_COMMIT_SHA:?CI_COMMIT_SHA is required}"

if [[ ! "$CI_COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "[ci-image] invalid CI_COMMIT_SHA: $CI_COMMIT_SHA" >&2
  exit 1
fi

read -r -a services <<< "${CI_IMAGE_SERVICES:-server pms dms sns admin crm db-init}"

image_id() {
  docker image inspect "$1" --format '{{.Id}}'
}

assert_same_id() {
  local context="$1"
  local expected="$2"
  local actual="$3"

  if [[ "$expected" != "$actual" ]]; then
    echo "[ci-image] $context mismatch: expected=$expected actual=$actual" >&2
    exit 1
  fi
}

case "${1:-}" in
  tag-build)
    for service in "${services[@]}"; do
      latest_image="app-$service:latest"
      commit_image="app-$service:$CI_COMMIT_SHA"
      built_id="$(image_id "$latest_image")"
      docker tag "$latest_image" "$commit_image"
      commit_id="$(image_id "$commit_image")"
      assert_same_id "build image service=$service" "$built_id" "$commit_id"
      echo "[ci-image] built service=$service image=$commit_image id=$commit_id"
    done
    ;;
  prepare-deploy)
    for service in "${services[@]}"; do
      commit_image="app-$service:$CI_COMMIT_SHA"
      latest_image="app-$service:latest"
      commit_id="$(image_id "$commit_image")"
      docker tag "$commit_image" "$latest_image"
      latest_id="$(image_id "$latest_image")"
      assert_same_id "deploy preparation service=$service" "$commit_id" "$latest_id"
      echo "[ci-image] selected service=$service image=$commit_image id=$commit_id"
    done
    ;;
  backup-running)
    backup_tag="${2:?backup tag is required}"
    if [[ ! "$backup_tag" =~ ^[a-zA-Z0-9_.-]+$ ]]; then
      echo "[ci-image] invalid backup tag: $backup_tag" >&2
      exit 1
    fi

    for service in "${services[@]}"; do
      container="ssoo-$service"
      backup_image="app-$service:$backup_tag"
      if running_id="$(docker inspect "$container" --format '{{.Image}}' 2>/dev/null)"; then
        docker tag "$running_id" "$backup_image"
        backup_id="$(image_id "$backup_image")"
        assert_same_id "running backup service=$service" "$running_id" "$backup_id"
        echo "[ci-image] backed-up service=$service container=$container image=$backup_image id=$backup_id"
      else
        latest_image="app-$service:latest"
        latest_id="$(image_id "$latest_image")"
        docker tag "$latest_image" "$backup_image"
        backup_id="$(image_id "$backup_image")"
        assert_same_id "first-deploy backup service=$service" "$latest_id" "$backup_id"
        echo "[ci-image] backed-up service=$service fallback=$latest_image image=$backup_image id=$backup_id"
      fi
    done
    ;;
  verify-deploy)
    for service in "${services[@]}"; do
      commit_image="app-$service:$CI_COMMIT_SHA"
      container="ssoo-$service"
      expected_id="$(image_id "$commit_image")"
      container_id="$(docker inspect "$container" --format '{{.Image}}')"
      assert_same_id "deployed container service=$service" "$expected_id" "$container_id"
      echo "[ci-image] deployed service=$service container=$container id=$container_id"
    done
    ;;
  *)
    echo "usage: $0 <tag-build|backup-running TAG|prepare-deploy|verify-deploy>" >&2
    exit 2
    ;;
esac
