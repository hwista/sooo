#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

function readText(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf-8');
}

function assertIncludes(content, pattern, message) {
  if (!content.includes(pattern)) {
    throw new Error(message);
  }
}

function assertNotIncludes(content, pattern, message) {
  if (content.includes(pattern)) {
    throw new Error(message);
  }
}

function assertFile(relativePath) {
  readText(relativePath);
}

function assertRouteProxy(relativePath, upstreamPath, method = 'GET') {
  const route = readText(relativePath);
  assertIncludes(route, upstreamPath, `${relativePath} must proxy ${upstreamPath}`);
  assertIncludes(route, `method: '${method}'`, `${relativePath} must proxy with ${method}`);
}

function assertForwardCrmJsonRoute(relativePath, upstreamPath, method = 'GET') {
  const route = readText(relativePath);
  assertIncludes(route, 'forwardCrmJson', `${relativePath} must use the shared CRM JSON proxy`);
  assertIncludes(route, upstreamPath, `${relativePath} must proxy ${upstreamPath}`);
  assertIncludes(route, `'${method}'`, `${relativePath} must proxy with ${method}`);
}

function assertOpenApiOperation(document, pathValue, method) {
  if (!document.paths?.[pathValue]?.[method.toLowerCase()]) {
    throw new Error(`CRM OpenAPI must expose ${method.toUpperCase()} ${pathValue}`);
  }
}

[
  'apps/server/src/modules/crm/crm.module.ts',
  'apps/server/src/modules/crm/access/access.service.ts',
  'apps/server/src/modules/crm/access/access.service.spec.ts',
  'apps/server/src/modules/crm/opportunity/opportunity.controller.ts',
  'apps/server/src/modules/crm/opportunity/dto/opportunity.dto.ts',
  'apps/server/src/modules/crm/opportunity/dto/opportunity.dto.spec.ts',
  'apps/server/src/modules/crm/opportunity/opportunity.service.ts',
  'apps/server/src/modules/crm/opportunity/opportunity.service.spec.ts',
  'apps/server/src/modules/crm/customer/customer.controller.ts',
  'apps/server/src/modules/crm/customer/customer.service.ts',
  'apps/server/src/modules/crm/customer/customer.service.spec.ts',
  'apps/server/src/modules/crm/contract/contract.controller.ts',
  'apps/server/src/modules/crm/contract/contract.service.ts',
  'apps/server/src/modules/crm/contract/contract.service.spec.ts',
  'apps/server/src/modules/crm/business-plan/business-plan.controller.ts',
  'apps/server/src/modules/crm/business-plan/business-plan.service.ts',
  'apps/server/src/modules/crm/business-plan/business-plan.service.spec.ts',
  'apps/server/src/modules/crm/cost-plan/cost-plan.controller.ts',
  'apps/server/src/modules/crm/cost-plan/accounting-payment-external-executor.service.ts',
  'apps/server/src/modules/crm/cost-plan/accounting-payment-external-executor.service.spec.ts',
  'apps/server/src/modules/crm/cost-plan/cost-plan.service.ts',
  'apps/server/src/modules/crm/cost-plan/cost-plan.service.spec.ts',
  'apps/server/src/modules/crm/reports/reports.controller.ts',
  'apps/server/src/modules/crm/reports/reports.service.ts',
  'apps/server/src/modules/crm/reports/reports.service.spec.ts',
  'apps/server/src/modules/crm/dashboard/dashboard.controller.ts',
  'apps/server/src/modules/crm/dashboard/dashboard.service.ts',
  'apps/server/src/modules/crm/dashboard/dashboard.service.spec.ts',
  'apps/server/src/modules/crm/operations/operations.controller.ts',
  'apps/server/src/modules/crm/operations/operations.service.ts',
  'apps/server/src/modules/crm/operations/operations.service.spec.ts',
  'apps/server/src/modules/crm/operations/data-quality.service.ts',
  'apps/server/src/modules/crm/operations/data-quality.service.spec.ts',
  'apps/server/src/modules/crm/operations/readiness.service.ts',
  'apps/server/src/modules/crm/operations/readiness.service.spec.ts',
  'apps/server/src/modules/crm/operations/launch-readiness.service.ts',
  'apps/server/src/modules/crm/operations/launch-readiness.service.spec.ts',
  'apps/server/src/modules/crm/operations/settings.controller.ts',
  'apps/server/src/modules/crm/operations/settings.service.ts',
  'apps/server/src/modules/crm/operations/settings.service.spec.ts',
  'apps/server/src/modules/crm/operations/operation-attempt.module.ts',
  'apps/server/src/modules/crm/operations/operation-attempt.service.ts',
  'apps/server/src/modules/crm/operations/operation-attempt.service.spec.ts',
  'apps/server/src/modules/crm/operations/operation-retry.service.ts',
  'apps/server/src/modules/crm/operations/dto/attempts.dto.ts',
  'apps/server/src/modules/crm/operations/dto/settings.dto.ts',
  'apps/server/src/modules/crm/access/crm-operations-feature.guard.ts',
  'apps/server/src/modules/crm/access/require-crm-operations-feature.decorator.ts',
  'apps/server/src/modules/crm/search/crm-ai-index.adapter.ts',
  'apps/server/src/modules/crm/search/crm-ai-index.adapter.spec.ts',
  'apps/server/src/modules/dms/crm-contract-lifecycle/crm-contract-lifecycle.service.ts',
  'apps/server/src/modules/dms/crm-contract-lifecycle/crm-contract-lifecycle.service.spec.ts',
  'apps/server/src/modules/dms/crm-quote-lifecycle/crm-quote-lifecycle.service.ts',
  'apps/server/src/modules/dms/crm-quote-lifecycle/crm-quote-lifecycle.service.spec.ts',
  'apps/server/src/modules/pms/project/project-handoff-contract.service.ts',
  'apps/server/src/modules/pms/project/project-handoff-contract.service.spec.ts',
  'apps/web/pms/src/lib/api/endpoints/crmHandoff.ts',
  'apps/web/pms/src/hooks/queries/useCrmHandoff.ts',
  'packages/types/src/crm/access.ts',
  'packages/types/src/crm/business-plan.ts',
  'packages/types/src/crm/contract.ts',
  'packages/types/src/crm/cost-plan.ts',
  'packages/types/src/crm/customer.ts',
  'packages/types/src/crm/dashboard.ts',
  'packages/types/src/crm/operations.ts',
  'packages/types/src/crm/opportunity.ts',
  'packages/types/src/crm/quote.ts',
  'packages/types/src/crm/reports.ts',
  'packages/types/src/crm/index.ts',
  'packages/types/src/common/launch-readiness.ts',
  'packages/types/src/index.ts',
  'packages/database/prisma/migrations/20260702090000_add_crm_opportunity_ledger/migration.sql',
  'packages/database/prisma/migrations/20260706170000_add_crm_contract_ledger/migration.sql',
  'packages/database/prisma/migrations/20260707090000_add_crm_quote_workflow/migration.sql',
  'packages/database/prisma/migrations/20260707100000_add_crm_quote_seller_profile/migration.sql',
  'packages/database/prisma/migrations/20260707110000_add_crm_opportunity_owner_user/migration.sql',
  'packages/database/prisma/migrations/20260707123000_add_crm_business_plan_ledger/migration.sql',
  'packages/database/prisma/migrations/20260707133000_add_crm_customer_activity_ledger/migration.sql',
  'packages/database/prisma/migrations/20260708110000_add_crm_business_plan_monthly_input/migration.sql',
  'packages/database/prisma/migrations/20260708123000_add_crm_cost_plan_internal_monthly/migration.sql',
  'packages/database/prisma/migrations/20260708133000_add_crm_cost_plan_ams_vendor_wbs_mapping/migration.sql',
  'packages/database/prisma/migrations/20260708143000_add_crm_cost_plan_ams_external_monthly/migration.sql',
  'packages/database/prisma/migrations/20260708150000_add_crm_cost_plan_internal_confirmation/migration.sql',
  'packages/database/prisma/migrations/20260708160000_add_crm_cost_plan_ams_external_confirmation/migration.sql',
  'packages/database/prisma/migrations/20260709100000_add_crm_business_plan_performance_actual/migration.sql',
  'packages/database/prisma/migrations/20260709110000_add_crm_report_confirmation/migration.sql',
  'packages/database/prisma/migrations/20260709120000_add_crm_contract_dms_handoff/migration.sql',
  'packages/database/prisma/migrations/20260709133000_add_crm_cost_plan_accounting_handoff/migration.sql',
  'packages/database/prisma/migrations/20260709143000_add_crm_cost_plan_accounting_execution_evidence/migration.sql',
  'packages/database/prisma/migrations/20260710100000_add_crm_quote_dms_handoff/migration.sql',
  'packages/database/prisma/seeds/18_crm_access_policy_foundation.sql',
  'packages/database/prisma/seeds/52_crm_opportunities.sql',
  'packages/database/prisma/seeds/53_crm_quote_seller_profile.sql',
  'packages/database/prisma/seeds/54_crm_business_plan.sql',
  'packages/database/prisma/seeds/55_crm_customer_activity.sql',
  'packages/database/prisma/seeds/56_crm_source_contracts.sql',
  'packages/database/prisma/seeds/57_crm_launch_operations.sql',
  'packages/database/prisma/seeds/apply_all_seeds.sql',
  'packages/database/prisma/triggers/66_crm_opportunity_h_trigger.sql',
  'packages/database/prisma/triggers/67_crm_opportunity_line_h_trigger.sql',
  'packages/database/prisma/triggers/73_crm_quote_seller_profile_h_trigger.sql',
  'packages/database/prisma/triggers/74_crm_business_plan_h_trigger.sql',
  'packages/database/prisma/triggers/75_crm_customer_h_trigger.sql',
  'packages/database/prisma/triggers/76_crm_customer_activity_h_trigger.sql',
  'packages/database/prisma/triggers/79_crm_config_h_trigger.sql',
  'packages/database/prisma/triggers/80_crm_operation_attempt_h_trigger.sql',
  'packages/database/prisma/launch-migrations/20260813090000_add_crm_launch_operations/migration.sql',
  'scripts/verify-crm-migration-completion.mjs',
  'scripts/verify-crm-local-evidence.mjs',
  'scripts/verify-crm-core-runtime.mjs',
  'scripts/verify-crm-current-demo-parity.mjs',
  'scripts/repository-worktree-identity.mjs',
  'scripts/crm-ralph-build-provenance.mjs',
  'scripts/build-crm-ralph-runtime.mjs',
  'scripts/prepare-crm-ralph-runtime.mjs',
  'scripts/run-crm-ralph-process.mjs',
  'scripts/crm-source-prototype-root.mjs',
  'scripts/capture-crm-source-uiux-reference.mjs',
  'scripts/verify-crm-goal-contract.mjs',
  'scripts/verify-crm-uiux-parity-evidence.mjs',
  'scripts/verify-crm-quote-parity.mjs',
  'scripts/verify-crm-test-isolation.mjs',
  'scripts/verify-crm-launch-operations-evidence.mjs',
  'scripts/verify-crm-go-live.mjs',
  'scripts/verify-crm-go-live-browser-evidence.mjs',
  'scripts/verify-crm-source-sample.mjs',
  'scripts/verify-crm-domain-access-runtime.mjs',
  'scripts/verify-crm-readiness-consistency.mjs',
  'scripts/verify-crm-production-runtime-contract.mjs',
  'scripts/verify-crm-accounting-payment-provider.mjs',
  'scripts/verify-crm-accounting-payment-provider-report.mjs',
  'scripts/verify-crm-ai-rag-runtime-evidence.mjs',
  'scripts/verify-crm-ai-rag-runtime-report.mjs',
  'scripts/verify-crm-protected-source-reflection-report.mjs',
  'scripts/inspect-crm-migration-inputs.mjs',
  'scripts/prepare-crm-migration-evidence-bundle.mjs',
  'scripts/prepare-crm-local-evidence-bundle.mjs',
  'scripts/verify-crm-migration-evidence-bundle.mjs',
  'docs/crm/README.md',
  'docs/crm/planning/backlog.md',
  'docs/crm/planning/source-parity-matrix.md',
  'docs/crm/planning/source-uiux-parity-spec.md',
  'docs/crm/planning/demo-100-verification-contract.md',
  'docs/crm/planning/source-migration-prd.md',
  'docs/crm/planning/launch-operations-prd.md',
  'docs/crm/planning/launch-operations-test-plan.md',
  'docs/crm/planning/launch-operations-handoff.md',
  'docs/crm/reference/source-demo-test-guide.md',
  'docs/crm/reference/source-identity-mapping.json',
  'docs/crm/reference/source-sample-baseline.json',
  'docs/crm/reference/crm-domain-access-policy.md',
  'docs/crm/reference/crm-readiness-snapshot-contract.md',
  'docs/crm/reference/crm-production-runtime-contract.md',
  'docs/crm/guides/go-live-external-inputs.md',
  'docs/crm/reference/api/openapi.json',
  'apps/web/crm/src/app/(main)/operations/settings/page.tsx',
  'apps/web/crm/src/lib/crmWorkspaceRoutes.ts',
  'apps/web/crm/src/components/pages/operations/LaunchOperationsSurface.tsx',
  'apps/web/crm/src/components/pages/settings/CrmSettingsWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/settings/CrmSettingsWorkspaceMdiPage.tsx',
  'apps/web/crm/src/app/api/crm/operations/launch-readiness/route.ts',
  'apps/web/crm/src/app/api/crm/quote-seller-profile/ci/route.ts',
  'apps/web/admin/src/app/api/launch-readiness/route.ts',
  'apps/web/admin/src/app/api/launch-readiness/readinessContract.ts',
  'apps/web/admin/src/components/pages/dashboard/LaunchReadinessPanel.tsx',
  'apps/server/src/modules/dms/settings/settings-readiness-cache.service.spec.ts',
  'apps/web/dms/src/components/pages/settings/_components/RuntimeReadinessSurface.tsx',
  'apps/web/dms/src/app/(main)/settings/operations/git/page.tsx',
  'apps/web/dms/src/lib/constants/routes.ts',
  'apps/web/dms/src/middleware.ts',
].forEach(assertFile);

