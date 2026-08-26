#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

changed_matches() {
  local pattern="$1"
  if command -v rg >/dev/null 2>&1; then
    rg -q "$pattern" <<< "$CHANGED"
    return
  fi

  grep -Eq "$pattern" <<< "$CHANGED"
}

CHANGED="$(
  {
    git diff --name-only --cached || true
    git diff --name-only || true
    git ls-files --others --exclude-standard || true
  } | sort -u
)"

echo "[dms-guard] validating DMS runtime profile contract"
pnpm run verify:dms-runtime-profile-contract

if changed_matches '^apps/web/(admin|dms)/|^automation/(playwright\.config\.ts|scripts/playwright/start-dms-e2e-stack\.sh|tests/e2e/)|^scripts/(dms-go-live-contract|run-dms-go-live-gate|verify-dms-launch-contract|verify-prisma-deepmerge-security)\.mjs$|^docs/dms/|^pnpm-(lock|workspace)\.yaml$|^package\.json$'; then
  echo "[dms-guard] validating launch evidence contract"
  pnpm run verify:dms-launch-contract
  pnpm run verify:dms-launch-types
fi

if ! changed_matches '^apps/web/dms/'; then
  echo "[dms-guard] no DMS app changes detected. launch contract check complete."
  exit 0
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "[dms-guard] rg not found. using grep fallback."
fi

echo "[dms-guard] validating shell body slot contract"
pnpm --filter web-dms check:shell-body-contract

echo "[dms-guard] validating golden example conventions"
pnpm --filter web-dms check:golden-example

echo "[dms-guard] validating document hydration contract"
pnpm --filter web-dms check:document-hydration-contract

echo "[dms-guard] DMS changes detected. running workspace build for web-dms"
bash .codex/scripts/dms-build.sh

echo "[dms-guard] completed."
