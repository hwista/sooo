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

is_known_service() {
  local candidate="$1"
  local service

  for service in "${services[@]}"; do
    if [[ "$candidate" == "$service" ]]; then
      return 0
    fi
  done
  return 1
}

validate_backup_tag() {
  local backup_tag="$1"

  if [[ ! "$backup_tag" =~ ^[a-zA-Z0-9_.-]+$ ]]; then
    echo "[ci-image] invalid backup tag: $backup_tag" >&2
    exit 1
  fi
}

validate_backup_manifest() {
  local manifest="$1"
  local service backup_image backup_id mode source_id extra
  local count=0
  declare -A seen=()

  if [[ ! -f "$manifest" ]]; then
    echo "[ci-image] backup manifest is missing: $manifest" >&2
    exit 1
  fi

  while IFS='|' read -r service backup_image backup_id mode source_id extra; do
    if [[ -z "$service" || -z "$backup_image" || -z "$backup_id" || -z "$mode" || -z "$source_id" || -n "$extra" ]]; then
      echo "[ci-image] invalid backup manifest row: $service" >&2
      exit 1
    fi
    if ! is_known_service "$service"; then
      echo "[ci-image] unknown backup manifest service: $service" >&2
      exit 1
    fi
    if [[ "$backup_image" != "app-$service:ci-backup-"* ]]; then
      echo "[ci-image] invalid backup image service=$service image=$backup_image" >&2
      exit 1
    fi
    if [[ "$backup_id" != sha256:* || "$source_id" != sha256:* ]]; then
      echo "[ci-image] invalid backup image identity service=$service" >&2
      exit 1
    fi
    if [[ -n "${seen[$service]:-}" ]]; then
      echo "[ci-image] duplicate backup manifest service: $service" >&2
      exit 1
    fi
    case "$mode" in
      image|snapshot|latest) ;;
      *)
        echo "[ci-image] invalid backup mode service=$service mode=$mode" >&2
        exit 1
        ;;
    esac
    seen[$service]=1
    count=$((count + 1))
  done < "$manifest"

  if [[ "$count" -ne "${#services[@]}" ]]; then
    echo "[ci-image] incomplete backup manifest: expected=${#services[@]} actual=$count" >&2
    exit 1
  fi

  for service in "${services[@]}"; do
    if [[ -z "${seen[$service]:-}" ]]; then
      echo "[ci-image] backup manifest missing service: $service" >&2
      exit 1
    fi
  done
}

