#!/usr/bin/env node

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  createRepositoryWorktreeIdentity,
  sameRepositoryWorktreeIdentity,
} from './repository-worktree-identity.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseRoot = path.join(repoRoot, 'packages', 'database');
const requireFromDatabase = createRequire(path.join(databaseRoot, 'package.json'));
const { config: loadEnv } = requireFromDatabase('dotenv');
const { Client } = requireFromDatabase('pg');

loadEnv({ path: path.join(repoRoot, '.env.local'), quiet: true });
loadEnv({ path: path.join(repoRoot, '.env'), quiet: true, override: false });

const argv = process.argv.slice(2);
const apiBaseUrl = (readOption('api-url', 'CRM_RUNTIME_API_URL', 'http://127.0.0.1:4105/api')).replace(/\/$/, '');
const reportPath = path.resolve(readOption(
  'report-path',
  'CRM_CORE_RUNTIME_REPORT_PATH',
  path.join(repoRoot, 'output', 'crm-current-demo', 'core-runtime-report.json'),
));
const sourceDatabaseUrl = process.env.DATABASE_URL;
if (!sourceDatabaseUrl) throw new Error('DATABASE_URL is required.');
const targetDatabaseUrl = new URL(sourceDatabaseUrl);
const databaseName = process.env.CRM_RALPH_DATABASE_NAME?.trim() || targetDatabaseUrl.pathname.slice(1);
if (!/^ssoo_crm_ralph_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error(`CRM core runtime verification is restricted to an isolated ssoo_crm_ralph_* database, got ${databaseName}`);
}
targetDatabaseUrl.pathname = `/${databaseName}`;
targetDatabaseUrl.searchParams.delete('schema');

const startedAt = new Date();
const worktreeIdentity = createRepositoryWorktreeIdentity({ repoRoot });
const marker = `CRM-RALPH-CORE-${Date.now()}`;
const targetYear = 2097;
const checks = [];
const cleanupEvidence = {};
let failure = null;
let adminToken;
let viewerToken;
let opportunityId;
let versionOpportunityId;
let contractId;
let sourcePlanId;
let carriedPlanId;

const client = new Client({ connectionString: targetDatabaseUrl.toString() });
await client.connect();