const crmOpportunitySeed = readText('packages/database/prisma/seeds/52_crm_opportunities.sql');
[
  "'삼성전자', 'ERP 시스템 구축 프로젝트'",
  "'현대자동차', 'SCM 플랫폼 고도화'",
  "'LG화학', 'MES 고도화 및 스마트팩토리 구현'",
  "'SK하이닉스', '하이브리드 클라우드 인프라 전환'",
  "'카카오', 'AI 기반 데이터 분석 플랫폼 구축'",
  "'포스코', '스마트팩토리 2단계 구축'",
].forEach((marker) => assertIncludes(crmOpportunitySeed, marker, `CRM source opportunity seed must preserve ${marker}`));
assertNotIncludes(crmOpportunitySeed, "'cost', 'product-cost'", 'CRM source cost product rows must use the shared product category');

const crmContractSeed = readText('packages/database/prisma/seeds/56_crm_source_contracts.sql');
[
  "'crm-source-ct-001'",
  "'crm-source-ct-002'",
  "'crm-source-ct-003'",
  "'crm-source-ct-004'",
  "'crm-source-ct-005'",
].forEach((marker) => assertIncludes(crmContractSeed, marker, `CRM source contract seed must preserve ${marker}`));

const crmSourceSampleVerifier = readText('scripts/verify-crm-source-sample.mjs');
assertIncludes(crmSourceSampleVerifier, 'source-sample-baseline.json', 'CRM source sample verifier must load the fixed value baseline');
assertIncludes(crmSourceSampleVerifier, 'source-identity-mapping.json', 'CRM source sample verifier must load the explicit identity mapping');
assertIncludes(crmSourceSampleVerifier, 'two-pass idempotency', 'CRM source sample verifier must prove isolated two-pass idempotency');
assertIncludes(crmSourceSampleVerifier, 'ssoo_crm_ralph_', 'CRM source sample reseed must be restricted to an isolated Ralph database');
const crmSourceSampleBaseline = readText('docs/crm/reference/source-sample-baseline.json');
assertNotIncludes(crmSourceSampleBaseline, '"pending"', 'CRM source sample baseline must contain fixed hashes');
const crmSourceIdentityMapping = readText('docs/crm/reference/source-identity-mapping.json');
assertIncludes(crmSourceIdentityMapping, '"createsProductionAccounts": false', 'CRM source identity mapping must not create production accounts');
assertIncludes(crmSourceIdentityMapping, '"identityEquivalenceClaimed": false', 'CRM source identity mapping must distinguish functional aliases from real identities');

const allSeeds = readText('packages/database/prisma/seeds/apply_all_seeds.sql');
assertIncludes(allSeeds, '\\i 52_crm_opportunities.sql', 'all CRM seeds must apply source opportunity samples');
assertIncludes(allSeeds, '\\i 56_crm_source_contracts.sql', 'all CRM seeds must apply source contract samples');

const packageJson = readText('package.json');
assertIncludes(packageJson, '"verify:crm-launch": "pnpm run verify:crm-launch:observed"', 'root package must expose observed CRM launch verifier');
assertIncludes(packageJson, '"verify:crm-launch:raw": "node scripts/verify-crm-launch-readiness.mjs"', 'root package must expose raw CRM launch verifier');
assertIncludes(packageJson, '"verify:crm-goal-contract": "pnpm run verify:crm-goal-contract:observed"', 'root package must expose observed CRM goal-contract verifier');
assertIncludes(packageJson, '"verify:crm-goal-contract:raw": "node scripts/verify-crm-goal-contract.mjs"', 'root package must expose raw CRM goal-contract verifier');
assertIncludes(packageJson, '"verify:crm-goal-contract:structure": "node scripts/verify-crm-goal-contract.mjs --structure-only"', 'root package must expose diagnostic-only CRM goal-contract structure verifier');
assertIncludes(packageJson, '"verify:crm-goal-contract:self-test": "node scripts/verify-crm-goal-contract.mjs --self-test"', 'root package must expose CRM goal-contract positive/negative self-test');
assertIncludes(packageJson, '"verify:crm-uiux-parity": "pnpm run verify:crm-uiux-parity:observed"', 'root package must expose observed CRM source/target UI/UX evidence verification');
assertIncludes(packageJson, '"verify:crm-uiux-parity:raw": "node scripts/verify-crm-uiux-parity-evidence.mjs"', 'root package must expose raw CRM source/target UI/UX evidence verification');
assertIncludes(packageJson, '"verify:crm-uiux-parity:all": "node scripts/verify-crm-uiux-parity-evidence.mjs --require-all"', 'root package must expose the final all-UX evidence gate');
assertIncludes(packageJson, '"verify:crm-uiux-parity:self-test": "node scripts/verify-crm-uiux-parity-evidence.mjs --self-test"', 'root package must expose CRM UI/UX evidence positive/negative self-test');
assertIncludes(packageJson, '"verify:crm-worktree-identity:self-test": "node scripts/repository-worktree-identity.mjs --self-test"', 'root package must expose CRM worktree identity self-test');
assertIncludes(packageJson, '"verify:crm-core-runtime": "node scripts/verify-crm-core-runtime.mjs"', 'root package must expose isolated CRM core runtime verifier');
assertIncludes(packageJson, '"verify:crm-current-demo": "node scripts/verify-crm-current-demo-parity.mjs"', 'root package must expose current-revision strict CRM demo parity verifier');
assertIncludes(packageJson, '"verify:crm-current-demo:self-test": "node scripts/verify-crm-current-demo-parity.mjs --self-test"', 'root package must expose strict CRM demo parity negative self-test');
assertIncludes(packageJson, '"build:crm-ralph-runtime": "node scripts/build-crm-ralph-runtime.mjs"', 'root package must expose current-revision CRM Ralph production build preparation');
assertIncludes(packageJson, '"verify:crm-source-sample": "pnpm run verify:crm-source-sample:observed"', 'root package must expose observed CRM source-sample verifier');
assertIncludes(packageJson, '"verify:crm-source-sample:raw": "node scripts/verify-crm-source-sample.mjs"', 'root package must expose raw CRM source-sample verifier');
assertIncludes(packageJson, '"verify:crm-source-sample:reseed": "node scripts/verify-crm-source-sample.mjs --reseed"', 'root package must expose isolated two-pass CRM source-sample verifier');
assertIncludes(packageJson, '"verify:crm-domain-access-runtime": "node scripts/verify-crm-domain-access-runtime.mjs"', 'root package must expose isolated CRM domain access runtime verifier');
assertIncludes(packageJson, '"verify:crm-readiness-consistency": "node scripts/verify-crm-readiness-consistency.mjs"', 'root package must expose CRM/DMS/Admin readiness consistency verifier');
assertIncludes(packageJson, '"verify:crm-secret-masking": "node scripts/verify-crm-secret-masking.mjs"', 'root package must expose the CRM secret masking verifier');
assertIncludes(packageJson, '"verify:crm-operation-recovery": "node scripts/verify-crm-operation-recovery.mjs run"', 'root package must expose isolated CRM operation recovery verification');
assertIncludes(packageJson, '"verify:crm-production-runtime-contract": "node scripts/verify-crm-production-runtime-contract.mjs"', 'root package must expose CRM production runtime contract verification');
assertIncludes(packageJson, '"verify:crm-quote-parity": "node scripts/verify-crm-quote-parity.mjs"', 'root package must expose CRM quote artifact parity verification');
assertIncludes(packageJson, '"verify:crm-test-isolation": "node scripts/verify-crm-test-isolation.mjs audit"', 'root package must expose CRM test isolation audit');
assertIncludes(packageJson, '"verify:crm-test-residue": "node scripts/verify-crm-test-isolation.mjs verify-destroyed"', 'root package must expose CRM destroyed-state residue verification');
assertIncludes(packageJson, '"record:crm-launch-repo-evidence": "node scripts/verify-crm-launch-operations-evidence.mjs record-bt25"', 'root package must expose CRM launch repository evidence recording');
assertIncludes(packageJson, '"verify:crm-launch-operations": "node scripts/verify-crm-launch-operations-evidence.mjs verify"', 'root package must expose CRM launch operations evidence verification');
assertIncludes(packageJson, '"verify:crm-go-live": "node scripts/verify-crm-go-live.mjs"', 'root package must expose CRM production go-live verification');
assertIncludes(packageJson, '"verify:crm-go-live:input": "node scripts/verify-crm-go-live.mjs --input-only"', 'root package must expose CRM go-live input verification');
assertIncludes(packageJson, '"verify:crm-go-live:self-test": "node scripts/verify-crm-go-live.mjs --self-test"', 'root package must expose CRM go-live verifier self-test');
assertIncludes(packageJson, '"prepare:crm-go-live-input": "node scripts/verify-crm-go-live.mjs --template"', 'root package must expose CRM go-live input packet template');
assertIncludes(packageJson, '"verify:crm-go-live:final": "node scripts/verify-crm-go-live-browser-evidence.mjs"', 'root package must expose CRM final browser evidence verification');
assertIncludes(packageJson, '"verify:crm-go-live:final:self-test": "node scripts/verify-crm-go-live-browser-evidence.mjs --self-test"', 'root package must expose CRM final browser evidence verifier self-test');
assertIncludes(packageJson, '"prepare:crm-go-live-browser-evidence": "node scripts/verify-crm-go-live-browser-evidence.mjs --template"', 'root package must expose CRM browser evidence manifest template');

const crmGoLiveApiVerifier = readText('scripts/verify-crm-go-live.mjs');
assertIncludes(crmGoLiveApiVerifier, "contract: 'CRM-S15-GO-LIVE-API'", 'CRM live API verifier must use the API-only evidence contract');
assertIncludes(crmGoLiveApiVerifier, "status: 'PASS_LIVE_API_READY'", 'CRM live API verifier must not claim final go-live');
assertIncludes(crmGoLiveApiVerifier, 'finalGoLive: false', 'CRM live API verifier must mark final go-live false');
assertIncludes(crmGoLiveApiVerifier, 'browserRequired: true', 'CRM live API verifier must require final browser evidence');

