#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
pipeline="$repo_root/.gitlab-ci.yml"
source_sync="$repo_root/scripts/ci/prepare-app-source.sh"
image_provenance="$repo_root/scripts/ci/image-provenance.sh"
job_runner="$repo_root/scripts/ci/run-app-job.sh"
ci_verify_dockerfile="$repo_root/docker/ci-verify.Dockerfile"
gitignore="$repo_root/.gitignore"
dockerignore="$repo_root/.dockerignore"
test_root="$(mktemp -d)"

cleanup() {
  rm -rf "$test_root"
}
trap cleanup EXIT

fail() {
  echo "[gitlab-pipeline-test] $1" >&2
  exit 1
}

assert_contains() {
  local file="$1"
  local expected="$2"
  grep -Fq -- "$expected" "$file" || fail "missing '$expected' in $file"
}

assert_count() {
  local file="$1"
  local expected="$2"
  local count="$3"
  local actual
  actual="$(grep -Fc -- "$expected" "$file")"
  [[ "$actual" == "$count" ]] || fail "expected $count occurrences of '$expected' in $file, found $actual"
}

bash -n "$source_sync"
bash -n "$image_provenance"
bash -n "$job_runner"

assert_count "$pipeline" 'bash "$CI_PROJECT_DIR/scripts/ci/run-app-job.sh"' 4
assert_contains "$pipeline" 'bash "$CI_PROJECT_DIR/scripts/ci/run-app-job.sh" verify'
assert_contains "$pipeline" 'bash "$CI_PROJECT_DIR/scripts/ci/run-app-job.sh" ai-review'
assert_contains "$pipeline" 'bash "$CI_PROJECT_DIR/scripts/ci/run-app-job.sh" build'
assert_contains "$pipeline" 'bash "$CI_PROJECT_DIR/scripts/ci/run-app-job.sh" deploy'
assert_contains "$pipeline" 'when: manual'

if grep -Fq 'resource_group:' "$pipeline"; then
  fail "pipeline uses resource_group, which is unsupported by the current GitLab version"
fi

assert_contains "$job_runner" 'flock -w "$lock_timeout" 9'
assert_contains "$job_runner" 'docker/ci-verify.Dockerfile'
assert_contains "$job_runner" '--volume "$APP_DIR/.git:/app/.git:ro"'
assert_contains "$job_runner" 'pnpm run verify:gitlab-pipeline'
assert_contains "$job_runner" 'pnpm run codex:preflight'
assert_contains "$job_runner" 'pnpm lint'
assert_contains "$job_runner" 'pnpm test:server'
assert_contains "$job_runner" 'bash scripts/ci/image-provenance.sh tag-build'
assert_contains "$job_runner" 'bash scripts/ci/image-provenance.sh backup-running "$backup_tag"'
assert_contains "$job_runner" 'bash scripts/ci/image-provenance.sh prepare-deploy'
assert_contains "$job_runner" 'bash scripts/ci/image-provenance.sh verify-deploy'
assert_contains "$job_runner" 'docker compose -p "$COMPOSE_PROJECT_NAME" up -d --no-build'
assert_contains "$job_runner" '[[ "$health_failed" == "0" ]]'
assert_contains "$gitignore" '.env.*'
assert_contains "$gitignore" 'compose.yaml.bak*'
assert_contains "$dockerignore" '.env.*'
assert_contains "$dockerignore" 'compose.yaml.bak*'
assert_contains "$ci_verify_dockerfile" 'FROM node:20'
assert_contains "$ci_verify_dockerfile" 'corepack prepare pnpm@10.28.0 --activate'
assert_contains "$ci_verify_dockerfile" 'pnpm install --frozen-lockfile'

if grep -Fxq '.gitignore' "$dockerignore"; then
  fail "CI verify image excludes the tracked Git ignore contract"
fi

if grep -Fq 'git reset --hard "origin/$CI_COMMIT_REF_NAME"' "$pipeline"; then
  fail "pipeline still resets to an unfetched mutable remote ref"
fi

remote="$test_root/remote.git"
seed="$test_root/seed"
app="$test_root/app"

git init --bare "$remote" >/dev/null
git init -b development "$seed" >/dev/null
git -C "$seed" config user.name "CI Contract Test"
git -C "$seed" config user.email "ci-contract@example.invalid"
cp "$gitignore" "$seed/.gitignore"
printf 'first\n' > "$seed/version.txt"
git -C "$seed" add .gitignore version.txt
git -C "$seed" commit -m "first" >/dev/null
git -C "$seed" remote add origin "$remote"
git -C "$seed" push -u origin development >/dev/null
first_sha="$(git -C "$seed" rev-parse HEAD)"