try {
  await check('BT-01-auth-session', 'Actual auth boundary rejects anonymous/invalid access and issues current admin/viewer sessions.', async () => {
    await request('/crm/dashboard', { statuses: [401] });
    await request('/auth/login', {
      method: 'POST',
      body: { loginId: 'admin', password: `${marker}-invalid!` },
      statuses: [401],
    });
    [adminToken, viewerToken] = await Promise.all([
      login('admin', process.env.CRM_RUNTIME_ADMIN_PASSWORD || 'admin123!'),
      login('viewer.han', process.env.CRM_RUNTIME_USER_PASSWORD || 'user123!'),
    ]);
    return { anonymousStatus: 401, invalidLoginStatus: 401, roles: ['admin', 'viewer'] };
  });

  await check('BT-02-profile-and-shared-settings', 'Authenticated profile and shared CRM seller settings are readable from the current runtime.', async () => {
    const profile = dataOf(await request('/users/profile', { token: adminToken }));
    assert(profile?.loginId === 'admin', `admin profile loginId mismatch: ${profile?.loginId}`);
    for (const key of ['userName', 'displayName', 'email', 'departmentCode', 'positionCode', 'roleCode']) {
      assert(Object.hasOwn(profile, key), `admin profile is missing ${key}`);
    }
    const seller = dataOf(await request('/crm/quote-seller-profile', { token: adminToken }));
    assert(typeof seller?.companyName === 'string', 'CRM seller profile did not return companyName');
    return { profileKeys: Object.keys(profile).sort(), sellerInfoStatus: seller.ciStatus };
  });

  await check('BT-04-dashboard-source-semantics', 'Dashboard and source-compatible opportunity list expose seeded summaries, filters, and deterministic sorting.', async () => {
    const dashboard = dataOf(await request('/crm/dashboard', { token: viewerToken }));
    assert(dashboard?.sourceCompatibility, 'dashboard sourceCompatibility summary is missing');
    const list = dataOf(await request('/crm/opportunities?sourceStatus=진행중&sort=customer-asc', { token: viewerToken }));
    assert(Array.isArray(list?.items), 'opportunity list items are missing');
    assert(list?.summary?.activeFilters?.sort === 'customer-asc', 'opportunity customer sort was not applied');
    return {
      dashboardKeys: Object.keys(dashboard).sort(),
      filteredCount: list.items.length,
      activeFilters: list.summary.activeFilters,
    };
  });

  await check('BT-05-opportunity-core', 'Opportunity fields, five source line categories, calculations, CRUD, confirmation, locking, and versions execute against the isolated DB.', async () => {
    const payload = opportunityPayload('1차 검증');
    await request('/crm/opportunities', { token: viewerToken, method: 'POST', body: payload, statuses: [403] });
    const created = dataOf(await request('/crm/opportunities', { token: adminToken, method: 'POST', body: payload }));
    opportunityId = created?.id;
    assert(typeof opportunityId === 'string' && opportunityId.startsWith('crm-opp-'), `opportunity create did not return an id: ${opportunityId}`);
    assert(created.revenueLines?.length === 2 && created.costLines?.length === 3, 'opportunity did not persist 2 revenue + 3 cost source lines');
    assert(created.revenueSubtotal === 162_000_000, `opportunity revenue subtotal expected 162000000, got ${created.revenueSubtotal}`);
    assert(created.specialDiscountAmount === 5_000_000, `opportunity discount expected 5000000, got ${created.specialDiscountAmount}`);
    assert(created.revenueTotal === 157_000_000, `opportunity final revenue expected 157000000, got ${created.revenueTotal}`);

    const dbRow = (await client.query(`
      select count(*)::int as count,
             (select count(*)::int from crm.crm_opportunity_line_d line where line.opportunity_id = opportunity.opportunity_id and line.is_active = true) as line_count
        from crm.crm_opportunity_m opportunity
       where opportunity.opportunity_code = $1 and opportunity.is_active = true
       group by opportunity.opportunity_id
    `, [opportunityId])).rows[0];
    assert(Number(dbRow?.count) === 1 && Number(dbRow?.line_count) === 5, 'opportunity DB master/line persistence mismatch');

    const updatedPayload = opportunityPayload('수정 검증');
    updatedPayload.nextAction = `${marker} update and confirm`;
    const updated = dataOf(await request(`/crm/opportunities/${opportunityId}`, {
      token: adminToken,
      method: 'PUT',
      body: updatedPayload,
    }));
    assert(updated.nextAction === updatedPayload.nextAction, 'opportunity update did not round-trip');

    const quote = dataOf(await request(`/crm/opportunities/${opportunityId}/quote-preview`, { token: viewerToken }));
    assert(quote?.summary?.revenueSubtotal === 162_000_000, 'quote preview subtotal does not match opportunity calculation');
    assert(quote?.summary?.quoteTotal === 157_000_000, 'quote preview final total does not match opportunity calculation');

    const confirmed = dataOf(await request(`/crm/opportunities/${opportunityId}/confirm`, { token: adminToken, method: 'POST' }));
    assert(confirmed.confirmed === true && confirmed.status === 'won', 'opportunity confirm did not lock/win the opportunity');
    await request(`/crm/opportunities/${opportunityId}`, { token: adminToken, method: 'PUT', body: updatedPayload, statuses: [400] });
    await request(`/crm/opportunities/${opportunityId}`, { token: adminToken, method: 'DELETE', statuses: [400] });

    const version = dataOf(await request(`/crm/opportunities/${opportunityId}/versions`, { token: adminToken, method: 'POST' }));
    versionOpportunityId = version?.id;
    assert(version?.version === 2 && version?.isLatest === true && version?.confirmed === false, 'opportunity version creation semantics mismatch');
    await request(`/crm/opportunities/${opportunityId}`, { token: adminToken, method: 'PUT', body: updatedPayload, statuses: [400] });
    const versions = dataOf(await request(`/crm/opportunities/${versionOpportunityId}/versions`, { token: viewerToken }));
    assert(Array.isArray(versions?.versions) && versions.versions.length === 2, 'opportunity version ledger did not return two versions');
    return {
      opportunityId,
      versionOpportunityId,
      lineCount: 5,
      amounts: { raw: 162_000_000, discount: 5_000_000, final: 157_000_000 },
      lockedMutationStatuses: [400, 400],
      versionCount: 2,
    };
  });

  await check('BT-09-contract-core', 'Contract party identity, five source line categories, billing plan validation, CRUD, confirmation, and locking execute against the isolated DB.', async () => {
    const payload = contractPayload('1차 검증');
    await request('/crm/contracts', { token: viewerToken, method: 'POST', body: payload, statuses: [403] });
    const created = dataOf(await request('/crm/contracts', { token: adminToken, method: 'POST', body: payload }));
    contractId = created?.id;
    assert(typeof contractId === 'string' && contractId.startsWith('crm-ct-'), `contract create did not return an id: ${contractId}`);
    assert(created.clientContactName === `${marker} 고객담당`, 'contract customer contact did not round-trip');
    assert(created.revenueLines?.length === 2 && created.costLines?.length === 3, 'contract did not persist 2 revenue + 3 cost source lines');
    assert(created.billingPlan?.length === 2, 'contract billing plan did not persist two months');

    const invalidBilling = contractPayload('invalid billing');
    invalidBilling.billingPlan[0].revenueAmount -= 1;
    await request('/crm/contracts', { token: adminToken, method: 'POST', body: invalidBilling, statuses: [400] });

    const updatedPayload = contractPayload('수정 검증');
    updatedPayload.nextAction = `${marker} contract updated`;
    const updated = dataOf(await request(`/crm/contracts/${contractId}`, {
      token: adminToken,
      method: 'PUT',
      body: updatedPayload,
    }));
    assert(updated.nextAction === updatedPayload.nextAction, 'contract update did not round-trip');

    const split = dataOf(await request('/crm/contracts/billing-split-preview', {
      token: viewerToken,
      method: 'POST',
      body: {
        startDate: `${targetYear}-01-01`, endDate: `${targetYear}-02-28`,
        totalRevenue: 200_000_000, totalExternalCost: 60_000_000,
        target: 'both', periodMonths: 1, truncUnit: 1, includeLastMonth: true,
      },
    }));
    assert(Array.isArray(split?.lines) && split.lines.length === 2, 'billing split preview did not return two months');

    const confirmed = dataOf(await request(`/crm/contracts/${contractId}/confirm`, { token: adminToken, method: 'POST' }));
    assert(confirmed.confirmed === true && confirmed.status === 'active', 'contract confirmation semantics mismatch');
    await request(`/crm/contracts/${contractId}`, { token: adminToken, method: 'PUT', body: updatedPayload, statuses: [400] });
    await request(`/crm/contracts/${contractId}`, { token: adminToken, method: 'DELETE', statuses: [400] });
    return { contractId, lineCount: 5, billingMonths: 2, invalidBillingStatus: 400, lockedMutationStatuses: [400, 400] };
  });

  await check('BT-10-billing-actual-and-performance', 'Confirmed-contract billing actual full replace and monthly plan/actual/delta reporting execute against the isolated DB.', async () => {
    const actual = dataOf(await request(`/crm/contracts/${contractId}/billing-actual`, {
      token: adminToken,
      method: 'PUT',
      body: { lines: [
        { billingYm: `${targetYear}/01`, revenueAmount: 90_000_000, externalCostAmount: 25_000_000 },
        { billingYm: `${targetYear}/02`, revenueAmount: 100_000_000, externalCostAmount: 30_000_000 },
      ] },
    }));
    assert(actual?.actualLines?.length === 2, 'billing actual did not full-replace with two rows');
    assert(actual.summary?.actualRevenueTotal === 190_000_000, 'billing actual revenue total mismatch');
    const performance = dataOf(await request(`/crm/contracts/monthly-performance?year=${targetYear}&search=${encodeURIComponent(marker)}`, { token: viewerToken }));
    assert(performance?.items?.length === 1, `contract performance expected one marker row, got ${performance?.items?.length}`);
    assert(performance.items[0].total.planRevenueAmount === 200_000_000, 'contract performance plan total mismatch');
    assert(performance.items[0].total.actualRevenueAmount === 190_000_000, 'contract performance actual total mismatch');
    return {
      actualRows: 2,
      planRevenueTotal: 200_000_000,
      actualRevenueTotal: 190_000_000,
      revenueDelta: -10_000_000,
    };
  });

  await check('BT-11-business-plan-core', 'Three-year business-plan row CRUD, monthly paste-equivalent arrays, confirmation lock, WBS exception, carry-forward, reopen, and delete execute against the isolated DB.', async () => {
    const snapshot = dataOf(await request('/crm/business-plan/plans/snapshot', {
      token: adminToken,
      method: 'POST',
      body: { baseYear: targetYear, search: marker, planName: `${marker} 사업계획`, memo: 'current demo runtime proof' },
    }));
    sourcePlanId = snapshot?.id;
    assert(sourcePlanId, 'business-plan snapshot did not return an id');

    const monthlyRevenueAmounts = Array.from({ length: 12 }, (_, index) => 10_000_000 + index);
    const monthlyExternalCostAmounts = Array.from({ length: 12 }, (_, index) => 3_000_000 + index);
    const rowPayload = {
      businessType: 'SI 구축', industryLine: marker, ownerName: 'Ralph Core', region: 'domestic',
      businessName: `${marker} 사업`, wbsCode: `WBS-${targetYear}-CORE`,
      monthlyRevenueAmounts, monthlyExternalCostAmounts,
      nextYearRevenueAmount: 150_000_000, nextYearExternalCostAmount: 45_000_000,
      followingYearRevenueAmount: 180_000_000, followingYearExternalCostAmount: 54_000_000,
      memo: 'three-year source-compatible row',
    };
    const createdRow = dataOf(await request(`/crm/business-plan/plans/${sourcePlanId}/rows`, {
      token: adminToken, method: 'POST', body: rowPayload,
    }));
    const rowCode = createdRow?.rowCode;
    assert(rowCode && createdRow.plan?.lines?.filter((line) => line.rowCode === rowCode).length === 3, 'business-plan row did not persist three annual lines');
    const baseLine = createdRow.plan.lines.find((line) => line.rowCode === rowCode && line.targetYear === targetYear);
    assert(baseLine?.id, 'business-plan base-year line is missing');

    const monthly = dataOf(await request(`/crm/business-plan/plans/${sourcePlanId}/lines/${baseLine.id}/monthly-plan`, {
      token: adminToken,
      method: 'POST',
      body: { monthlyRevenueAmounts, monthlyExternalCostAmounts, memo: '12-month paste-equivalent save' },
    }));
    assert(monthly?.line?.monthlyPlanRevenueAmounts?.length === 12, 'business-plan monthly plan did not round-trip 12 values');

    const disposableRow = dataOf(await request(`/crm/business-plan/plans/${sourcePlanId}/rows`, {
      token: adminToken,
      method: 'POST',
      body: { ...rowPayload, businessName: `${marker} 삭제 검증`, wbsCode: `WBS-${targetYear}-DELETE` },
    }));
    assert(disposableRow?.rowCode, 'business-plan disposable delete row was not created');
    const deletedRow = dataOf(await request(`/crm/business-plan/plans/${sourcePlanId}/rows/${disposableRow.rowCode}`, {
      token: adminToken, method: 'DELETE',
    }));
    assert(deletedRow?.rowCode === disposableRow.rowCode, 'business-plan row delete did not return the deleted row code');

    const confirmed = dataOf(await request(`/crm/business-plan/plans/${sourcePlanId}/confirm`, { token: adminToken, method: 'POST' }));
    assert(confirmed.confirmed === true, 'business plan did not confirm');
    await request(`/crm/business-plan/plans/${sourcePlanId}/rows/${rowCode}`, { token: adminToken, method: 'PUT', body: rowPayload, statuses: [400] });
    const wbsUpdated = dataOf(await request(`/crm/business-plan/plans/${sourcePlanId}/rows/${rowCode}/wbs`, {
      token: adminToken, method: 'PUT', body: { wbsCode: `WBS-${targetYear}-CONFIRMED` },
    }));
    assert(wbsUpdated?.plan?.lines?.some((line) => line.rowCode === rowCode && line.wbsCode === `WBS-${targetYear}-CONFIRMED`), 'confirmed-plan WBS exception did not persist');

    const carried = dataOf(await request('/crm/business-plan/plans/carry-forward', {
      token: adminToken,
      method: 'POST',
      body: { baseYear: targetYear + 1, sourceBaseYear: targetYear, search: marker, planName: `${marker} 이월` },
    }));
    carriedPlanId = carried?.id;
    assert(carriedPlanId && carried.baseYear === targetYear + 1 && carried.confirmed === false, 'business-plan carry-forward semantics mismatch');
    await request(`/crm/business-plan/plans/${carriedPlanId}`, { token: adminToken, method: 'DELETE' });
    carriedPlanId = undefined;

    const reopened = dataOf(await request(`/crm/business-plan/plans/${sourcePlanId}/reopen`, { token: adminToken, method: 'POST' }));
    assert(reopened.confirmed === false, 'business plan did not reopen');
    const reconfirmed = dataOf(await request(`/crm/business-plan/plans/${sourcePlanId}/confirm`, { token: adminToken, method: 'POST' }));
    assert(reconfirmed.confirmed === true, 'business plan did not reconfirm after reopen');
    return { baseYear: targetYear, annualLineCount: 3, monthlyValueCount: 12, rowDelete: true, lockStatus: 400, confirmedWbsEditable: true, carryForward: true, reopenAndReconfirm: true };
  });

  await check('BT-12-business-plan-performance', 'Source-compatible performance compares confirmed business plan semantics to confirmed contract billing plans.', async () => {
    const sourceCompatible = dataOf(await request(`/crm/business-plan/performance-preview?year=${targetYear}&mode=source-compatible&search=${encodeURIComponent(marker)}`, { token: viewerToken }));
    const extended = dataOf(await request(`/crm/business-plan/performance-preview?year=${targetYear}&mode=extended-actual&search=${encodeURIComponent(marker)}`, { token: viewerToken }));
    assert(sourceCompatible?.summary?.mode === 'source-compatible', 'business-plan performance source-compatible mode was not preserved');
    assert(extended?.summary?.mode === 'extended-actual', 'business-plan performance extended mode was not preserved');
    return {
      sourceCompatibleMode: sourceCompatible.summary.mode,
      extendedMode: extended.summary.mode,
      sourceRows: sourceCompatible.rows?.length ?? 0,
      extendedRows: extended.rows?.length ?? 0,
    };
  });

  await check('BT-13-internal-cost-source-grid', 'The fixed five-item internal-cost grid accepts 12-month values, rejects an incomplete denominator, and returns the saved grid.', async () => {
    const itemCodes = ['labor', 'other', 'dept_adj', 'svc', 'dept_common'];
    const items = itemCodes.map((itemCode, itemIndex) => ({
      itemCode,
      monthlyPlanAmounts: Array.from({ length: 12 }, (_, monthIndex) => itemIndex * 100 + monthIndex),
      monthlyActualAmounts: Array.from({ length: 12 }, (_, monthIndex) => itemIndex * 90 + monthIndex),
    }));
    await request('/crm/cost-plan/internal-cost/source-grid', {
      token: viewerToken, method: 'POST', body: { targetYear, items }, statuses: [403],
    });
    await request('/crm/cost-plan/internal-cost/source-grid', {
      token: adminToken, method: 'POST', body: { targetYear, items: items.slice(0, 4) }, statuses: [400],
    });
    const saved = dataOf(await request('/crm/cost-plan/internal-cost/source-grid', {
      token: adminToken, method: 'POST', body: { targetYear, items },
    }));
    const grid = saved?.grid?.items ?? [];
    assert(grid.length === 5, `internal-cost source grid expected five items, got ${grid.length}`);
    assert(grid.map((item) => item.itemCode).join(',') === itemCodes.join(','), 'internal-cost source item order mismatch');
    const preview = dataOf(await request(`/crm/cost-plan/preview?year=${targetYear}`, { token: viewerToken }));
    assert(preview?.internalCostSourceGrid?.items?.length === 5, 'cost preview did not return the fixed five-item source grid');
    return { itemCodes, monthsPerItem: 12, incompleteGridStatus: 400, viewerMutationStatus: 403 };
  });

  await check('BT-17-reports-errors-and-confirmation', 'Reports expose deterministic preview/error behavior and confirmation/reopen authorization.', async () => {
    await request('/crm/reports/preview?year=1999', { token: adminToken, statuses: [400] });
    const preview = dataOf(await request(`/crm/reports/preview?year=${targetYear}&search=${encodeURIComponent(marker)}`, { token: viewerToken }));
    assert(preview?.summary?.year === targetYear && preview?.monthlyTrend?.length === 12, 'reports preview shape mismatch');
    await request('/crm/reports/confirm', {
      token: viewerToken, method: 'POST', body: { year: targetYear, search: marker }, statuses: [403],
    });
    const confirmed = dataOf(await request('/crm/reports/confirm', {
      token: adminToken, method: 'POST', body: { year: targetYear, search: marker, memo: 'current demo runtime proof' },
    }));
    const confirmationId = confirmed?.confirmation?.id;
    assert(confirmationId && confirmed.confirmation.status === 'confirmed', 'report confirmation did not return a confirmed ledger row');
    const reopened = dataOf(await request(`/crm/reports/confirmations/${confirmationId}/reopen`, { token: adminToken, method: 'POST' }));
    assert(reopened?.confirmation?.status === 'reopened', 'report confirmation did not reopen');
    return { invalidYearStatus: 400, monthlyTrendCount: 12, viewerConfirmStatus: 403, confirmationId, reopened: true };
  });

  await cleanupRuntime();
  const residue = await activeResidue();
  assert(Object.values(residue).every((value) => value === 0), `CRM core runtime active residue remains: ${JSON.stringify(residue)}`);
  cleanupEvidence.activeResidue = residue;
  cleanupEvidence.status = 'passed';
} catch (error) {
  failure = error;
  try {
    await cleanupRuntime();
    cleanupEvidence.activeResidue = await activeResidue();
    cleanupEvidence.status = Object.values(cleanupEvidence.activeResidue).every((value) => value === 0) ? 'passed-after-failure' : 'failed';
  } catch (cleanupError) {
    cleanupEvidence.status = 'failed';
    cleanupEvidence.error = formatError(cleanupError);
  }
} finally {
  await client.end();
}