const crmGoLiveFinalVerifier = readText('scripts/verify-crm-go-live-browser-evidence.mjs');
assertIncludes(crmGoLiveFinalVerifier, "contract: 'CRM-S15-FINAL-GO-LIVE'", 'CRM final verifier must own the final go-live contract');
assertIncludes(crmGoLiveFinalVerifier, "'desktop-1440x1000'", 'CRM final verifier must require the desktop viewport');
assertIncludes(crmGoLiveFinalVerifier, "'mobile-390x844'", 'CRM final verifier must require the mobile viewport');
assertIncludes(crmGoLiveFinalVerifier, "'quote-print-pdf'", 'CRM final verifier must require the browser quote PDF');
assertIncludes(crmGoLiveFinalVerifier, "'dms-quote-docx'", 'CRM final verifier must require the DMS quote DOCX');
assertIncludes(crmGoLiveFinalVerifier, "'dms-quote-pdf'", 'CRM final verifier must require the DMS quote PDF');
assertIncludes(crmGoLiveFinalVerifier, 'DMS_GO_LIVE_TRACK_IDS', 'CRM final verifier must require the canonical DMS five-track final GO evidence');
assertIncludes(crmGoLiveFinalVerifier, 'consoleLog', 'CRM final verifier must bind the Playwright console log for each viewport');
assertIncludes(crmGoLiveFinalVerifier, 'networkLog', 'CRM final verifier must bind the Playwright network log for each viewport');
assertIncludes(crmGoLiveFinalVerifier, "path.join(root, 'manifest.json')", 'CRM final verifier must bind the adjacent DMS evidence manifest');
assertIncludes(crmGoLiveFinalVerifier, "schemaVersion: 3", 'CRM browser evidence template must use the derived surface-proof schema');
assertIncludes(crmGoLiveFinalVerifier, 'resolveContainedEvidencePath', 'CRM final verifier must contain browser and DMS evidence paths inside their real evidence roots');
assertIncludes(crmGoLiveFinalVerifier, 'requiredOrigins', 'CRM final verifier must bind network logs to all production app origins');
assertIncludes(crmGoLiveFinalVerifier, 'validateApiReadiness', 'CRM final verifier must bind browser readiness surfaces to validated API snapshot identities');
assertIncludes(crmGoLiveFinalVerifier, 'assertions is forbidden', 'CRM final verifier must reject submitter-authored surface assertion booleans');
assertIncludes(crmGoLiveFinalVerifier, 'seller CI image request', 'CRM final verifier must observe the seller CI request in each browser run');
assertIncludes(crmGoLiveFinalVerifier, 'assertSnapshotContainsCiImage', 'CRM final verifier must derive visible CI presence from accessibility snapshots');
assertIncludes(crmGoLiveFinalVerifier, 'dimensions must equal', 'CRM final verifier must compare PNG IHDR dimensions with the declared viewport');
assertIncludes(crmGoLiveFinalVerifier, 'manifest.quoteVerification', 'CRM final verifier must bind the verified quote identity and amount equation');
assertIncludes(crmGoLiveFinalVerifier, 'getDocumentProxy', 'CRM final verifier must reopen and text-extract PDF artifacts');
assertIncludes(crmGoLiveFinalVerifier, 'word/document.xml', 'CRM final verifier must reopen and inspect DOCX document XML');
assertIncludes(crmGoLiveFinalVerifier, 'unresolved template placeholders', 'CRM final verifier must derive unresolved placeholder count from artifact content');
const crmSourcePrototypeRoot = readText('scripts/crm-source-prototype-root.mjs');
const crmSourceUiuxCapture = readText('scripts/capture-crm-source-uiux-reference.mjs');
const crmTargetUiuxCapture = readText('scripts/capture-crm-target-uiux-parity.mjs');
const crmUiuxEvidenceVerifier = readText('scripts/verify-crm-uiux-parity-evidence.mjs');
const crmWorktreeIdentity = readText('scripts/repository-worktree-identity.mjs');
const crmGoalContract = readText('scripts/verify-crm-goal-contract.mjs');
const crmCoreRuntime = readText('scripts/verify-crm-core-runtime.mjs');
const crmCurrentDemoParity = readText('scripts/verify-crm-current-demo-parity.mjs');
const crmRalphBuildProvenance = readText('scripts/crm-ralph-build-provenance.mjs');
const crmRalphBuild = readText('scripts/build-crm-ralph-runtime.mjs');
const crmRalphRuntimePreparation = readText('scripts/prepare-crm-ralph-runtime.mjs');
const crmRalphProcess = readText('scripts/run-crm-ralph-process.mjs');
assertIncludes(crmSourcePrototypeRoot, "resolution: 'single-wrapper'", 'CRM source resolver must support one unambiguous wrapper directory');
assertIncludes(crmSourcePrototypeRoot, 'entries.length === 1', 'CRM source resolver must reject wrapper directories with sibling entries');
assertIncludes(crmSourceUiuxCapture, 'resolveCrmSourcePrototypeRoot', 'CRM source capture must share the fail-closed prototype root resolver');
assertIncludes(crmGoalContract, 'resolveCrmSourcePrototypeRoot', 'CRM goal contract must share the fail-closed prototype root resolver');
assertIncludes(crmTargetUiuxCapture, 'worktreeIdentity', 'CRM target UI/UX capture must bind evidence to repository file contents');
assertIncludes(crmUiuxEvidenceVerifier, 'targetManifest.version !== 2', 'CRM UI/UX evidence verifier must require the revision-bound schema');
assertIncludes(crmUiuxEvidenceVerifier, 'assertRepositoryWorktreeIdentity', 'CRM UI/UX evidence verifier must reject stale worktree evidence');
assertIncludes(crmWorktreeIdentity, 'git-tracked-and-untracked-working-files', 'CRM worktree identity must hash tracked and untracked working files');
assertIncludes(crmWorktreeIdentity, 'same-status tracked content change', 'CRM worktree identity self-test must reject same-status content changes');
assertIncludes(crmCoreRuntime, 'ssoo_crm_ralph_', 'CRM core runtime verifier must be restricted to an isolated database');
assertIncludes(crmCoreRuntime, 'BT-05-opportunity-core', 'CRM core runtime verifier must execute opportunity CRUD/calculation/version semantics');
assertIncludes(crmCoreRuntime, 'BT-11-business-plan-core', 'CRM core runtime verifier must execute business-plan workflow semantics');
assertIncludes(crmCoreRuntime, 'activeResidue', 'CRM core runtime verifier must enforce scoped residue cleanup');
assertIncludes(crmCurrentDemoParity, "rangeIds('SRC', 1, 28)", 'CRM current-demo gate must fix the 28-point functional denominator');
assertIncludes(crmCurrentDemoParity, "rangeIds('UX', 1, 17)", 'CRM current-demo gate must fix the 17-point UI/UX denominator');
assertIncludes(crmCurrentDemoParity, 'completed === 45', 'CRM current-demo gate must require exact 45/45 completion');
assertIncludes(crmCurrentDemoParity, 'target UI/UX manifest must contain exactly 83 states', 'CRM current-demo gate must require all 83 target states');
assertIncludes(crmCurrentDemoParity, 'runtime-provenance', 'CRM current-demo gate must bind live builds to runtime provenance');
assertIncludes(crmCurrentDemoParity, 'changed worktree identity did not invalidate all current points', 'CRM current-demo self-test must reject stale worktree evidence');
assertIncludes(crmCurrentDemoParity, 'runtime-provenance-final', 'CRM current-demo gate must recheck build provenance after every runtime command');
assertIncludes(crmCurrentDemoParity, 'A pre-runtime local report proves', 'CRM current-demo gate must consume local evidence without rebuilding a live runtime');
assertIncludes(crmRalphBuildProvenance, 'compiledPublicRuntime', 'CRM Ralph build provenance must inspect compiled public runtime values');
assertIncludes(crmRalphBuildProvenance, "collectFiles(repoRoot, `${root}/static`)", 'CRM Ralph build fingerprint must cover Next static chunks');
assertIncludes(crmRalphBuildProvenance, "collectFiles(repoRoot, `${root}/server`)", 'CRM Ralph build fingerprint must cover Next server chunks');
assertIncludes(crmRalphBuild, 'NEXT_PUBLIC_API_URL: publicApiUrl', 'CRM Ralph build must compile the isolated public API URL');
assertIncludes(crmRalphBuild, "'--force'", 'CRM Ralph build must bypass stale build caches');
assertIncludes(crmRalphRuntimePreparation, 'readCrmRalphBuildReport', 'CRM Ralph database preparation must reject missing or stale builds before creating a database');
assertIncludes(crmRalphProcess, 'assertCrmRalphBuildArtifact', 'CRM Ralph process launch must reject a changed production artifact');
assertIncludes(packageJson, '"cleanup:crm-operation-recovery": "node scripts/verify-crm-operation-recovery.mjs cleanup"', 'root package must expose exact CRM operation recovery cleanup');
assertIncludes(packageJson, '"capture:crm-source-uiux": "node scripts/capture-crm-source-uiux-reference.mjs"', 'root package must expose deterministic CRM source UI/UX capture');
assertIncludes(packageJson, '"verify:crm-local": "pnpm run verify:crm-local:observed"', 'root package must expose observed CRM local verifier');
assertIncludes(packageJson, '"verify:crm-local:raw": "node scripts/verify-crm-local-evidence.mjs"', 'root package must expose raw CRM local verifier');
assertIncludes(packageJson, '"verify:crm-local:observed": "bash scripts/run-observed-command.sh --command \'pnpm run verify:crm-local:raw\' --verification-command-label \'pnpm run verify:crm-local:raw\'"', 'root package must expose observed CRM local verifier wrapper');
assertIncludes(packageJson, '"verify:crm-migration-completion": "node scripts/verify-crm-migration-completion.mjs"', 'root package must expose CRM migration completion audit');
assertIncludes(packageJson, '"verify:crm-migration-completion:with-extensions": "node scripts/verify-crm-migration-completion.mjs --require-extensions"', 'root package must expose explicit CRM extension readiness audit');
assertIncludes(packageJson, '"inspect:crm-migration-inputs": "node scripts/inspect-crm-migration-inputs.mjs"', 'root package must expose CRM migration input inspector');
assertIncludes(packageJson, '"inspect:crm-migration-inputs:self-test": "node scripts/inspect-crm-migration-inputs.mjs --self-test"', 'root package must expose CRM migration input inspector self-test');
assertIncludes(packageJson, '"prepare:crm-migration-evidence": "node scripts/prepare-crm-migration-evidence-bundle.mjs"', 'root package must expose CRM migration evidence bundle preparer');
assertIncludes(packageJson, '"prepare:crm-migration-evidence:self-test": "node scripts/prepare-crm-migration-evidence-bundle.mjs --self-test"', 'root package must expose CRM migration evidence bundle preparer self-test');
assertIncludes(packageJson, '"prepare:crm-local-evidence-bundle": "node scripts/prepare-crm-local-evidence-bundle.mjs"', 'root package must expose CRM local evidence bundle preparer');
assertIncludes(packageJson, '"prepare:crm-local-evidence-bundle:self-test": "node scripts/prepare-crm-local-evidence-bundle.mjs --self-test"', 'root package must expose CRM local evidence bundle preparer self-test');
assertIncludes(packageJson, '"verify:crm-migration-evidence-bundle": "node scripts/verify-crm-migration-evidence-bundle.mjs"', 'root package must expose CRM migration evidence bundle verifier');
assertIncludes(packageJson, '"verify:crm-migration-evidence-bundle:self-test": "node scripts/verify-crm-migration-evidence-bundle.mjs --self-test"', 'root package must expose CRM migration evidence bundle verifier self-test');
assertIncludes(packageJson, '"verify:crm-accounting-payment-provider": "node scripts/verify-crm-accounting-payment-provider.mjs"', 'root package must expose CRM accounting/payment provider verifier');
assertIncludes(packageJson, '"verify:crm-accounting-payment-provider:ready-precheck": "node scripts/verify-crm-accounting-payment-provider.mjs --dry-run --provider-mode=ready --check-provider-env"', 'root package must expose CRM accounting/payment provider-ready precheck verifier');
assertIncludes(packageJson, '"verify:crm-accounting-payment-provider-report": "node scripts/verify-crm-accounting-payment-provider-report.mjs"', 'root package must expose CRM accounting/payment provider execution report verifier');
assertIncludes(packageJson, '"verify:crm-accounting-payment-provider-report:template": "node scripts/verify-crm-accounting-payment-provider-report.mjs --template"', 'root package must expose CRM accounting/payment provider execution report template');
assertIncludes(packageJson, '"verify:crm-accounting-payment-provider-report:self-test": "node scripts/verify-crm-accounting-payment-provider-report.mjs --self-test"', 'root package must expose CRM accounting/payment provider execution report verifier self-test');
assertIncludes(packageJson, '"verify:crm-ai-rag-runtime-report": "node scripts/verify-crm-ai-rag-runtime-report.mjs"', 'root package must expose CRM AI/RAG provider-ready runtime report verifier');
assertIncludes(packageJson, '"verify:crm-ai-rag-runtime-report:template": "node scripts/verify-crm-ai-rag-runtime-report.mjs --template"', 'root package must expose CRM AI/RAG provider-ready runtime report template');
assertIncludes(packageJson, '"verify:crm-ai-rag-runtime-report:self-test": "node scripts/verify-crm-ai-rag-runtime-report.mjs --self-test"', 'root package must expose CRM AI/RAG provider-ready runtime report verifier self-test');
assertIncludes(packageJson, '"verify:crm-protected-source-reflection-report": "node scripts/verify-crm-protected-source-reflection-report.mjs"', 'root package must expose CRM protected source reflection report verifier');
assertIncludes(packageJson, '"verify:crm-protected-source-reflection-report:template": "node scripts/verify-crm-protected-source-reflection-report.mjs --template"', 'root package must expose CRM protected source reflection report template');
assertIncludes(packageJson, '"verify:crm-protected-source-reflection-report:self-test": "node scripts/verify-crm-protected-source-reflection-report.mjs --self-test"', 'root package must expose CRM protected source reflection report verifier self-test');

