#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
output_path="${DMS_GIT_HTTP_CREDENTIALS_FILE:-${repo_root}/.runtime/dms/git-http-credentials}"

if [[ "${output_path}" != /* ]]; then
  output_path="${repo_root}/${output_path#./}"
fi

gitlab_user="${GL_USER:-$(git config --local --get codex.gitlabUser 2>/dev/null || true)}"
gitlab_token="${GL_TOKEN:-$(git config --local --get codex.gitlabToken 2>/dev/null || true)}"

if [[ -z "${gitlab_user}" || -z "${gitlab_token}" ]]; then
  echo "[dms-git-http-auth] missing GL_USER/GL_TOKEN or repo-local codex.gitlabUser/codex.gitlabToken" >&2
  exit 1
fi

if [[ "${gitlab_user}" == *$'\n'* || "${gitlab_token}" == *$'\n'* ]]; then
  echo "[dms-git-http-auth] credentials must not contain newlines" >&2
  exit 1
fi

mkdir -p "$(dirname "${output_path}")"
umask 077
temporary_path="$(mktemp "${output_path}.tmp.XXXXXX")"
trap 'rm -f "${temporary_path}"' EXIT

printf 'username=%s\npassword=%s\n' "${gitlab_user}" "${gitlab_token}" >"${temporary_path}"
chmod 600 "${temporary_path}"
mv "${temporary_path}" "${output_path}"
trap - EXIT

unset gitlab_user gitlab_token
echo "[dms-git-http-auth] credential secret prepared: ${output_path}"