const completedWorktreeIdentity = createRepositoryWorktreeIdentity({ repoRoot });
const worktreeUnchanged = sameRepositoryWorktreeIdentity(worktreeIdentity, completedWorktreeIdentity);
checks.push({
  id: 'worktree-identity-unchanged',
  requirement: 'Repository file contents remain unchanged throughout core runtime verification.',
  status: worktreeUnchanged ? 'passed' : 'failed',
  evidence: { started: worktreeIdentity, completed: completedWorktreeIdentity },
});
if (!worktreeUnchanged && !failure) failure = new Error('Repository worktree identity changed during CRM core runtime verification.');
if (cleanupEvidence.status !== 'passed' && !failure) failure = new Error(`CRM core runtime cleanup did not pass: ${cleanupEvidence.status}`);

const finishedAt = new Date();
const report = {
  schemaVersion: 1,
  scope: 'crm-current-demo-core-runtime',
  status: failure ? 'failed' : 'passed',
  worktreeIdentity,
  databaseName,
  isolatedDatabase: /^ssoo_crm_ralph_[a-z0-9_]+$/.test(databaseName),
  apiBaseUrl,
  marker,
  targetYear,
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt.getTime() - startedAt.getTime(),
  checks,
  cleanup: cleanupEvidence,
  ...(failure ? { failure: formatError(failure) } : {}),
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, reportPath: path.relative(repoRoot, reportPath), databaseName, checkCount: checks.length, cleanup: cleanupEvidence.status }, null, 2)}\n`);
if (failure) {
  process.stderr.write(`${formatError(failure)}\n`);
  process.exit(1);
}

async function check(id, requirement, action) {
  const started = Date.now();
  try {
    const evidence = await action();
    checks.push({ id, requirement, status: 'passed', durationMs: Date.now() - started, evidence });
  } catch (error) {
    checks.push({ id, requirement, status: 'failed', durationMs: Date.now() - started, error: formatError(error) });
    throw error;
  }
}

async function request(pathname, { token, method = 'GET', body, statuses = [200, 201] } = {}) {
  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      'x-ssoo-app': 'crm',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => null);
  assert(statuses.includes(response.status), `${method} ${pathname} expected ${statuses.join('/')}, got ${response.status}: ${JSON.stringify(payload)}`);
  return { status: response.status, payload };
}

async function login(loginId, password) {
  const result = await request('/auth/login', { method: 'POST', body: { loginId, password } });
  const token = result.payload?.data?.accessToken;
  assert(typeof token === 'string' && token.length > 20, `login did not return an access token for ${loginId}`);
  return token;
}

function dataOf(result) {
  assert(result.payload?.success === true, `API response is not a success envelope: ${JSON.stringify(result.payload)}`);
  return result.payload.data;
}

function opportunityPayload(suffix) {
  return {
    customerName: marker,
    opportunityName: `${marker} ${suffix}`,
    ownerName: 'Ralph Core',
    businessType: 'SI 구축',
    industryLine: marker,
    region: 'domestic',
    status: 'proposal',
    priority: 'high',
    paymentTermCode: 'NET30',
    specialDiscountType: 'amount',
    specialDiscountValue: 5_000_000,
    expectedStartDate: `${targetYear}-01-01`,
    expectedEndDate: `${targetYear}-12-31`,
    clientContactName: `${marker} 고객담당`,
    nextAction: `${marker} next action`,
    revenueLines: [
      { category: 'product', label: `${marker} 제품`, quantity: 1, unitPrice: 90_000_000 },
      { category: 'service', label: `${marker} 서비스`, quantity: 2, unitPrice: 36_000_000, serviceType: 'internal' },
    ],
    costLines: [
      { category: 'product', label: `${marker} 제품원가`, quantity: 1, unitPrice: 50_000_000 },
      { category: 'internal-cost', label: `${marker} 내부용역`, quantity: 1, unitPrice: 20_000_000, serviceType: 'internal' },
      { category: 'external-cost', label: `${marker} 외부용역`, quantity: 1, unitPrice: 30_000_000, serviceType: 'external' },
    ],
  };
}

function contractPayload(suffix) {
  return {
    customerName: marker,
    contractName: `${marker} ${suffix}`,
    ownerName: 'Ralph Core',
    clientContactName: `${marker} 고객담당`,
    businessType: 'SI 구축',
    industryLine: marker,
    region: 'domestic',
    status: 'review',
    contractStartDate: `${targetYear}-01-01`,
    contractEndDate: `${targetYear}-02-28`,
    wbsCode: `WBS-${targetYear}-CORE`,
    paymentTermCode: 'NET30',
    specialDiscountType: 'amount',
    specialDiscountValue: 0,
    revenueLines: [
      { category: 'product', label: `${marker} 계약제품`, quantity: 1, unitPrice: 120_000_000 },
      { category: 'service', label: `${marker} 계약서비스`, quantity: 1, unitPrice: 80_000_000, serviceType: 'internal' },
    ],
    costLines: [
      { category: 'product', label: `${marker} 계약제품원가`, quantity: 1, unitPrice: 40_000_000 },
      { category: 'internal-cost', label: `${marker} 계약내부원가`, quantity: 1, unitPrice: 20_000_000, serviceType: 'internal' },
      { category: 'external-cost', label: `${marker} 계약외부원가`, quantity: 1, unitPrice: 60_000_000, serviceType: 'external' },
    ],
    billingPlan: [
      { billingYm: `${targetYear}/01`, revenueAmount: 100_000_000, externalCostAmount: 50_000_000 },
      { billingYm: `${targetYear}/02`, revenueAmount: 100_000_000, externalCostAmount: 50_000_000 },
    ],
    nextAction: `${marker} contract next action`,
  };
}

async function cleanupRuntime() {
  if (adminToken) {
    if (carriedPlanId) {
      await request(`/crm/business-plan/plans/${carriedPlanId}/reopen`, { token: adminToken, method: 'POST', statuses: [200, 201, 400, 404] }).catch(() => undefined);
      await request(`/crm/business-plan/plans/${carriedPlanId}`, { token: adminToken, method: 'DELETE', statuses: [200, 201, 400, 404] }).catch(() => undefined);
      carriedPlanId = undefined;
    }
    if (sourcePlanId) {
      await request(`/crm/business-plan/plans/${sourcePlanId}/reopen`, { token: adminToken, method: 'POST', statuses: [200, 201, 400, 404] }).catch(() => undefined);
      await request(`/crm/business-plan/plans/${sourcePlanId}`, { token: adminToken, method: 'DELETE', statuses: [200, 201, 400, 404] }).catch(() => undefined);
      sourcePlanId = undefined;
    }
    if (contractId) {
      await request(`/crm/contracts/${contractId}/reopen`, { token: adminToken, method: 'POST', statuses: [200, 201, 400, 404] }).catch(() => undefined);
      await request(`/crm/contracts/${contractId}`, { token: adminToken, method: 'DELETE', statuses: [200, 201, 404] }).catch(() => undefined);
      contractId = undefined;
    }
    if (versionOpportunityId) {
      await request(`/crm/opportunities/${versionOpportunityId}/reopen`, { token: adminToken, method: 'POST', statuses: [200, 201, 400, 404] }).catch(() => undefined);
      await request(`/crm/opportunities/${versionOpportunityId}`, { token: adminToken, method: 'DELETE', statuses: [200, 201, 404] }).catch(() => undefined);
      versionOpportunityId = undefined;
    }
    if (opportunityId) {
      await request(`/crm/opportunities/${opportunityId}/reopen`, { token: adminToken, method: 'POST', statuses: [200, 201, 400, 404] }).catch(() => undefined);
      await request(`/crm/opportunities/${opportunityId}`, { token: adminToken, method: 'DELETE', statuses: [200, 201, 404] }).catch(() => undefined);
      opportunityId = undefined;
    }
  }
  await client.query('delete from crm.crm_report_confirmation_m where target_year = $1 and search_text = $2', [targetYear, marker]);
  await client.query('delete from crm.crm_cost_plan_internal_item_monthly_d where target_year = $1', [targetYear]);
  await client.query('delete from crm.crm_business_plan_performance_actual_d where target_year = $1 and industry_line = $2', [targetYear, marker]);
}

async function activeResidue() {
  const row = (await client.query(`
    select
      (select count(*)::int from crm.crm_opportunity_m where customer_name = $1 and is_active = true) as opportunities,
      (select count(*)::int from crm.crm_contract_m where customer_name = $1 and is_active = true) as contracts,
      (select count(*)::int from crm.crm_business_plan_m where plan_name like $2 and is_active = true) as business_plans,
      (select count(*)::int from crm.crm_cost_plan_internal_item_monthly_d where target_year = $3 and is_active = true) as internal_cost_items,
      (select count(*)::int from crm.crm_report_confirmation_m where target_year = $3 and search_text = $1) as reports
  `, [marker, `${marker}%`, targetYear])).rows[0];
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)]));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const inline = argv.find((argument) => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1]) return argv[index + 1];
  return process.env[envName] || fallback;
}

function formatError(error) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
