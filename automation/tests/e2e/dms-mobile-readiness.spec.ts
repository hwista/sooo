import { expect, test } from '@playwright/test';

import {
  loginAndRestoreSession,
  monitorBrowserFailures,
  runLaunchPhase,
} from './support/launch-browser';

const dmsUrl = process.env.DMS_GO_LIVE_DMS_URL
  ?? process.env.PLAYWRIGHT_BASE_URL
  ?? 'http://127.0.0.1:3003';
const adminUrl = process.env.DMS_GO_LIVE_ADMIN_URL ?? 'http://127.0.0.1:3000';
const apiUrl = process.env.DMS_GO_LIVE_API_URL ?? 'http://127.0.0.1:4000/api';
const loginId = process.env.DMS_GO_LIVE_ADMIN_LOGIN_ID ?? 'admin';
const password = process.env.DMS_GO_LIVE_ADMIN_PASSWORD ?? 'admin123!';

test.setTimeout(180_000);

test('DMS and Admin operational navigation remain usable at 390x844', async ({ browser }) => {
  const dmsContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const dmsPage = await dmsContext.newPage();
  const dmsMonitor = monitorBrowserFailures(dmsPage, {
    label: 'DMS mobile operational navigation',
    relevantOrigins: [dmsUrl, apiUrl],
  });
  try {
    await loginAndRestoreSession(dmsPage, {
      appUrl: dmsUrl,
      loginId,
      password,
      retryAfterRateLimit: true,
      waitUntilReady: async (page) => {
        await expect(page.getByRole('heading', { name: '문서 관리 시스템' }))
          .toBeVisible({ timeout: 30_000 });
      },
    });
    await runLaunchPhase('DMS mobile menu and settings entry', async () => {
      await dmsPage.getByRole('button', { name: '모바일 메뉴 열기' }).click();
      await expect(dmsPage.getByRole('dialog', { name: 'DMS 모바일 메뉴' })).toBeVisible();
      await dmsPage.getByRole('dialog', { name: 'DMS 모바일 메뉴' })
        .getByRole('button', { name: '모바일 메뉴 닫기' }).click();

      await dmsPage.getByRole('button', { name: '사용자 메뉴' }).click();
      await dmsPage.getByRole('menuitem', { name: '문서 운영·진단' }).click();
      await expect(dmsPage.getByText('DMS 운영 readiness', { exact: true }).first())
        .toBeVisible({ timeout: 30_000 });

      await dmsPage.goto(new URL('/settings/personal-settings/storage-preference', dmsUrl).toString());
      await expect(dmsPage.getByLabel('내 기본 저장소')).toBeVisible({ timeout: 30_000 });
    });
    dmsMonitor.assertClean();
  } finally {
    await dmsContext.close();
  }

  const adminContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const adminPage = await adminContext.newPage();
  const adminMonitor = monitorBrowserFailures(adminPage, {
    label: 'Admin mobile operational navigation',
    relevantOrigins: [adminUrl, apiUrl],
  });
  try {
    await loginAndRestoreSession(adminPage, {
      appUrl: adminUrl,
      loginId,
      password,
      retryAfterRateLimit: true,
      waitUntilReady: async (page) => {
        await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 30_000 });
      },
    });
    await runLaunchPhase('Admin mobile menu and operational route', async () => {
      await adminPage.getByRole('button', { name: '모바일 메뉴 열기' }).click();
      const mobileMenu = adminPage.getByRole('dialog', { name: 'Admin 모바일 메뉴' });
      await expect(mobileMenu).toBeVisible();
      await mobileMenu.getByText('사용자 관리', { exact: true }).click();
      await expect(adminPage.getByRole('button', { name: '사용자 추가' })).toBeVisible({ timeout: 30_000 });
    });
    adminMonitor.assertClean();
  } finally {
    await adminContext.close();
  }
});