[
  'apps/web/crm/src/app/(main)/page.tsx',
  'apps/web/crm/src/app/(main)/customers/page.tsx',
  'apps/web/crm/src/app/(main)/contracts/page.tsx',
  'apps/web/crm/src/app/(main)/contract-performance/page.tsx',
  'apps/web/crm/src/app/(main)/reports/page.tsx',
  'apps/web/crm/src/app/(main)/business-plan/page.tsx',
  'apps/web/crm/src/app/(main)/business-plan-performance/page.tsx',
  'apps/web/crm/src/app/(main)/cost-plan/page.tsx',
  'apps/web/crm/src/app/(main)/quote-settings/page.tsx',
  'apps/web/crm/src/app/(main)/operations/page.tsx',
  'apps/web/crm/src/components/layout/ContentArea.tsx',
  'apps/web/crm/src/components/pages/opportunities/OpportunityWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/customers/CustomerWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/contracts/ContractWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/contracts/ContractPerformanceWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/reports/ReportsPreviewWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/reports/reportsPreviewQuery.ts',
  'apps/web/crm/src/components/pages/business-plan/BusinessPlanPreviewWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/business-plan-performance/BusinessPlanPerformancePreviewWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/cost-plan/CostPlanPreviewWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/quote-settings/QuoteSellerProfileWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/operations/OperationsPreviewWorkspaceClient.tsx',
].forEach(assertFile);

const crmRouteConstants = readText('apps/web/crm/src/lib/constants/routes.ts');
for (const workspacePath of [
  '/customers',
  '/quote-settings',
  '/contracts',
  '/contract-performance',
  '/reports',
  '/business-plan',
  '/business-plan-performance',
  '/cost-plan',
  '/operations',
  '/operations/settings',
]) {
  assertIncludes(crmRouteConstants, `'${workspacePath}'`, `CRM middleware must allow direct workspace entry ${workspacePath}`);
}

const crmWorkspaceRoutes = readText('apps/web/crm/src/lib/crmWorkspaceRoutes.ts');
assertIncludes(crmWorkspaceRoutes, "{ pathname: '/operations/settings', title: 'CRM 시스템 설정' }", 'CRM settings owner route must have deterministic MDI metadata');
assertIncludes(crmWorkspaceRoutes, "{ pathname: '/settings', title: 'CRM 시스템 설정' }", 'CRM legacy settings owner route must render the same deterministic content');

const crmContentArea = readText('apps/web/crm/src/components/layout/ContentArea.tsx');
assertIncludes(crmContentArea, "pathname === '/operations/settings' || pathname === '/settings'", 'CRM settings owner URLs must render the same content');

const contractWorkspace = readText('apps/web/crm/src/components/pages/contracts/ContractWorkspaceClient.tsx');
assertIncludes(contractWorkspace, 'const refreshWorkspace = useCallback', 'CRM contract refresh must reload the complete workspace');
assertIncludes(contractWorkspace, 'loadDmsDocumentPreview(refreshedSelected.id)', 'CRM contract refresh must reload DMS readiness after seller-profile changes');
assertIncludes(contractWorkspace, 'loadPmsHandoffPreview(refreshedSelected.id)', 'CRM contract refresh must reload PMS readiness');
assertIncludes(contractWorkspace, 'loadBillingActual(refreshedSelected.id)', 'CRM contract refresh must reload billing actuals');
assertIncludes(contractWorkspace, 'if (!active || !selected?.id || !accessToken)', 'CRM contract MDI tab must refetch supporting data when it becomes active');
assertNotIncludes(contractWorkspace, 'router.refresh()', 'CRM contract mutations must not overwrite authenticated client truth with unauthenticated server fallback data');

assertRouteProxy('apps/web/crm/src/app/api/crm/dashboard/route.ts', '/crm/dashboard');
assertRouteProxy('apps/web/crm/src/app/api/crm/opportunities/route.ts', '/crm/opportunities');
assertRouteProxy('apps/web/crm/src/app/api/crm/customers/route.ts', '/crm/customers');
assertRouteProxy('apps/web/crm/src/app/api/crm/contracts/route.ts', '/crm/contracts');
assertRouteProxy('apps/web/crm/src/app/api/crm/reports/preview/route.ts', '/crm/reports/preview');
assertRouteProxy('apps/web/crm/src/app/api/crm/business-plan/preview/route.ts', '/crm/business-plan/preview');
assertRouteProxy('apps/web/crm/src/app/api/crm/business-plan/performance-preview/route.ts', '/crm/business-plan/performance-preview');
assertRouteProxy('apps/web/crm/src/app/api/crm/cost-plan/preview/route.ts', '/crm/cost-plan/preview');
assertRouteProxy('apps/web/crm/src/app/api/crm/operations/preview/route.ts', '/crm/operations/preview');
assertForwardCrmJsonRoute('apps/web/crm/src/app/api/crm/operations/access/route.ts', '/crm/operations/access');
assertForwardCrmJsonRoute('apps/web/crm/src/app/api/crm/operations/overview/route.ts', '/crm/operations/overview');
assertForwardCrmJsonRoute('apps/web/crm/src/app/api/crm/operations/attempts/route.ts', '/crm/operations/attempts');
assertForwardCrmJsonRoute('apps/web/crm/src/app/api/crm/operations/attempts/[id]/route.ts', '/crm/operations/attempts/');
assertForwardCrmJsonRoute('apps/web/crm/src/app/api/crm/operations/attempts/[id]/retry/route.ts', '/retry', 'POST');
assertForwardCrmJsonRoute('apps/web/crm/src/app/api/crm/settings/route.ts', '/crm/settings');
assertForwardCrmJsonRoute('apps/web/crm/src/app/api/crm/settings/route.ts', '/crm/settings', 'PUT');
assertForwardCrmJsonRoute('apps/web/crm/src/app/api/crm/settings/history/route.ts', '/crm/settings/history');
assertRouteProxy('apps/web/crm/src/app/api/crm/quote-seller-profile/route.ts', '/crm/quote-seller-profile');
const quoteSellerCiRoute = readText('apps/web/crm/src/app/api/crm/quote-seller-profile/ci/route.ts');
assertIncludes(quoteSellerCiRoute, "createServerApiUrl('/crm/quote-seller-profile/ci')", 'CRM seller CI binary proxy must use the authenticated server endpoint');
assertIncludes(quoteSellerCiRoute, 'response.arrayBuffer()', 'CRM seller CI proxy must preserve binary bytes');
assertIncludes(quoteSellerCiRoute, "method: 'GET'", 'CRM seller CI proxy must support authenticated reads');
assertIncludes(quoteSellerCiRoute, "method: 'POST'", 'CRM seller CI proxy must support authenticated uploads');
assertRouteProxy('apps/web/crm/src/app/api/crm/opportunities/[id]/route.ts', '/crm/opportunities/', 'DELETE');
assertRouteProxy('apps/web/crm/src/app/api/crm/opportunities/[id]/confirm/route.ts', '/confirm', 'POST');
assertRouteProxy('apps/web/crm/src/app/api/crm/opportunities/[id]/reopen/route.ts', '/reopen', 'POST');
assertRouteProxy('apps/web/crm/src/app/api/crm/opportunities/[id]/versions/route.ts', '/versions', 'POST');
assertRouteProxy('apps/web/crm/src/app/api/crm/opportunities/[id]/convert-contract/route.ts', '/convert-contract', 'POST');
assertRouteProxy('apps/web/crm/src/app/api/crm/opportunities/[id]/quote-workflow/route.ts', '/quote-workflow', 'PUT');
assertRouteProxy('apps/web/crm/src/app/api/crm/opportunities/[id]/quote-dms-document-draft/route.ts', '/quote-dms-document-draft', 'POST');
assertRouteProxy('apps/web/crm/src/app/api/crm/opportunities/[id]/quote-dms-document-lifecycle-execution/route.ts', '/quote-dms-document-lifecycle-execution', 'POST');
assertRouteProxy('apps/web/crm/src/app/api/crm/contracts/[id]/billing-actual/route.ts', '/billing-actual', 'PUT');
assertRouteProxy('apps/web/crm/src/app/api/crm/contracts/[id]/pms-handoff-preview/route.ts', '/pms-handoff-preview');
assertRouteProxy('apps/web/crm/src/app/api/crm/contracts/[id]/dms-document-preview/route.ts', '/dms-document-preview');
assertRouteProxy('apps/web/crm/src/app/api/crm/contracts/[id]/dms-document-draft/route.ts', '/dms-document-draft', 'POST');
assertRouteProxy('apps/web/crm/src/app/api/crm/contracts/[id]/dms-document-lifecycle-execution/route.ts', '/dms-document-lifecycle-execution', 'POST');
for (const contractDmsJsonProxyPath of [
  'apps/web/crm/src/app/api/crm/contracts/[id]/dms-document-draft/route.ts',
  'apps/web/crm/src/app/api/crm/contracts/[id]/dms-document-execution-evidence/route.ts',
  'apps/web/crm/src/app/api/crm/contracts/[id]/dms-document-lifecycle-execution/route.ts',
]) {
  const contractDmsJsonProxy = readText(contractDmsJsonProxyPath);
  assertIncludes(contractDmsJsonProxy, "'Content-Type': 'application/json'", `${contractDmsJsonProxyPath} must preserve JSON request bodies upstream`);
  assertIncludes(contractDmsJsonProxy, 'body: body || undefined', `${contractDmsJsonProxyPath} must forward its JSON request body upstream`);
}
assertRouteProxy('apps/web/crm/src/app/api/crm/cost-plan/accounting-payment-handoff/route.ts', '/crm/cost-plan/accounting-payment-handoff', 'POST');
assertRouteProxy('apps/web/crm/src/app/api/crm/cost-plan/accounting-payment-handoffs/[id]/execute/route.ts', '/execute', 'POST');
assertRouteProxy('apps/web/crm/src/app/api/crm/cost-plan/accounting-payment-handoffs/[id]/execution-evidence/route.ts', '/execution-evidence', 'POST');

const crmModule = readText('apps/server/src/modules/crm/crm.module.ts');
[
  'OpportunityModule',
  'CustomerModule',
  'ContractModule',
  'DashboardModule',
  'ReportsModule',
  'BusinessPlanModule',
  'CostPlanModule',
  'OperationsModule',
  'QuoteSettingsModule',
  'CrmSearchModule',
].forEach((moduleName) => assertIncludes(crmModule, moduleName, `CRM root module must import ${moduleName}`));

const accessService = readText('apps/server/src/modules/crm/access/access.service.ts');
assertIncludes(accessService, 'resolveObjectPermissionContext', 'CRM access must use object permission resolution');
assertIncludes(accessService, 'isOwnerUserMatch', 'CRM access must keep ownerUserId matching');
assertIncludes(accessService, 'isOwnerNameMatch', 'CRM access must keep ownerName compatibility matching');
assertIncludes(accessService, "read: 'crm.operations.read'", 'CRM access must resolve the operations read permission');
assertIncludes(accessService, "execute: 'crm.operations.execute'", 'CRM access must resolve the operations execute permission');
assertIncludes(accessService, "manageSettings: 'crm.settings.manage'", 'CRM access must resolve the CRM settings permission');

const crmAccessSeed = readText('packages/database/prisma/seeds/18_crm_access_policy_foundation.sql');
for (const permissionCode of ['crm.operations.read', 'crm.operations.execute', 'crm.settings.manage']) {
  assertIncludes(crmAccessSeed, permissionCode, `CRM access seed must define ${permissionCode}`);
}
assertIncludes(crmAccessSeed, "('manager', 'crm.operations.read')", 'CRM manager baseline must be operations read-only');
assertNotIncludes(crmAccessSeed, "('manager', 'crm.operations.execute')", 'CRM manager baseline must not execute operations');
assertNotIncludes(crmAccessSeed, "('manager', 'crm.settings.manage')", 'CRM manager baseline must not manage settings');

const opportunityService = readText('apps/server/src/modules/crm/opportunity/opportunity.service.ts');
assertIncludes(opportunityService, 'addOpportunityVersion', 'CRM opportunity service must support version add');
assertIncludes(opportunityService, 'deleteOpportunity', 'CRM opportunity service must support latest unconfirmed opportunity deletion');
assertIncludes(opportunityService, '확정된 영업기회는 삭제할 수 없습니다.', 'CRM opportunity deletion must reject confirmed rows');
assertIncludes(opportunityService, '이전 차수 영업기회는 삭제할 수 없습니다.', 'CRM opportunity deletion must reject previous versions');
assertIncludes(opportunityService, 'convertOpportunityToContract', 'CRM opportunity service must support contract conversion');
assertIncludes(opportunityService, 'createQuoteDmsDocumentDraft', 'CRM quote DMS draft handoff must be implemented');
assertIncludes(opportunityService, 'executeQuoteDmsDocumentLifecycle', 'CRM quote DMS lifecycle execution must be implemented');
assertIncludes(opportunityService, 'ownerUserId', 'CRM opportunities must keep common user owner mapping');

