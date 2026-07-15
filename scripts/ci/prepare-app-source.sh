#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:?APP_DIR is required}"
CI_COMMIT_SHA="${CI_COMMIT_SHA:?CI_COMMIT_SHA is required}"
CI_COMMIT_REF_NAME="${CI_COMMIT_REF_NAME:?CI_COMMIT_REF_NAME is required}"

if [[ ! "$CI_COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "[ci-source] invalid CI_COMMIT_SHA: $CI_COMMIT_SHA" >&2
  exit 1
fi

if ! git check-ref-format --branch "$CI_COMMIT_REF_NAME" >/dev/null 2>&1; then
  echo "[ci-source] invalid CI_COMMIT_REF_NAME: $CI_COMMIT_REF_NAME" >&2
  exit 1
fi

if [[ ! -d "$APP_DIR" ]] || ! git -C "$APP_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[ci-source] APP_DIR is not a Git worktree: $APP_DIR" >&2
  exit 1
fi

remote_ref="refs/remotes/origin/$CI_COMMIT_REF_NAME"

echo "[ci-source] syncing ref=$CI_COMMIT_REF_NAME sha=$CI_COMMIT_SHA app_dir=$APP_DIR"
git -C "$APP_DIR" fetch --prune origin \
  "+refs/heads/$CI_COMMIT_REF_NAME:$remote_ref"

if ! git -C "$APP_DIR" cat-file -e "${CI_COMMIT_SHA}^{commit}" 2>/dev/null; then
  echo "[ci-source] commit is unavailable after fetch: $CI_COMMIT_SHA" >&2
  exit 1
fi

git -C "$APP_DIR" reset --hard "$CI_COMMIT_SHA"

actual_sha="$(git -C "$APP_DIR" rev-parse HEAD)"
if [[ "$actual_sha" != "$CI_COMMIT_SHA" ]]; then
  echo "[ci-source] HEAD mismatch: expected=$CI_COMMIT_SHA actual=$actual_sha" >&2
  exit 1
fi

unexpected_changes="$(git -C "$APP_DIR" status --porcelain --untracked-files=normal)"
if [[ -n "$unexpected_changes" ]]; then
  echo "[ci-source] non-ignored worktree files would make the build non-reproducible:" >&2
  printf '%s\n' "$unexpected_changes" >&2
  exit 1
fi

remote_sha="$(git -C "$APP_DIR" rev-parse "$remote_ref")"
echo "[ci-source] ready head=$actual_sha remote_ref=$remote_sha"
