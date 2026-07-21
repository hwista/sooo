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

[
  'apps/server/src/modules/crm/crm.module.ts',
  'apps/server/src/modules/crm/access/access.service.ts',
  'apps/server/src/modules/crm/access/access.service.spec.ts',
  'apps/server/src/modules/crm/opportunity/opportunity.controller.ts',
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
  'packages/database/prisma/triggers/66_crm_opportunity_h_trigger.sql',
  'packages/database/prisma/triggers/67_crm_opportunity_line_h_trigger.sql',
  'packages/database/prisma/triggers/73_crm_quote_seller_profile_h_trigger.sql',
  'packages/database/prisma/triggers/74_crm_business_plan_h_trigger.sql',
  'packages/database/prisma/triggers/75_crm_customer_h_trigger.sql',
  'packages/database/prisma/triggers/76_crm_customer_activity_h_trigger.sql',
  'scripts/verify-crm-migration-completion.mjs',
  'scripts/verify-crm-local-evidence.mjs',
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
  'docs/crm/planning/source-migration-prd.md',
].forEach(assertFile);

const packageJson = readText('package.json');
assertIncludes(packageJson, '"verify:crm-launch": "pnpm run verify:crm-launch:observed"', 'root package must expose observed CRM launch verifier');
assertIncludes(packageJson, '"verify:crm-launch:raw": "node scripts/verify-crm-launch-readiness.mjs"', 'root package must expose raw CRM launch verifier');
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
  'apps/web/crm/src/components/pages/business-plan/BusinessPlanPreviewWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/business-plan-performance/BusinessPlanPerformancePreviewWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/cost-plan/CostPlanPreviewWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/quote-settings/QuoteSellerProfileWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/operations/OperationsPreviewWorkspaceClient.tsx',
].forEach(assertFile);

assertRouteProxy('apps/web/crm/src/app/api/crm/dashboard/route.ts', '/crm/dashboard');
assertRouteProxy('apps/web/crm/src/app/api/crm/opportunities/route.ts', '/crm/opportunities');
assertRouteProxy('apps/web/crm/src/app/api/crm/customers/route.ts', '/crm/customers');
assertRouteProxy('apps/web/crm/src/app/api/crm/contracts/route.ts', '/crm/contracts');
assertRouteProxy('apps/web/crm/src/app/api/crm/reports/preview/route.ts', '/crm/reports/preview');
assertRouteProxy('apps/web/crm/src/app/api/crm/business-plan/preview/route.ts', '/crm/business-plan/preview');
assertRouteProxy('apps/web/crm/src/app/api/crm/business-plan/performance-preview/route.ts', '/crm/business-plan/performance-preview');
assertRouteProxy('apps/web/crm/src/app/api/crm/cost-plan/preview/route.ts', '/crm/cost-plan/preview');
assertRouteProxy('apps/web/crm/src/app/api/crm/operations/preview/route.ts', '/crm/operations/preview');
assertRouteProxy('apps/web/crm/src/app/api/crm/quote-seller-profile/route.ts', '/crm/quote-seller-profile');
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

const opportunityService = readText('apps/server/src/modules/crm/opportunity/opportunity.service.ts');
assertIncludes(opportunityService, 'addOpportunityVersion', 'CRM opportunity service must support version add');
assertIncludes(opportunityService, 'convertOpportunityToContract', 'CRM opportunity service must support contract conversion');
assertIncludes(opportunityService, 'createQuoteDmsDocumentDraft', 'CRM quote DMS draft handoff must be implemented');
assertIncludes(opportunityService, 'executeQuoteDmsDocumentLifecycle', 'CRM quote DMS lifecycle execution must be implemented');
assertIncludes(opportunityService, 'ownerUserId', 'CRM opportunities must keep common user owner mapping');

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
assertIncludes(migrationEvidenceBundlePreparer, 'runNodeExpectFailure', 'CRM migration evidence bundle preparer self-test must prove draft templates do not pass');