const opportunityController = readText('apps/server/src/modules/crm/opportunity/opportunity.controller.ts');
assertIncludes(opportunityController, "@Delete(':id')", 'CRM opportunity controller must expose deletion');
assertIncludes(opportunityController, "@RequireCrmOpportunityFeature('canEditOpportunity', { opportunityIdParam: 'id' })", 'CRM opportunity deletion must use object edit capability');

const opportunityDto = readText('apps/server/src/modules/crm/opportunity/dto/opportunity.dto.ts');
assertIncludes(opportunityDto, 'paymentTermCode', 'CRM opportunity upsert DTO must accept the shared payment term field');
assertIncludes(opportunityDto, 'specialDiscountType', 'CRM opportunity upsert DTO must accept the shared Special DC type field');
assertIncludes(opportunityDto, 'specialDiscountValue', 'CRM opportunity upsert DTO must accept the shared Special DC value field');
assertIncludes(opportunityDto, 'CRM_OPPORTUNITY_DISCOUNT_TYPES', 'CRM opportunity upsert DTO must validate supported Special DC types');

const opportunityWorkspace = readText('apps/web/crm/src/components/pages/opportunities/OpportunityWorkspaceClient.tsx');
assertIncludes(opportunityWorkspace, 'const deleteOpportunity = async', 'CRM opportunity workspace must expose deletion workflow');
assertIncludes(opportunityWorkspace, "method: 'DELETE'", 'CRM opportunity workspace must call the deletion API');
assertIncludes(opportunityWorkspace, 'deletedOpportunityIdRef', 'CRM opportunity deletion must suppress stale detail reloads for the deleted id');
assertNotIncludes(opportunityWorkspace, '삭제 API 연결 후 활성화됩니다.', 'CRM opportunity deletion must not remain a disabled placeholder');
assertIncludes(opportunityWorkspace, 'openQuotePrintPreview', 'CRM opportunity workspace must expose the source quote print workflow');
assertIncludes(opportunityWorkspace, 'onclick="window.print()"', 'CRM quote print preview must support browser print/PDF saving');
assertIncludes(opportunityWorkspace, '인쇄 / PDF 저장', 'CRM quote preview must expose a user-visible print/PDF action');
assertIncludes(opportunityWorkspace, 'hydrateQuotePreviewCi', 'CRM quote preview must hydrate seller CI through an authenticated binary request');
assertIncludes(opportunityWorkspace, "headers: { Authorization: `Bearer ${accessToken}` }", 'CRM quote CI hydration must forward the bearer token');

const contractService = readText('apps/server/src/modules/crm/contract/contract.service.ts');
assertIncludes(contractService, 'createDmsDocumentDraft', 'CRM contract DMS draft handoff must be implemented');
assertIncludes(contractService, 'executeDmsDocumentLifecycle', 'CRM contract DMS lifecycle execution must be implemented');
assertIncludes(contractService, 'resolveSellerCiReference', 'CRM contract DMS packet must verify seller CI references');
assertIncludes(contractService, 'getPmsHandoffPreview', 'CRM contract PMS handoff preview must be implemented');
assertIncludes(contractService, 'confirmContract', 'CRM contract confirmation must be implemented');
assertIncludes(contractService, 'replaceBillingActual', 'CRM contract billing actual entry must be implemented');

const costPlanService = readText('apps/server/src/modules/crm/cost-plan/cost-plan.service.ts');
assertIncludes(costPlanService, 'createAccountingPaymentHandoff', 'CRM cost plan must create accounting/payment handoff snapshots');
assertIncludes(costPlanService, 'executeAccountingPayment', 'CRM cost plan must create demo execution evidence');
assertIncludes(costPlanService, 'executeAccountingPaymentThroughExternalApi', 'CRM cost plan must support provider-gated external ERP/API execution');
assertIncludes(costPlanService, 'recordAccountingPaymentExecutionEvidence', 'CRM cost plan must receive external execution evidence paths');

const costPlanModule = readText('apps/server/src/modules/crm/cost-plan/cost-plan.module.ts');
assertIncludes(costPlanModule, 'AccountingPaymentExternalExecutorService', 'CRM cost plan module must register the external ERP/API executor');

const costPlanDto = readText('apps/server/src/modules/crm/cost-plan/dto/cost-plan.dto.ts');
assertIncludes(costPlanDto, "'external-api'", 'CRM cost plan execution DTO must expose explicit external-api mode');

const costPlanTypes = readText('packages/types/src/crm/cost-plan.ts');
assertIncludes(costPlanTypes, "CrmCostPlanAccountingPaymentExecutionMode = 'demo' | 'external-api'", 'CRM cost plan shared types must expose execution modes');

const costPlanExternalExecutor = readText('apps/server/src/modules/crm/cost-plan/accounting-payment-external-executor.service.ts');
assertIncludes(costPlanExternalExecutor, 'CRM_ACCOUNTING_PAYMENT_API_URL', 'CRM external accounting/payment executor must support configured direct API URL');
assertIncludes(costPlanExternalExecutor, 'CRM_ACCOUNTING_PAYMENT_API_BASE_URL', 'CRM external accounting/payment executor must support configured base URL');
assertIncludes(costPlanExternalExecutor, 'external-system-sync', 'CRM external accounting/payment executor must require sync evidence');

const accountingPaymentProviderVerifier = readText('scripts/verify-crm-accounting-payment-provider.mjs');
assertIncludes(accountingPaymentProviderVerifier, 'providerEnvReady', 'CRM accounting/payment provider verifier must report provider environment readiness');
assertIncludes(accountingPaymentProviderVerifier, 'CRM_ACCOUNTING_PAYMENT_API_URL', 'CRM accounting/payment provider verifier must validate direct API URL');
assertIncludes(accountingPaymentProviderVerifier, 'CRM_ACCOUNTING_PAYMENT_API_BASE_URL', 'CRM accounting/payment provider verifier must validate base API URL');
assertIncludes(accountingPaymentProviderVerifier, 'external-system-sync', 'CRM accounting/payment provider verifier must keep required sync evidence visible');

const accountingPaymentProviderReportVerifier = readText('scripts/verify-crm-accounting-payment-provider-report.mjs');
assertIncludes(accountingPaymentProviderReportVerifier, 'CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_REPORT_PATH', 'CRM accounting/payment provider report verifier must read provider execution report path env');
assertIncludes(accountingPaymentProviderReportVerifier, '--template', 'CRM accounting/payment provider report verifier must expose an authoring template');
assertIncludes(accountingPaymentProviderReportVerifier, 'reconciliation.amountDifference', 'CRM accounting/payment provider report verifier must validate operation reconciliation difference');
assertIncludes(accountingPaymentProviderReportVerifier, 'external-system-sync', 'CRM accounting/payment provider report verifier must require external sync evidence');
assertIncludes(accountingPaymentProviderReportVerifier, 'synthetic/self-test evidence marker', 'CRM accounting/payment provider report verifier must reject synthetic self-test evidence by default');

const crmAiRagRuntimeReportVerifier = readText('scripts/verify-crm-ai-rag-runtime-report.mjs');
assertIncludes(crmAiRagRuntimeReportVerifier, 'CRM_AI_RAG_PROVIDER_READY_REPORT_PATH', 'CRM AI/RAG runtime report verifier must read provider-ready report path env');
assertIncludes(crmAiRagRuntimeReportVerifier, '--template', 'CRM AI/RAG runtime report verifier must expose an authoring template');
assertIncludes(crmAiRagRuntimeReportVerifier, 'providerMode', 'CRM AI/RAG runtime report verifier must validate provider mode');
assertIncludes(crmAiRagRuntimeReportVerifier, 'retrievalLogId', 'CRM AI/RAG runtime report verifier must validate retrieval audit evidence');
assertIncludes(crmAiRagRuntimeReportVerifier, 'embeddingCount', 'CRM AI/RAG runtime report verifier must validate embedding evidence');
assertIncludes(crmAiRagRuntimeReportVerifier, 'synthetic/self-test evidence marker', 'CRM AI/RAG runtime report verifier must reject synthetic self-test evidence by default');

const protectedSourceReflectionVerifier = readText('scripts/verify-crm-protected-source-reflection-report.mjs');
assertIncludes(protectedSourceReflectionVerifier, 'CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH', 'CRM protected source reflection verifier must read reflection report path env');
assertIncludes(protectedSourceReflectionVerifier, '--template', 'CRM protected source reflection verifier must expose an authoring template');
assertIncludes(protectedSourceReflectionVerifier, 'sourceSha256', 'CRM protected source reflection verifier must validate source digest');
assertIncludes(protectedSourceReflectionVerifier, 'unmappedSourceItemCount', 'CRM protected source reflection verifier must require no unmapped source items');
assertIncludes(protectedSourceReflectionVerifier, 'docs/crm/planning/source-migration-prd.md', 'CRM protected source reflection verifier must require PRD reflection');
assertIncludes(protectedSourceReflectionVerifier, 'synthetic/self-test evidence marker', 'CRM protected source reflection verifier must reject synthetic self-test evidence by default');

const migrationInputInspector = readText('scripts/inspect-crm-migration-inputs.mjs');
assertIncludes(migrationInputInspector, 'CRM_MIGRATION_INPUT_ROOT_DIR', 'CRM migration input inspector must support root dir env');
assertIncludes(migrationInputInspector, 'CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_REPORT_PATH', 'CRM migration input inspector must check accounting/payment report path');
assertIncludes(migrationInputInspector, 'CRM_AI_RAG_PROVIDER_READY_REPORT_PATH', 'CRM migration input inspector must check CRM AI/RAG report path');
assertIncludes(migrationInputInspector, 'CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH', 'CRM migration input inspector must check protected source reflection report path');
assertIncludes(migrationInputInspector, 'blocked-rms-protected', 'CRM migration input inspector must detect RMS protected Office candidates');
assertIncludes(migrationInputInspector, 'sidecarSources', 'CRM migration input inspector must preserve sidecar source metadata');
assertIncludes(migrationInputInspector, 'protectedSourceCandidateSummary', 'CRM migration input inspector must summarize protected source candidates');
assertIncludes(migrationInputInspector, 'requiredExternalInputs', 'CRM migration input inspector must structure remaining external input requests');
assertIncludes(migrationInputInspector, 'duplicateGroups', 'CRM migration input inspector must group duplicate candidate digests');

const migrationEvidenceBundlePreparer = readText('scripts/prepare-crm-migration-evidence-bundle.mjs');
const crmLocalEvidenceVerifier = readText('scripts/verify-crm-local-evidence.mjs');
assertIncludes(crmLocalEvidenceVerifier, 'schemaVersion: 2', 'CRM local verification report must use the revision-bound schema');
assertIncludes(crmLocalEvidenceVerifier, 'worktree-identity-unchanged', 'CRM local verification must fail when repository contents change during the run');
assertIncludes(crmLocalEvidenceVerifier, 'assertReportPathDoesNotAffectIdentity', 'CRM local verification report path must not invalidate its own worktree identity');
assertIncludes(migrationEvidenceBundlePreparer, 'CRM_MIGRATION_EVIDENCE_BUNDLE_DIR', 'CRM migration evidence bundle preparer must support output directory env');
assertIncludes(migrationEvidenceBundlePreparer, 'CRM_MIGRATION_INPUT_ROOT_DIR', 'CRM migration evidence bundle preparer must support input root inspection env');
assertIncludes(migrationEvidenceBundlePreparer, 'crm-migration-completion.env.template', 'CRM migration evidence bundle preparer must write completion env template');
assertIncludes(migrationEvidenceBundlePreparer, 'crm-migration-input-inspection.json', 'CRM migration evidence bundle preparer must write input inspection JSON');
assertIncludes(migrationEvidenceBundlePreparer, 'crm-migration-input-inspection.md', 'CRM migration evidence bundle preparer must write input inspection Markdown');
assertIncludes(migrationEvidenceBundlePreparer, 'crm-migration-required-external-inputs.json', 'CRM migration evidence bundle preparer must write required external inputs JSON');
assertIncludes(migrationEvidenceBundlePreparer, 'crm-migration-required-external-inputs.md', 'CRM migration evidence bundle preparer must write required external inputs Markdown');
assertIncludes(migrationEvidenceBundlePreparer, 'inspectInputs', 'CRM migration evidence bundle preparer must reuse the input inspector');
assertIncludes(migrationEvidenceBundlePreparer, 'diagnostic-only', 'CRM migration evidence bundle preparer must mark input inspection as diagnostic-only');
assertIncludes(migrationEvidenceBundlePreparer, 'request-only', 'CRM migration evidence bundle preparer must mark required external inputs as request-only');
assertIncludes(migrationEvidenceBundlePreparer, 'completionCheckId', 'CRM migration evidence bundle preparer must expose completion check ids in the request packet');
assertIncludes(migrationEvidenceBundlePreparer, 'verificationCommand', 'CRM migration evidence bundle preparer must expose verification commands in the request packet');
assertIncludes(migrationEvidenceBundlePreparer, 'manifest.json', 'CRM migration evidence bundle preparer must write manifest');
assertIncludes(migrationEvidenceBundlePreparer, 'verify:crm-migration-completion', 'CRM migration evidence bundle preparer must include completion audit command');
assertIncludes(migrationEvidenceBundlePreparer, 'verify:crm-local', 'CRM migration evidence bundle preparer must include local build/test verification command');
assertIncludes(migrationEvidenceBundlePreparer, 'localVerification', 'CRM migration evidence bundle manifest must include local verification metadata');
assertIncludes(migrationEvidenceBundlePreparer, 'crm-local-verification-report.json', 'CRM migration evidence bundle must document the local verification report path');
assertIncludes(migrationEvidenceBundlePreparer, 'local-verification-report-path', 'CRM migration evidence bundle preparer must accept a copied local verification report');
assertIncludes(migrationEvidenceBundlePreparer, 'included', 'CRM migration evidence bundle manifest must record whether local verification evidence is included');
assertIncludes(migrationEvidenceBundlePreparer, 'report?.schemaVersion !== 2', 'CRM migration evidence bundle must reject legacy unbound local verification reports');
assertIncludes(migrationEvidenceBundlePreparer, 'assertRepositoryWorktreeIdentity', 'CRM migration evidence bundle must reject local reports from another worktree');
assertIncludes(migrationEvidenceBundlePreparer, 'runNodeExpectFailure', 'CRM migration evidence bundle preparer self-test must prove draft templates do not pass');

