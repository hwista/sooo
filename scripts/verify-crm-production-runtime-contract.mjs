#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

function readText(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`missing runtime-contract file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function assertIncludes(source, marker, message) {
  if (!source.includes(marker)) throw new Error(message);
}

function assertBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= secondIndex) {
    throw new Error(message);
  }
}

const routeContract = readText('apps/web/crm/src/lib/crmWorkspaceRoutes.ts');
for (const route of ['/operations', '/operations/settings', '/settings', '/reports']) {
  assertIncludes(routeContract, `pathname: '${route}'`, `CRM URL-first tab contract must define ${route}`);
}
assertIncludes(routeContract, "params.get('create') === 'opportunity'", 'CRM route contract must preserve the new-opportunity query tab');

const appLayout = readText('apps/web/crm/src/components/layout/AppLayout.tsx');
assertBefore(
  appLayout,
  'getCrmWorkspaceTabOptions(currentPath)',
  'parseSsooUserSurfaceRouteEntry(currentPath)',
  'CRM domain /settings must resolve before the shared legacy account-settings alias',
);
assertIncludes(appLayout, 'router.push(item.path)', 'CRM sidebar navigation must synchronize the browser URL');
assertIncludes(appLayout, 'router.push(tab.path)', 'CRM open-tab navigation must synchronize the browser URL');

const tabBar = readText('apps/web/crm/src/components/layout/TabBar.tsx');
assertIncludes(tabBar, 'router.push(tab.path)', 'CRM MDI tab activation must synchronize the browser URL');
assertIncludes(tabBar, 'nextActiveTab?.path', 'closing the active CRM tab must restore the next URL');

const contentArea = readText('apps/web/crm/src/components/layout/ContentArea.tsx');
assertIncludes(
  contentArea,
  "pathname === '/operations/settings' || pathname === '/settings'",
  'both CRM settings owner URLs must render the CRM settings content',
);

const reportsWorkspace = readText('apps/web/crm/src/components/pages/reports/ReportsPreviewWorkspace.tsx');
assertIncludes(reportsWorkspace, "from './reportsPreviewQuery'", 'CRM reports server component must import query normalization from a pure module');
if (/import\s*\{[^}]*normalizeReportsPreviewQueryRecord[^}]*\}\s*from '\.\/ReportsPreviewWorkspaceClient'/su.test(reportsWorkspace)) {
  throw new Error('CRM reports server component must not import callable query helpers from the client module');
}

const tabStore = readText('apps/web/crm/src/stores/tab.store.ts');
assertIncludes(tabStore, 'tab.id === CRM_HOME_TAB.id ? CRM_HOME_TAB', 'persisted CRM home tabs must not retain a stale domain path');
assertIncludes(tabStore, "tab.id === '/settings' ? { id: '/operations/settings' }", 'persisted CRM settings aliases must converge on one MDI tab');

const attemptService = readText('apps/server/src/modules/crm/operations/operation-attempt.service.ts');
assertIncludes(attemptService, 'return `/?selected=${selected}`', 'CRM operation recovery must link to the supported opportunity deep link');
if (attemptService.includes('return `/opportunities?selected=')) {
  throw new Error('CRM operation recovery must not emit the unsupported /opportunities route');
}

const crmProxy = readText('apps/web/crm/src/app/api/_shared/serverApiProxy.ts');
assertBefore(crmProxy, 'process.env.CRM_SERVER_API_URL', 'process.env.NEXT_PUBLIC_API_URL', 'CRM server-side proxy must prefer its internal runtime URL');

const adminBrowserClient = readText('apps/web/admin/src/lib/api/client.ts');
assertIncludes(adminBrowserClient, 'process.env.NEXT_PUBLIC_API_URL', 'Admin browser API client must consume its compiled public API URL');
const ralphBuild = readText('scripts/build-crm-ralph-runtime.mjs');
assertIncludes(ralphBuild, 'NEXT_PUBLIC_API_URL: publicApiUrl', 'CRM Ralph production builds must compile the isolated public API URL before runtime launch');
const ralphBuildProvenance = readText('scripts/crm-ralph-build-provenance.mjs');
assertIncludes(ralphBuildProvenance, 'compiledPublicRuntime', 'CRM Ralph build provenance must prove public URLs from compiled chunks');

const dmsProxy = readText('apps/web/dms/src/app/api/_shared/serverApiProxy.ts');
assertBefore(dmsProxy, 'process.env.DMS_SERVER_API_URL', 'process.env.NEXT_PUBLIC_API_URL', 'DMS server-side proxy must prefer its internal runtime URL');

const dmsSocket = readText('apps/web/dms/src/hooks/useDmsSocket.ts');
assertBefore(dmsSocket, 'explicitWebSocketUrl?.trim()', 'apiBaseUrl?.trim()', 'DMS WebSocket resolution must prefer the explicit public socket URL');
assertIncludes(dmsSocket, 'return new URL(normalizedApiBaseUrl, locationOrigin).origin', 'DMS WebSocket must derive an absolute public API origin before using a local-development fallback');
assertIncludes(dmsSocket, 'explicitWebSocketUrl: process.env.NEXT_PUBLIC_WS_URL', 'DMS WebSocket must consume its compiled public socket URL');
assertIncludes(dmsSocket, 'apiBaseUrl: process.env.NEXT_PUBLIC_API_URL', 'DMS WebSocket must consume its compiled public API URL');

const dmsLayout = readText('apps/web/dms/src/components/layout/AppLayout.tsx');
assertIncludes(dmsLayout, "if (pathname === '/')", 'DMS root navigation must restore the home tab before settings route parsing');
assertIncludes(dmsLayout, 'activateTab(HOME_TAB.id)', 'DMS root navigation must make root content URL-first');

const dmsTabBar = readText('apps/web/dms/src/components/layout/TabBar.tsx');
assertIncludes(dmsTabBar, 'router.push(tab.path)', 'DMS settings tab activation must synchronize its public deep-link URL');
assertIncludes(dmsTabBar, 'router.push(APP_HOME_PATH)', 'DMS home tab activation must restore the root URL');

const productionCompose = readText('compose.production.yaml');
for (const variable of [
  'ADMIN_NEXT_PUBLIC_API_URL',
  'CRM_NEXT_PUBLIC_API_URL',
  'PMS_NEXT_PUBLIC_API_URL',
  'DMS_NEXT_PUBLIC_API_URL',
  'SNS_NEXT_PUBLIC_API_URL',
]) {
  assertIncludes(productionCompose, `${variable}:?Set ${variable}`, `production Compose must require ${variable}`);
}
assertIncludes(productionCompose, 'DMS_NEXT_PUBLIC_WS_URL:-', 'production Compose must compile the approved DMS WebSocket URL');
assertIncludes(productionCompose, 'CORS_ORIGIN:?Set CORS_ORIGIN', 'production Compose must require the server CORS matrix');

const productionEnvVerifier = readText('scripts/verify-production-compose-env.mjs');
assertIncludes(productionEnvVerifier, "'NEXT_PUBLIC_CRM_APP_URL'", 'production verifier must include the CRM browser origin in CORS validation');
assertIncludes(productionEnvVerifier, "validatePublicUrl(env, issues, 'DMS_NEXT_PUBLIC_WS_URL', ['wss:', 'https:'])", 'production verifier must reject insecure DMS socket origins');
assertIncludes(productionEnvVerifier, 'must include the origin configured by ${key}', 'production verifier must require all app origins in CORS_ORIGIN');

console.log('[crm-production-runtime-contract] PASS — URL-first CRM routes, recovery links, proxies, CORS and DMS WebSocket configuration are aligned');