const migrationEvidenceBundleVerifier = readText('scripts/verify-crm-migration-evidence-bundle.mjs');
assertIncludes(migrationEvidenceBundleVerifier, 'validateAccountingPaymentProviderReport', 'CRM migration evidence bundle verifier must reuse accounting/payment report validator');
assertIncludes(migrationEvidenceBundleVerifier, 'validateCrmAiRagRuntimeReport', 'CRM migration evidence bundle verifier must reuse CRM AI/RAG report validator');
assertIncludes(migrationEvidenceBundleVerifier, 'validateProtectedSourceReflectionReport', 'CRM migration evidence bundle verifier must reuse protected source report validator');
assertIncludes(migrationEvidenceBundleVerifier, 'crm-local-verification-report.json', 'CRM migration evidence bundle verifier must require local verification report');
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
assertIncludes(migrationCompletionVerifier, 'verify:crm-launch', 'CRM migration completion audit must include static launch readiness');
assertIncludes(migrationCompletionVerifier, 'verify:crm-local', 'CRM migration completion audit must include local build/test verification');
assertIncludes(migrationCompletionVerifier, 'verify-crm-local-evidence.mjs', 'CRM migration completion audit must run the CRM local verifier');
assertIncludes(migrationCompletionVerifier, 'inspectInputs', 'CRM migration completion audit must include diagnostic input inspection');
assertIncludes(migrationCompletionVerifier, 'diagnostic-only', 'CRM migration completion audit must mark input inspection as diagnostic-only');
assertIncludes(migrationCompletionVerifier, 'formatInputInspectionSummary', 'CRM migration completion audit must print input inspection summary on failure');
assertIncludes(migrationCompletionVerifier, 'crm-demo-source-migration', 'CRM migration completion audit must default to the demo source migration scope');
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

const pmsCrmHandoff = readText('apps/server/src/modules/pms/project/project-handoff-contract.service.ts');
assertIncludes(pmsCrmHandoff, 'crm-handoff-snapshot', 'PMS CRM handoff must persist explicit snapshot acceptance');
assertNotIncludes(pmsCrmHandoff, 'createOpportunity', 'PMS CRM handoff must not write CRM opportunities');

const pmsCrmHandoffApi = readText('apps/web/pms/src/lib/api/endpoints/crmHandoff.ts');
assertIncludes(pmsCrmHandoffApi, '/crm/contracts', 'PMS CRM handoff must list CRM contract candidates through the CRM API boundary');
assertIncludes(pmsCrmHandoffApi, '/pms-handoff-preview', 'PMS CRM handoff must consume CRM handoff preview through the CRM API boundary');

const crmReadme = readText('docs/crm/README.md');
assertIncludes(crmReadme, 'verify:crm-launch', 'CRM README must document the CRM launch readiness gate');
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
assertIncludes(crmReadme, 'diagnostic-only input inspection', 'CRM README must document completion audit diagnostic input inspection output');
assertIncludes(crmReadme, 'protectedSourceCandidateSummary', 'CRM README must document protected source candidate summary output');
assertIncludes(crmReadme, 'requiredExternalInputs', 'CRM README must document structured external input requests');
assertIncludes(crmReadme, 'completionCheckId', 'CRM README must document external input completion check ids');
assertIncludes(crmReadme, 'verificationCommand', 'CRM README must document external input verification commands');
assertIncludes(crmReadme, 'verify:crm-accounting-payment-provider:ready-precheck', 'CRM README must document the external ERP/API provider precheck gate');
assertIncludes(crmReadme, '실제 ERP/API 반영은 외부 회계·지급 시스템 경계', 'CRM README must keep real ERP/API as an external boundary');
assertIncludes(crmReadme, 'provider-gated 외부 API 실행 mode', 'CRM README must document provider-gated external ERP/API execution mode');
assertIncludes(crmReadme, 'SSOO 공통 AI/RAG provider', 'CRM README must keep provider-ready RAG evidence separate');
assertIncludes(crmReadme, '보호된 발표자료', 'CRM README must document protected source material evidence gate');

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