const migrationEvidenceBundleVerifier = readText('scripts/verify-crm-migration-evidence-bundle.mjs');
assertIncludes(migrationEvidenceBundleVerifier, 'validateAccountingPaymentProviderReport', 'CRM migration evidence bundle verifier must reuse accounting/payment report validator');
assertIncludes(migrationEvidenceBundleVerifier, 'validateCrmAiRagRuntimeReport', 'CRM migration evidence bundle verifier must reuse CRM AI/RAG report validator');
assertIncludes(migrationEvidenceBundleVerifier, 'validateProtectedSourceReflectionReport', 'CRM migration evidence bundle verifier must reuse protected source report validator');
assertIncludes(migrationEvidenceBundleVerifier, 'crm-local-verification-report.json', 'CRM migration evidence bundle verifier must require local verification report');
assertIncludes(migrationEvidenceBundleVerifier, 'assertEquals(report.schemaVersion, 2', 'CRM migration evidence bundle verifier must reject legacy unbound local reports');
assertIncludes(migrationEvidenceBundleVerifier, 'assertRepositoryWorktreeIdentity', 'CRM migration evidence bundle verifier must bind the local report to the current worktree');
assertIncludes(migrationEvidenceBundleVerifier, 'verify:crm-migration-completion', 'CRM migration evidence bundle verifier must point to final completion audit');
assertIncludes(migrationEvidenceBundleVerifier, 'does not replace verify:crm-migration-completion', 'CRM migration evidence bundle verifier must not replace completion audit');

const crmLocalEvidenceBundlePreparer = readText('scripts/prepare-crm-local-evidence-bundle.mjs');
assertIncludes(crmLocalEvidenceBundlePreparer, 'verify-crm-local-evidence.mjs', 'CRM local evidence bundle preparer must run the local verifier when no report is supplied');
assertIncludes(crmLocalEvidenceBundlePreparer, 'prepare-crm-migration-evidence-bundle.mjs', 'CRM local evidence bundle preparer must prepare the migration evidence bundle');
assertIncludes(crmLocalEvidenceBundlePreparer, 'verify-crm-migration-evidence-bundle.mjs', 'CRM local evidence bundle preparer must verify the prepared bundle');
assertIncludes(crmLocalEvidenceBundlePreparer, 'local-ready-pending-external', 'CRM local evidence bundle preparer must identify the local-ready pending external state');
assertIncludes(crmLocalEvidenceBundlePreparer, 'accounting-payment-report-path', 'CRM local evidence bundle preparer must accept an accounting/payment evidence report path');
assertIncludes(crmLocalEvidenceBundlePreparer, 'crm-ai-rag-report-path', 'CRM local evidence bundle preparer must accept a CRM AI/RAG evidence report path');
assertIncludes(crmLocalEvidenceBundlePreparer, 'protected-source-reflection-report-path', 'CRM local evidence bundle preparer must accept a protected-source reflection report path');
assertIncludes(crmLocalEvidenceBundlePreparer, 'does not replace verify:crm-migration-completion', 'CRM local evidence bundle preparer must not replace the completion audit');

const migrationCompletionVerifier = readText('scripts/verify-crm-migration-completion.mjs');
assertIncludes(migrationCompletionVerifier, 'verify:crm-current-demo', 'CRM migration completion audit must require the current-revision strict demo gate');
assertIncludes(migrationCompletionVerifier, 'verify-crm-current-demo-parity.mjs', 'CRM migration completion audit must execute the strict 45-point verifier');
assertIncludes(migrationCompletionVerifier, 'inspectInputs', 'CRM migration completion audit must include diagnostic input inspection');
assertIncludes(migrationCompletionVerifier, 'diagnostic-only', 'CRM migration completion audit must mark input inspection as diagnostic-only');
assertIncludes(migrationCompletionVerifier, 'formatInputInspectionSummary', 'CRM migration completion audit must print input inspection summary on failure');
assertIncludes(migrationCompletionVerifier, 'crm-demo-source-migration-current-revision', 'CRM migration completion audit must default to the current-revision demo scope');
assertIncludes(migrationCompletionVerifier, '--require-extensions', 'CRM migration completion audit must make external provider/protected-source checks explicit');
assertIncludes(migrationCompletionVerifier, 'extensionReadiness', 'CRM migration completion audit must report external provider/protected-source readiness separately');
assertIncludes(migrationCompletionVerifier, 'Extension readiness only', 'CRM migration completion audit must label provider/protected-source checks as extension readiness');
assertIncludes(migrationCompletionVerifier, 'blocking: config.requireExtensions', 'CRM migration completion audit must keep extension checks non-blocking by default');
assertIncludes(migrationCompletionVerifier, 'synthetic/self-test evidence marker', 'CRM migration completion audit must reject synthetic self-test evidence reports');

assertIncludes(migrationInputInspector, 'completionCheckId', 'CRM migration input inspector must include completion check ids in required external inputs');
assertIncludes(migrationInputInspector, 'verificationCommand', 'CRM migration input inspector must include verification commands in required external inputs');
assertIncludes(migrationInputInspector, 'verify:crm-accounting-payment-provider:ready-precheck', 'CRM migration input inspector must point to accounting/payment provider precheck');
assertIncludes(migrationInputInspector, 'verify:crm-ai-rag-runtime:ready-precheck', 'CRM migration input inspector must point to CRM AI/RAG provider precheck');

const crmLocalVerifier = readText('scripts/verify-crm-local-evidence.mjs');
assertIncludes(crmLocalVerifier, 'verify-crm-launch-readiness.mjs', 'CRM local verifier must include the static readiness gate');
assertIncludes(crmLocalVerifier, 'src/modules/crm', 'CRM local verifier must run CRM server Jest suites');
assertIncludes(crmLocalVerifier, 'src/modules/dms/crm-contract-lifecycle', 'CRM local verifier must run DMS CRM contract boundary tests');
assertIncludes(crmLocalVerifier, 'src/modules/dms/crm-quote-lifecycle', 'CRM local verifier must run DMS CRM quote boundary tests');
assertIncludes(crmLocalVerifier, 'project-handoff-contract.service.spec.ts', 'CRM local verifier must run PMS CRM handoff boundary tests');
assertIncludes(crmLocalVerifier, 'build:web-crm', 'CRM local verifier must run the web-crm production build');

const businessPlanService = readText('apps/server/src/modules/crm/business-plan/business-plan.service.ts');
assertIncludes(businessPlanService, 'createCarryForwardSnapshot', 'CRM business plan must support prior-year carry-forward');
assertIncludes(businessPlanService, 'updateMonthlyPlanLine', 'CRM business plan must support monthly plan input');
assertIncludes(businessPlanService, 'savePerformanceActualInput', 'CRM business performance must support manual actual input');

const reportsService = readText('apps/server/src/modules/crm/reports/reports.service.ts');
assertIncludes(reportsService, 'confirmReport', 'CRM reports must support snapshot confirmation');
assertIncludes(reportsService, 'reopenReportConfirmation', 'CRM reports must support confirmation reopen');

const operationsService = readText('apps/server/src/modules/crm/operations/operations.service.ts');
assertIncludes(operationsService, 'CRM_OPERATIONS_BOUNDARY_NOTICE', 'CRM operations preview must expose ownership boundary notice');
assertIncludes(operationsService, 'CRM 내부가 아니라 공용 Admin', 'CRM operations preview must keep account/admin ownership outside CRM');
assertIncludes(operationsService, 'CI 파일과 문서 템플릿은 DMS가 소유', 'CRM operations preview must keep CI/template ownership in DMS');

const operationsController = readText('apps/server/src/modules/crm/operations/operations.controller.ts');
for (const routeMarker of [
  "@Get('access')",
  "@Get('overview')",
  "@Get('readiness')",
  "@Get('launch-readiness')",
  "@Get('data-quality')",
  "@Get('attempts')",
  "@Get('attempts/:id')",
  "@Post('attempts/:id/retry')",
]) {
  assertIncludes(operationsController, routeMarker, `CRM operations controller must expose ${routeMarker}`);
}
assertIncludes(operationsController, "@RequireCrmOperationsFeature('canExecuteOperations')", 'CRM retry must require execute permission');

const launchReadinessService = readText('apps/server/src/modules/crm/operations/launch-readiness.service.ts');
assertIncludes(launchReadinessService, 'CRM_READINESS_REFRESH_WINDOW_MS = 5_000', 'CRM owner readiness must publish the five-second refresh window');
assertIncludes(launchReadinessService, 'CRM_READINESS_MAX_AGE_MS = 30_000', 'CRM owner readiness must expire snapshots after thirty seconds');
assertIncludes(launchReadinessService, "status: 'unknown'", 'CRM probe failure must remain unknown');
assertIncludes(launchReadinessService, 'blockerCount: null', 'CRM unknown readiness must not fall back to zero blockers');
assertIncludes(launchReadinessService, 'invalidate(): void', 'CRM owner readiness must support explicit invalidation');

const settingsController = readText('apps/server/src/modules/crm/operations/settings.controller.ts');
assertIncludes(settingsController, "@Controller('crm/settings')", 'CRM settings controller must own the CRM settings API');
assertIncludes(settingsController, "@RequireCrmOperationsFeature('canManageSettings')", 'CRM settings writes must require settings permission');

const settingsDto = readText('apps/server/src/modules/crm/operations/dto/settings.dto.ts');
assertIncludes(settingsDto, 'expectedRevision', 'CRM settings writes must use optimistic concurrency');
assertIncludes(settingsDto, '@Equals(true', 'CRM settings must keep the required DMS handoff enabled');

const attemptService = readText('apps/server/src/modules/crm/operations/operation-attempt.service.ts');
assertIncludes(attemptService, 'unresolvedFailedCount', 'CRM attempt summary must distinguish unresolved failures');
assertIncludes(attemptService, 'recoveredFailedCount', 'CRM attempt summary must distinguish recovered failures');
assertIncludes(attemptService, 'rootAttemptId', 'CRM attempt records must preserve retry chains');
assertIncludes(attemptService, 'runWithContext(', 'CRM attempt execution must keep one correlation across the whole operation boundary');
assertIncludes(attemptService, 'correlationId', 'CRM attempt contract must publish a stable correlation');
assertIncludes(attemptService, 'ownerHref', 'CRM failed attempts must publish the owner recovery route');
assertIncludes(attemptService, 'sourceHref', 'CRM failed attempts must publish the source business route');
assertIncludes(attemptService, 'retryable:', 'CRM attempt contract must expose server-owned retryability');
assertIncludes(attemptService, 'toSafeHttpException', 'CRM failed execution must throw only a sanitized HTTP error');

const retryService = readText('apps/server/src/modules/crm/operations/operation-retry.service.ts');
assertIncludes(retryService, 'retryOfAttemptId', 'CRM retry execution must link the new attempt to its failed source');
assertIncludes(attemptService, '같은 retry chain에 ${completedOrRunning.statusCode} attempt가 있어 중복 실행을 차단했습니다.', 'CRM attempt recorder must reject duplicate success or running work in one chain');