git clone --branch development "$remote" "$app" >/dev/null 2>&1
printf 'second\n' > "$seed/version.txt"
git -C "$seed" commit -am "second" >/dev/null
git -C "$seed" push origin development >/dev/null
second_sha="$(git -C "$seed" rev-parse HEAD)"
git -C "$app" reset --hard "$first_sha" >/dev/null

APP_DIR="$app" CI_COMMIT_REF_NAME=development CI_COMMIT_SHA="$second_sha" \
  bash "$source_sync" >/dev/null

[[ "$(git -C "$app" rev-parse HEAD)" == "$second_sha" ]] || fail "source sync did not select CI_COMMIT_SHA"
[[ "$(<"$app/version.txt")" == "second" ]] || fail "source sync left stale file content"

printf 'operator backup\n' > "$app/.env.bak.contract"
printf 'operator backup\n' > "$app/compose.yaml.bak.contract"
APP_DIR="$app" CI_COMMIT_REF_NAME=development CI_COMMIT_SHA="$second_sha" \
  bash "$source_sync" >/dev/null

printf 'unexpected\n' > "$app/untracked.txt"
if APP_DIR="$app" CI_COMMIT_REF_NAME=development CI_COMMIT_SHA="$second_sha" \
  bash "$source_sync" >/dev/null 2>&1; then
  fail "source sync accepted an unexpected non-ignored file"
fi
rm -f "$app/untracked.txt"

if APP_DIR="$app" CI_COMMIT_REF_NAME=development CI_COMMIT_SHA=invalid \
  bash "$source_sync" >/dev/null 2>&1; then
  fail "source sync accepted an invalid commit SHA"
fi

fake_bin="$test_root/bin"
fake_state="$test_root/docker-state"
mkdir -p "$fake_bin"

cat > "$fake_bin/docker" <<'FAKE_DOCKER'
#!/usr/bin/env bash
set -euo pipefail

state="${FAKE_DOCKER_STATE:?}"

lookup() {
  if [[ "$1" == sha256:* ]]; then
    printf '%s\n' "$1"
    return
  fi
  awk -F '|' -v key="$1" '$1 == key { value = $2 } END { if (value == "") exit 1; print value }' "$state"
}

set_value() {
  local key="$1"
  local value="$2"
  local next="${state}.next"
  awk -F '|' -v key="$key" '$1 != key' "$state" > "$next"
  printf '%s|%s\n' "$key" "$value" >> "$next"
  mv "$next" "$state"
}

case "${1:-}" in
  image)
    [[ "${2:-}" == "inspect" ]] || exit 2
    lookup "$3"
    ;;
  tag)
    source_id="$(lookup "$2")"
    set_value "$3" "$source_id"
    ;;
  inspect)
    lookup "container:$2"
    ;;
  *)
    exit 2
    ;;
esac
FAKE_DOCKER
chmod +x "$fake_bin/docker"

services=(server pms dms sns admin crm db-init)
for service in "${services[@]}"; do
  printf 'app-%s:latest|sha256:%s-built\n' "$service" "$service" >> "$fake_state"
  printf 'container:ssoo-%s|sha256:%s-running\n' "$service" "$service" >> "$fake_state"
done

PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" CI_COMMIT_SHA="$second_sha" \
  bash "$image_provenance" tag-build >/dev/null

for service in "${services[@]}"; do
  assert_contains "$fake_state" "app-$service:$second_sha|sha256:$service-built"
done

PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" CI_COMMIT_SHA="$second_sha" \
  bash "$image_provenance" backup-running ci-backup-test >/dev/null

for service in "${services[@]}"; do
  assert_contains "$fake_state" "app-$service:ci-backup-test|sha256:$service-running"
done

set_state() {
  local key="$1"
  local value="$2"
  local next="${fake_state}.next"
  awk -F '|' -v key="$key" '$1 != key' "$fake_state" > "$next"
  printf '%s|%s\n' "$key" "$value" >> "$next"
  mv "$next" "$fake_state"
}

for service in "${services[@]}"; do
  set_state "app-$service:latest" "sha256:$service-newer"
done

PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" CI_COMMIT_SHA="$second_sha" \
  bash "$image_provenance" prepare-deploy >/dev/null

for service in "${services[@]}"; do
  assert_contains "$fake_state" "app-$service:latest|sha256:$service-built"
  set_state "container:ssoo-$service" "sha256:$service-built"
done

PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" CI_COMMIT_SHA="$second_sha" \
  bash "$image_provenance" verify-deploy >/dev/null

set_state "container:ssoo-dms" "sha256:wrong-image"
if PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" CI_COMMIT_SHA="$second_sha" \
  bash "$image_provenance" verify-deploy >/dev/null 2>&1; then
  fail "image provenance accepted a mismatched deployed container"
fi

echo "[gitlab-pipeline-test] exact source and image provenance contracts passed"
