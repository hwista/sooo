import { expect, type Page, test } from '@playwright/test';

import {
  loginAndRestoreSession,
  monitorBrowserFailures,
  runLaunchPhase,
} from './support/launch-browser';

const loginId = process.env.DMS_GO_LIVE_ADMIN_LOGIN_ID;
const password = process.env.DMS_GO_LIVE_ADMIN_PASSWORD;
const adminUrl = process.env.DMS_GO_LIVE_ADMIN_URL;
const dmsUrl = process.env.DMS_GO_LIVE_DMS_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3003';
const apiUrl = process.env.DMS_GO_LIVE_API_URL ?? dmsUrl;
const aiLaunchMode = process.env.DMS_AI_RAG_LAUNCH_MODE;

test.setTimeout(180_000);

function requireEnvironment() {
  const missing = [
    ['DMS_GO_LIVE_ADMIN_LOGIN_ID', loginId],
    ['DMS_GO_LIVE_ADMIN_PASSWORD', password],
    ['DMS_GO_LIVE_ADMIN_URL', adminUrl],
    ['DMS_AI_RAG_LAUNCH_MODE', aiLaunchMode],
  ].filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`production readiness browser environment is missing: ${missing.join(', ')}`);
  }
  if (!['exempted_external_provider', 'provider_ready'].includes(aiLaunchMode!)) {
    throw new Error(`unsupported DMS_AI_RAG_LAUNCH_MODE: ${aiLaunchMode}`);
  }
}

async function login(page: Page, appUrl: string, readyHeading: string) {
  await loginAndRestoreSession(page, {
    appUrl,
    loginId: loginId!,
    password: password!,
    waitUntilReady: async (targetPage) => {
      await expect(targetPage.getByRole('heading', { name: readyHeading })).toBeVisible({ timeout: 30_000 });
    },
  });
}

test('deployed DMS readiness and explicit AI launch disposition are browser-visible', async ({ browser }) => {
  requireEnvironment();

  const dmsContext = await browser.newContext();
  const dmsPage = await dmsContext.newPage();
  const dmsMonitor = monitorBrowserFailures(dmsPage, {
    label: 'deployed DMS readiness',
    relevantOrigins: [dmsUrl, apiUrl],
  });
  try {
    await login(dmsPage, dmsUrl, '문서 관리 시스템');
    await runLaunchPhase('deployed DMS readiness and ingest surface', async () => {
      await dmsPage.getByRole('button', { name: '사용자 메뉴' }).click();
      await dmsPage.getByRole('menuitem', { name: '문서 운영·진단' }).click();

      const readinessSurface = dmsPage.locator('section').filter({ hasText: 'DMS 운영 readiness' }).first();
      await expect(readinessSurface.getByText('런칭 준비됨', { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(readinessSurface.getByText('Ready', { exact: true })).toHaveCount(9);
      await expect(readinessSurface.getByText('Blocked', { exact: true })).toHaveCount(0);
      await expect(readinessSurface.getByText('Degraded', { exact: true })).toHaveCount(0);

      await dmsPage.getByText('수집 큐 상태', { exact: true }).first().click();
      await expect(dmsPage.getByRole('heading', { name: '수집 작업 처리' })).toBeVisible();
      await expect(dmsPage.getByText('수집 큐 조회에 실패했습니다.')).toHaveCount(0);
    });
    dmsMonitor.assertClean();
  } finally {
    await dmsContext.close();
  }

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const adminMonitor = monitorBrowserFailures(adminPage, {
    label: 'deployed Admin readiness',
    relevantOrigins: [adminUrl!, apiUrl],
  });
  try {
    await login(adminPage, adminUrl!, '대시보드');
    await runLaunchPhase('deployed Admin AI and auth readiness', async () => {
      await adminPage.goto(new URL('/ai-operations', adminUrl!).toString());
      await expect(adminPage.getByRole('heading', { name: 'Provider 준비 상태' })).toBeVisible({ timeout: 30_000 });
      await expect(adminPage.getByText('AI 운영 상태 조회에 실패했습니다.')).toHaveCount(0);

      const providerSection = adminPage.locator('#admin-ai-readiness');
      if (aiLaunchMode === 'provider_ready') {
        await expect(providerSection.getByText('ready', { exact: true })).toHaveCount(3);
      } else {
        await expect(providerSection.getByText('blocked', { exact: true }).first()).toBeVisible();
        await expect(providerSection.getByText(/비밀값을 조회하거나 수정하지 않습니다/)).toBeVisible();
      }

      await adminPage.goto(new URL('/auth', adminUrl!).toString());
      await expect(adminPage.getByRole('heading', { name: '비밀번호 재설정 메일 전달' })).toBeVisible({ timeout: 30_000 });
      await expect(adminPage.getByText('전달 준비됨', { exact: true })).toBeVisible();
      await expect(adminPage.getByText('메일 전달 상태를 조회하지 못했습니다.')).toHaveCount(0);
    });
    adminMonitor.assertClean();
  } finally {
    await adminContext.close();
  }
});