const launchOperationsSurface = readText('apps/web/crm/src/components/pages/operations/LaunchOperationsSurface.tsx');
assertIncludes(launchOperationsSurface, '미복구 실패', 'CRM operations UI must show unresolved failures');
assertIncludes(launchOperationsSurface, '복구 완료', 'CRM operations UI must show recovered failures');
assertIncludes(launchOperationsSurface, 'correlation', 'CRM operations UI must show the recovery correlation');
assertIncludes(launchOperationsSurface, 'ownerHref', 'CRM operations UI must expose the owner recovery link');
assertIncludes(launchOperationsSurface, 'sourceHref', 'CRM operations UI must expose the CRM source link');
assertIncludes(launchOperationsSurface, 'Date.parse(launchReadiness.expiresAt) <= now', 'CRM operations UI must expire stale owner snapshots');
assertIncludes(launchOperationsSurface, "stale ? 'unknown' : launchReadiness.status", 'CRM operations UI must render stale snapshots as unknown');

const operationsPreviewSurface = readText('apps/web/crm/src/components/pages/operations/OperationsPreviewWorkspaceClient.tsx');
assertIncludes(operationsPreviewSurface, '원천 데모 운영 항목 Preview', 'CRM source Preview must remain visibly distinct from the launch gate');
assertIncludes(operationsPreviewSurface, '런칭 차단 여부는 위 Live 런칭 운영 상태만 판정', 'CRM source Preview must not impersonate Live readiness');

const adminLaunchRoute = readText('apps/web/admin/src/app/api/launch-readiness/route.ts');
assertIncludes(adminLaunchRoute, "'/crm/operations/launch-readiness'", 'Admin launch summary must consume the CRM owner snapshot');
assertIncludes(adminLaunchRoute, "'/dms/settings/readiness'", 'Admin launch summary must consume the DMS owner snapshot');
assertIncludes(adminLaunchRoute, 'normalizeOwnerSnapshot', 'Admin launch summary must validate owner snapshot freshness');

const adminReadinessContract = readText('apps/web/admin/src/app/api/launch-readiness/readinessContract.ts');
assertIncludes(adminReadinessContract, "source: 'admin.bridge.unavailable'", 'Admin upstream failure must remain explicitly unavailable');
assertIncludes(adminReadinessContract, "source: 'admin.bridge.stale'", 'Admin stale owner snapshots must remain explicitly stale');
assertIncludes(adminReadinessContract, "status: 'unknown'", 'Admin bridge failure must never become ready');
assertIncludes(adminReadinessContract, 'blockerCount: null', 'Admin unknown readiness must not fall back to zero blockers');

const dmsSettingsService = readText('apps/server/src/modules/dms/settings/settings.service.ts');
assertIncludes(dmsSettingsService, 'READINESS_REFRESH_WINDOW_MS = 5_000', 'DMS owner readiness must publish the five-second refresh window');
assertIncludes(dmsSettingsService, 'READINESS_MAX_AGE_MS = 30_000', 'DMS owner readiness must expire snapshots after thirty seconds');
assertIncludes(dmsSettingsService, "status: 'unknown'", 'DMS probe failure must remain unknown');
assertIncludes(dmsSettingsService, 'blockerCount: status === \'unknown\' ? null', 'DMS unknown readiness must not fall back to zero blockers');
assertIncludes(dmsSettingsService, 'invalidateReadiness(): void', 'DMS owner readiness must support explicit invalidation');

const readinessConsistencyVerifier = readText('scripts/verify-crm-readiness-consistency.mjs');
assertIncludes(readinessConsistencyVerifier, 'assertSameSnapshot', 'CRM readiness verifier must compare owner and consumer snapshots exactly');
assertIncludes(readinessConsistencyVerifier, "staleAndMalformedFallback: 'unknown/null'", 'CRM readiness verifier must cover stale and malformed fallback');
assertIncludes(readinessConsistencyVerifier, "unavailableUpstreamFallback", 'CRM readiness verifier must cover disconnected upstream fallback');

const recoveryVerifier = readText('scripts/verify-crm-operation-recovery.mjs');
assertIncludes(recoveryVerifier, "contract: 'BT-21'", 'CRM recovery verifier must identify the BT-21 contract');
assertIncludes(recoveryVerifier, "statuses: [409]", 'CRM recovery verifier must prove repeat retry conflict');
assertIncludes(recoveryVerifier, 'duplicateAttempts: 0', 'CRM recovery verifier must prove zero duplicate attempts');
assertIncludes(recoveryVerifier, 'PASS_CLEANED', 'CRM recovery verifier must audit exact database and file cleanup');

const secretMaskingVerifier = readText('scripts/verify-crm-secret-masking.mjs');
assertIncludes(secretMaskingVerifier, 'crm-s10-secret-marker', 'CRM secret verifier must use a synthetic credential marker');
assertIncludes(secretMaskingVerifier, 'viewerSystemConfig', 'CRM secret verifier must prove viewer system config hiding');
assertIncludes(secretMaskingVerifier, 'openApiMarkerLeaks: 0', 'CRM secret verifier must audit OpenAPI output');

const secretRedaction = readText('apps/server/src/common/security/secret-redaction.ts');
assertIncludes(secretRedaction, 'redactSecretsInText', 'server must provide shared text secret redaction');
assertIncludes(secretRedaction, 'redactSecretsInValue', 'server must provide recursive structured secret redaction');
const httpExceptionFilter = readText('apps/server/src/common/filters/http-exception.filter.ts');
assertIncludes(httpExceptionFilter, 'redactSecretsInText(request.url)', 'global HTTP errors must redact sensitive query values');
const dmsLogger = readText('apps/server/src/modules/dms/runtime/dms-logger.ts');
assertIncludes(dmsLogger, 'redactSecretsInValue(context)', 'DMS structured logs must redact secret context values');
const commonColumns = readText('packages/database/src/extensions/common-columns.extension.ts');
assertIncludes(commonColumns, 'record.transactionId ?? ctx.transactionId', 'explicit workflow correlation must win over the per-request transaction default');

const recoveryMaskingContract = readText('docs/crm/reference/crm-operation-recovery-and-secret-masking-contract.md');
assertIncludes(recoveryMaskingContract, 'BT-21', 'CRM recovery and masking contract must document BT-21');
assertIncludes(recoveryMaskingContract, 'BT-22', 'CRM recovery and masking contract must document BT-22');

const dmsRouteConstants = readText('apps/web/dms/src/lib/constants/routes.ts');
assertIncludes(dmsRouteConstants, "OPERATIONS_GIT_SETTINGS_PATH = '/settings/operations/git'", 'DMS must expose the Admin operations deep-link contract');
assertIncludes(dmsRouteConstants, 'OPERATIONS_GIT_SETTINGS_PATH,', 'DMS root entry policy must allow the Admin operations deep link');

const crmOpenApi = JSON.parse(readText('docs/crm/reference/api/openapi.json'));
for (const [pathValue, method] of [
  ['/api/crm/operations/preview', 'get'],
  ['/api/crm/operations/access', 'get'],
  ['/api/crm/operations/overview', 'get'],
  ['/api/crm/operations/readiness', 'get'],
  ['/api/crm/operations/launch-readiness', 'get'],
  ['/api/crm/operations/data-quality', 'get'],
  ['/api/crm/operations/attempts', 'get'],
  ['/api/crm/operations/attempts/{id}', 'get'],
  ['/api/crm/operations/attempts/{id}/retry', 'post'],
  ['/api/crm/settings', 'get'],
  ['/api/crm/settings', 'put'],
  ['/api/crm/settings/history', 'get'],
  ['/api/crm/quote-seller-profile/ci', 'get'],
  ['/api/crm/quote-seller-profile/ci', 'post'],
]) {
  assertOpenApiOperation(crmOpenApi, pathValue, method);
}

const launchOperationsPrd = readText('docs/crm/planning/launch-operations-prd.md');
assertIncludes(launchOperationsPrd, '이는 구현 잔여가 아니라 배포 입력 상태', 'CRM launch PRD must distinguish seller deployment data from implementation completeness');
assertIncludes(launchOperationsPrd, '기존 `crm.opportunity.write` 계약을 유지', 'CRM launch PRD must record the preserved seller-profile permission');
assertIncludes(launchOperationsPrd, '데모 100%와 이 운영 Goal의 필수 완료 조건에서 제외', 'CRM launch PRD must keep the out-of-source accounting extension outside the required denominator');

const launchOperationsTestPlan = readText('docs/crm/planning/launch-operations-test-plan.md');
assertIncludes(launchOperationsTestPlan, '미복구 0/복구 1', 'CRM operations test plan must record recovered retry evidence');
assertIncludes(launchOperationsTestPlan, '전체 17개 치환 surface의 모든 상태 조합', 'CRM operations test plan must preserve the remaining full-surface fresh role regression');
assertIncludes(launchOperationsTestPlan, 'BT-27 원천 UI/UX 구조·시각 패리티', 'CRM operations test plan must include source UI/UX parity verification');

const sourceUiuxParity = readText('docs/crm/planning/source-uiux-parity-spec.md');
const demoVerificationContract = readText('docs/crm/planning/demo-100-verification-contract.md');
assertIncludes(demoVerificationContract, '문서상 폐쇄 원장', 'CRM demo verification contract must separate the historical ledger');
assertIncludes(demoVerificationContract, '현재 revision에 결합된 엄격 증명', 'CRM demo verification contract must separate current revision proof');
assertIncludes(demoVerificationContract, 'worktreeIdentity', 'CRM demo verification contract must require one worktree identity');
assertIncludes(demoVerificationContract, 'DDL 23개 table', 'CRM demo verification contract must keep DDL tables outside the point denominator');
assertIncludes(demoVerificationContract, 'verify:crm-current-demo', 'CRM demo verification contract must name the current-revision strict gate');
assertIncludes(demoVerificationContract, '실제 production build artifact fingerprint', 'CRM demo verification contract must bind live runtimes to current build artifacts');
assertIncludes(sourceUiuxParity, 'UX-01', 'CRM source UI/UX parity spec must define the first UI/UX denominator row');
assertIncludes(sourceUiuxParity, 'UX-17', 'CRM source UI/UX parity spec must define the last UI/UX denominator row');
assertIncludes(sourceUiuxParity, 'CRM_SOURCE_UIUX_MANIFEST', 'CRM source UI/UX parity spec must document REF-01 manifest input');
assertIncludes(sourceUiuxParity, 'CRM_TARGET_UIUX_MANIFEST', 'CRM source UI/UX parity spec must document target evidence input');
assertIncludes(sourceUiuxParity, 'verify:crm-uiux-parity:all', 'CRM source UI/UX parity spec must document the final all-UX evidence gate');
assertIncludes(sourceUiuxParity, '100% 증거로 사용할 수 없다', 'CRM source UI/UX parity spec must reject structure-only verification as completion evidence');
assertIncludes(sourceUiuxParity, '단일 wrapper', 'CRM source UI/UX parity spec must document deterministic single-wrapper source resolution');

const pmsCrmHandoff = readText('apps/server/src/modules/pms/project/project-handoff-contract.service.ts');
assertIncludes(pmsCrmHandoff, 'crm-handoff-snapshot', 'PMS CRM handoff must persist explicit snapshot acceptance');
assertNotIncludes(pmsCrmHandoff, 'createOpportunity', 'PMS CRM handoff must not write CRM opportunities');

const pmsCrmHandoffApi = readText('apps/web/pms/src/lib/api/endpoints/crmHandoff.ts');
assertIncludes(pmsCrmHandoffApi, '/crm/contracts', 'PMS CRM handoff must list CRM contract candidates through the CRM API boundary');
assertIncludes(pmsCrmHandoffApi, '/pms-handoff-preview', 'PMS CRM handoff must consume CRM handoff preview through the CRM API boundary');