case "${1:-}" in
  tag-build)
    declare -a built_ids=()
    for service in "${services[@]}"; do
      built_ids+=("$(image_id "app-$service:latest")")
    done

    for index in "${!services[@]}"; do
      service="${services[$index]}"
      latest_image="app-$service:latest"
      commit_image="app-$service:$CI_COMMIT_SHA"
      built_id="${built_ids[$index]}"
      docker tag "$latest_image" "$commit_image"
      commit_id="$(image_id "$commit_image")"
      assert_same_id "build image service=$service" "$built_id" "$commit_id"
      echo "[ci-image] built service=$service image=$commit_image id=$commit_id"
    done
    ;;
  prepare-deploy)
    declare -a commit_ids=()
    for service in "${services[@]}"; do
      commit_ids+=("$(image_id "app-$service:$CI_COMMIT_SHA")")
    done

    for index in "${!services[@]}"; do
      service="${services[$index]}"
      commit_image="app-$service:$CI_COMMIT_SHA"
      latest_image="app-$service:latest"
      commit_id="${commit_ids[$index]}"
      docker tag "$commit_image" "$latest_image"
      latest_id="$(image_id "$latest_image")"
      assert_same_id "deploy preparation service=$service" "$commit_id" "$latest_id"
      echo "[ci-image] selected service=$service image=$commit_image id=$commit_id"
    done
    ;;
  backup-running)
    backup_tag="${2:?backup tag is required}"
    manifest="${3:?backup manifest path is required}"
    validate_backup_tag "$backup_tag"

    if [[ -e "$manifest" ]]; then
      echo "[ci-image] backup manifest already exists: $manifest" >&2
      exit 1
    fi

    declare -a backup_modes=()
    declare -a source_ids=()
    declare -a containers=()
    declare -a backup_images=()

    for service in "${services[@]}"; do
      commit_image="app-$service:$CI_COMMIT_SHA"
      image_id "$commit_image" >/dev/null

      container="ssoo-$service"
      backup_image="app-$service:$backup_tag"
      if source_id="$(docker inspect "$container" --format '{{.Image}}' 2>/dev/null)"; then
        if image_id "$source_id" >/dev/null 2>&1; then
          mode="image"
        else
          mode="snapshot"
        fi
      else
        mode="latest"
        source_id="$(image_id "app-$service:latest")"
      fi

      backup_modes+=("$mode")
      source_ids+=("$source_id")
      containers+=("$container")
      backup_images+=("$backup_image")
      echo "[ci-image] backup planned service=$service mode=$mode source=$source_id image=$backup_image"
    done

    manifest_tmp="${manifest}.partial.$$"
    cleanup_manifest_tmp() {
      rm -f "$manifest_tmp"
    }
    trap cleanup_manifest_tmp EXIT
    : > "$manifest_tmp"

    for index in "${!services[@]}"; do
      service="${services[$index]}"
      mode="${backup_modes[$index]}"
      source_id="${source_ids[$index]}"
      container="${containers[$index]}"
      backup_image="${backup_images[$index]}"

      case "$mode" in
        image|latest)
          docker tag "$source_id" "$backup_image"
          ;;
        snapshot)
          docker commit "$container" "$backup_image" >/dev/null
          ;;
      esac

      backup_id="$(image_id "$backup_image")"
      if [[ "$mode" != "snapshot" ]]; then
        assert_same_id "running backup service=$service" "$source_id" "$backup_id"
      fi
      printf '%s|%s|%s|%s|%s\n' "$service" "$backup_image" "$backup_id" "$mode" "$source_id" >> "$manifest_tmp"
      echo "[ci-image] backed-up service=$service container=$container mode=$mode image=$backup_image source=$source_id id=$backup_id"
    done

    mv "$manifest_tmp" "$manifest"
    trap - EXIT
    echo "[ci-image] backup complete tag=$backup_tag manifest=$manifest services=${#services[@]}"
    ;;
  restore-backup)
    manifest="${2:?backup manifest path is required}"
    validate_backup_manifest "$manifest"

    while IFS='|' read -r service backup_image backup_id mode source_id; do
      actual_backup_id="$(image_id "$backup_image")"
      assert_same_id "rollback backup service=$service" "$backup_id" "$actual_backup_id"
    done < "$manifest"

    while IFS='|' read -r service backup_image backup_id mode source_id; do
      latest_image="app-$service:latest"
      docker tag "$backup_image" "$latest_image"
      latest_id="$(image_id "$latest_image")"
      assert_same_id "rollback selection service=$service" "$backup_id" "$latest_id"
      echo "[ci-image] rollback selected service=$service mode=$mode image=$backup_image id=$backup_id"
    done < "$manifest"
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
  verify-backup)
    manifest="${2:?backup manifest path is required}"
    validate_backup_manifest "$manifest"

    while IFS='|' read -r service backup_image backup_id mode source_id; do
      actual_backup_id="$(image_id "$backup_image")"
      assert_same_id "rollback backup service=$service" "$backup_id" "$actual_backup_id"
      container_id="$(docker inspect "ssoo-$service" --format '{{.Image}}')"
      assert_same_id "rolled-back container service=$service" "$backup_id" "$container_id"
      echo "[ci-image] rolled-back service=$service container=ssoo-$service mode=$mode id=$container_id"
    done < "$manifest"
    ;;
  *)
    echo "usage: $0 <tag-build|prepare-deploy|backup-running TAG MANIFEST|restore-backup MANIFEST|verify-deploy|verify-backup MANIFEST>" >&2
    exit 2
    ;;
esac