const crmReadme = readText('docs/crm/README.md');
assertIncludes(crmReadme, 'verify:crm-launch', 'CRM README must document the CRM launch readiness gate');
assertIncludes(crmReadme, 'verify:crm-goal-contract', 'CRM README must document the strict goal-contract gate');
assertIncludes(crmReadme, 'verify:crm-uiux-parity:all', 'CRM README must document the final source/target UI/UX evidence gate');
assertIncludes(crmReadme, 'verify:crm-source-sample', 'CRM README must document the fixed source-sample runtime gate');
assertIncludes(crmReadme, 'verify:crm-domain-access-runtime', 'CRM README must document the isolated CRM domain access runtime gate');
assertIncludes(crmReadme, 'CRM 원천 UI/UX 패리티 명세', 'CRM README must link the source UI/UX parity specification');
assertIncludes(crmReadme, 'verify:crm-local', 'CRM README must document the CRM local build/test gate');
assertIncludes(crmReadme, 'build:web-crm', 'CRM README must document the web-crm build evidence');
assertIncludes(crmReadme, 'verify:crm-migration-completion', 'CRM README must document the CRM migration completion audit');
assertIncludes(crmReadme, 'verify:crm-migration-evidence-bundle', 'CRM README must document the CRM migration evidence bundle verifier');
assertIncludes(crmReadme, 'verify:crm-accounting-payment-provider-report', 'CRM README must document the external ERP/API execution report verifier');
assertIncludes(crmReadme, 'verify:crm-ai-rag-runtime-report', 'CRM README must document the CRM AI/RAG provider-ready runtime report verifier');
assertIncludes(crmReadme, 'verify:crm-protected-source-reflection-report', 'CRM README must document the protected source reflection report verifier');
assertIncludes(crmReadme, 'inspect:crm-migration-inputs', 'CRM README must document the CRM migration input inspector');
assertIncludes(crmReadme, 'prepare:crm-migration-evidence', 'CRM README must document the CRM migration evidence bundle preparer');
assertIncludes(crmReadme, 'prepare:crm-local-evidence-bundle', 'CRM README must document the CRM local evidence bundle preparer');
assertIncludes(crmReadme, 'local-ready-pending-external', 'CRM README must document the CRM local-ready pending external state');
assertIncludes(crmReadme, 'accounting-payment-report-path', 'CRM README must document external accounting/payment report application');
assertIncludes(crmReadme, 'crm-ai-rag-report-path', 'CRM README must document CRM AI/RAG report application');
assertIncludes(crmReadme, 'protected-source-reflection-report-path', 'CRM README must document protected-source report application');
assertIncludes(crmReadme, 'synthetic/self-test evidence marker', 'CRM README must document synthetic self-test evidence rejection');
assertIncludes(crmReadme, 'crm-migration-input-inspection', 'CRM README must document bundled CRM migration input inspection artifacts');
assertIncludes(crmReadme, 'crm-migration-required-external-inputs', 'CRM README must document required external input request artifacts');
assertIncludes(crmReadme, 'verify:crm-go-live', 'CRM README must document the production go-live verifier');
assertIncludes(crmReadme, 'verify:crm-core-runtime', 'CRM README must document the actual isolated DB/API core runtime gate');
assertIncludes(crmReadme, 'verify:crm-current-demo', 'CRM README must document the current-revision strict demo gate');

const codexPreflight = readText('.codex/hooks/preflight.sh');
assertIncludes(codexPreflight, 'verify:crm-worktree-identity:self-test', 'Codex preflight must run the CRM worktree evidence identity self-test');
assertIncludes(codexPreflight, 'verify:crm-current-demo:self-test', 'Codex preflight must run the CRM current-demo strict gate self-test');
const prValidation = readText('.github/workflows/pr-validation.yml');
assertIncludes(prValidation, 'verify:crm-worktree-identity:self-test', 'PR validation must run the CRM worktree evidence identity self-test');
assertIncludes(prValidation, 'verify:crm-current-demo:self-test', 'PR validation must run the CRM current-demo strict gate self-test');

const crmGoLiveGuide = readText('docs/crm/guides/go-live-external-inputs.md');
assertIncludes(crmGoLiveGuide, 'EXT-01', 'CRM go-live guide must document the seller legal profile and CI input');
assertIncludes(crmGoLiveGuide, 'EXT-02', 'CRM go-live guide must document production endpoint and credential input');
assertIncludes(crmGoLiveGuide, 'credentialsStored', 'CRM go-live guide must document credential-free evidence');
assertIncludes(crmGoLiveGuide, 'CRM_GO_LIVE_ADMIN_PASSWORD', 'CRM go-live guide must document runtime-only verification credential injection');
assertIncludes(crmGoLiveGuide, 'CRM-S15-FINAL-GO-LIVE', 'CRM go-live guide must reserve final PASS for the browser and artifact evidence gate');
assertIncludes(crmGoLiveGuide, 'prepare:crm-go-live-browser-evidence', 'CRM go-live guide must document the Playwright CLI evidence template');
assertIncludes(crmGoLiveGuide, '--dms-evidence', 'CRM go-live guide must bind the same-release DMS final GO evidence');
assertIncludes(crmReadme, 'diagnostic-only input inspection', 'CRM README must document completion audit diagnostic input inspection output');
assertIncludes(crmReadme, 'protectedSourceCandidateSummary', 'CRM README must document protected source candidate summary output');
assertIncludes(crmReadme, 'requiredExternalInputs', 'CRM README must document structured external input requests');
assertIncludes(crmReadme, 'completionCheckId', 'CRM README must document external input completion check ids');
assertIncludes(crmReadme, 'verificationCommand', 'CRM README must document external input verification commands');
assertIncludes(crmReadme, 'verify:crm-accounting-payment-provider:ready-precheck', 'CRM README must document the external ERP/API provider precheck gate');
assertIncludes(crmReadme, '실제 ERP/API 반영은 외부 회계·지급 시스템 경계', 'CRM README must keep real ERP/API as an external boundary');
assertIncludes(crmReadme, 'provider-gated 외부 API 실행 mode', 'CRM README must document provider-gated external ERP/API execution mode');
assertIncludes(crmReadme, 'SSOO 공통 AI/RAG provider', 'CRM README must keep provider-ready RAG evidence separate');
assertIncludes(
  crmReadme,
  'DRM 보호 발표자료는 사용자 지시에 따라 현재 완료 범위에서 제외',
  'CRM README must keep excluded DRM material outside the demo completion denominator',
);

const crmBacklog = readText('docs/crm/planning/backlog.md');
assertIncludes(crmBacklog, 'verify:crm-launch', 'CRM backlog must record the CRM launch readiness gate');
assertIncludes(crmBacklog, 'verify:crm-local', 'CRM backlog must record the CRM local build/test gate');
assertIncludes(crmBacklog, 'build:web-crm', 'CRM backlog must record the web-crm build evidence');
assertIncludes(crmBacklog, 'verify:crm-migration-completion', 'CRM backlog must record the CRM migration completion audit');
assertIncludes(crmBacklog, 'verify:crm-migration-evidence-bundle', 'CRM backlog must record the CRM migration evidence bundle verifier');
assertIncludes(crmBacklog, 'verify:crm-accounting-payment-provider-report', 'CRM backlog must record the external ERP/API execution report verifier');
assertIncludes(crmBacklog, 'verify:crm-ai-rag-runtime-report', 'CRM backlog must record the CRM AI/RAG provider-ready runtime report verifier');
assertIncludes(crmBacklog, 'verify:crm-protected-source-reflection-report', 'CRM backlog must record the protected source reflection report verifier');
assertIncludes(crmBacklog, 'inspect:crm-migration-inputs', 'CRM backlog must record the CRM migration input inspector');
assertIncludes(crmBacklog, 'prepare:crm-migration-evidence', 'CRM backlog must record the CRM migration evidence bundle preparer');
assertIncludes(crmBacklog, 'prepare:crm-local-evidence-bundle', 'CRM backlog must record the CRM local evidence bundle preparer');
assertIncludes(crmBacklog, 'local-ready-pending-external', 'CRM backlog must record the CRM local-ready pending external state');
assertIncludes(crmBacklog, 'accounting-payment-report-path', 'CRM backlog must record external accounting/payment report application');
assertIncludes(crmBacklog, 'crm-ai-rag-report-path', 'CRM backlog must record CRM AI/RAG report application');
assertIncludes(crmBacklog, 'protected-source-reflection-report-path', 'CRM backlog must record protected-source report application');
assertIncludes(crmBacklog, 'synthetic/self-test evidence marker', 'CRM backlog must record synthetic self-test evidence rejection');
assertIncludes(crmBacklog, 'crm-migration-input-inspection', 'CRM backlog must record bundled CRM migration input inspection artifacts');
assertIncludes(crmBacklog, 'crm-migration-required-external-inputs', 'CRM backlog must record required external input request artifacts');
assertIncludes(crmBacklog, 'diagnostic-only input inspection', 'CRM backlog must record completion audit diagnostic input inspection output');
assertIncludes(crmBacklog, 'protectedSourceCandidateSummary', 'CRM backlog must record protected source candidate summary output');
assertIncludes(crmBacklog, 'requiredExternalInputs', 'CRM backlog must record structured external input requests');
assertIncludes(crmBacklog, 'completionCheckId', 'CRM backlog must record external input completion check ids');
assertIncludes(crmBacklog, 'verificationCommand', 'CRM backlog must record external input verification commands');
assertIncludes(crmBacklog, 'verify:crm-accounting-payment-provider:ready-precheck', 'CRM backlog must record the external ERP/API provider precheck gate');
assertIncludes(crmBacklog, 'provider-gated 외부 회계·지급 API 실행 mode', 'CRM backlog must record provider-gated external ERP/API execution mode');
assertIncludes(crmBacklog, 'provider execution report', 'CRM backlog must document provider execution report evidence');
assertIncludes(crmBacklog, 'provider-ready runtime report', 'CRM backlog must document provider-ready AI/RAG runtime evidence');
assertIncludes(crmBacklog, '보호 발표자료 reflection report', 'CRM backlog must document protected source reflection evidence');
assertIncludes(crmBacklog, '반영 marker 제거', 'CRM backlog must document completion marker removal');

const crmPrd = readText('docs/crm/planning/source-migration-prd.md');
assertIncludes(crmPrd, 'verify:crm-launch', 'CRM PRD must record the CRM launch readiness gate');
assertIncludes(crmPrd, 'verify:crm-local', 'CRM PRD must record the CRM local build/test gate');
assertIncludes(crmPrd, 'build:web-crm', 'CRM PRD must record the web-crm build evidence');
assertIncludes(crmPrd, 'verify:crm-migration-completion', 'CRM PRD must record the CRM migration completion audit');
assertIncludes(crmPrd, 'verify:crm-migration-evidence-bundle', 'CRM PRD must record the CRM migration evidence bundle verifier');
assertIncludes(crmPrd, 'verify:crm-accounting-payment-provider-report', 'CRM PRD must record the external ERP/API execution report verifier');
assertIncludes(crmPrd, 'verify:crm-ai-rag-runtime-report', 'CRM PRD must record the CRM AI/RAG provider-ready runtime report verifier');
assertIncludes(crmPrd, 'verify:crm-protected-source-reflection-report', 'CRM PRD must record the protected source reflection report verifier');
assertIncludes(crmPrd, 'inspect:crm-migration-inputs', 'CRM PRD must record the CRM migration input inspector');
assertIncludes(crmPrd, 'prepare:crm-migration-evidence', 'CRM PRD must record the CRM migration evidence bundle preparer');
assertIncludes(crmPrd, 'prepare:crm-local-evidence-bundle', 'CRM PRD must record the CRM local evidence bundle preparer');
assertIncludes(crmPrd, 'local-ready-pending-external', 'CRM PRD must record the CRM local-ready pending external state');
assertIncludes(crmPrd, 'accounting-payment-report-path', 'CRM PRD must record external accounting/payment report application');
assertIncludes(crmPrd, 'crm-ai-rag-report-path', 'CRM PRD must record CRM AI/RAG report application');
assertIncludes(crmPrd, 'protected-source-reflection-report-path', 'CRM PRD must record protected-source report application');
assertIncludes(crmPrd, 'synthetic/self-test evidence marker', 'CRM PRD must record synthetic self-test evidence rejection');
assertIncludes(crmPrd, 'crm-migration-input-inspection', 'CRM PRD must record bundled CRM migration input inspection artifacts');
assertIncludes(crmPrd, 'crm-migration-required-external-inputs', 'CRM PRD must record required external input request artifacts');
assertIncludes(crmPrd, 'diagnostic-only input inspection', 'CRM PRD must record completion audit diagnostic input inspection output');
assertIncludes(crmPrd, 'protectedSourceCandidateSummary', 'CRM PRD must record protected source candidate summary output');
assertIncludes(crmPrd, 'requiredExternalInputs', 'CRM PRD must record structured external input requests');
assertIncludes(crmPrd, 'completionCheckId', 'CRM PRD must record external input completion check ids');
assertIncludes(crmPrd, 'verificationCommand', 'CRM PRD must record external input verification commands');
assertIncludes(crmPrd, 'verify:crm-accounting-payment-provider:ready-precheck', 'CRM PRD must record the external ERP/API provider precheck gate');
assertIncludes(crmPrd, 'CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_REPORT_PATH', 'CRM PRD must document the accounting/payment provider execution report path');
assertIncludes(crmPrd, 'CRM_AI_RAG_PROVIDER_READY_REPORT_PATH', 'CRM PRD must document the CRM AI/RAG provider-ready runtime report path');
assertIncludes(crmPrd, 'CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH', 'CRM PRD must document the protected source reflection report path');
assertIncludes(crmPrd, 'provider-gated 외부 회계·지급 API 실행 mode', 'CRM PRD must record provider-gated external ERP/API execution mode');
assertIncludes(crmPrd, '반영 marker 제거', 'CRM PRD must document completion marker removal');

console.log('✓ CRM launch readiness source verification passed');
