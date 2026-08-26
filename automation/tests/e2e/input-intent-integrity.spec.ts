import {
  expect,
  type CDPSession,
  type Locator,
  type Page,
  test,
} from '@playwright/test';

import {
  interactiveLogin,
  monitorBrowserFailures,
  runLaunchPhase,
} from './support/launch-browser';

type RejectDetail = {
  inputId: string;
  intent: string;
};

type InputSurface = {
  label: string;
  url: string;
  sidebarInputId: string;
};

type DomainInputSurface = {
  label: string;
  url: string;
  path: string;
  inputId: string;
  intent: 'data-filter' | 'entity-lookup' | 'in-view-search';
  navigation?: 'url' | 'pms-admin-menu' | 'dms-home-search';
};

const enabled = process.env.SSOO_INPUT_INTENT_E2E === '1';
const adminUrl = process.env.SSOO_INPUT_INTENT_ADMIN_URL ?? 'http://localhost:3000';
const crmUrl = process.env.SSOO_INPUT_INTENT_CRM_URL ?? 'http://localhost:3001';
const pmsUrl = process.env.SSOO_INPUT_INTENT_PMS_URL ?? 'http://localhost:3002';
const dmsUrl = process.env.SSOO_INPUT_INTENT_DMS_URL ?? 'http://localhost:3003';
const snsUrl = process.env.SSOO_INPUT_INTENT_SNS_URL ?? 'http://localhost:3004';
const apiUrl = process.env.DMS_GO_LIVE_API_URL ?? 'http://localhost:4000/api';
const loginId = process.env.DMS_GO_LIVE_ADMIN_LOGIN_ID ?? 'admin';
const password = process.env.DMS_GO_LIVE_ADMIN_PASSWORD ?? 'admin123!';
const intentionalSearchValue = process.env.SSOO_INPUT_INTENT_INTENTIONAL_SEARCH_VALUE ?? 'admin';

const credentialProbeValues = [...new Set([
  loginId,
  'A0122024330',
  'user.name',
  'user.name@example.com',
])].filter((value) => value.length > 0);

function getCredentialProbe(index: number): string {
  return credentialProbeValues[index % credentialProbeValues.length] ?? 'credential-probe';
}

const appSurfaces: InputSurface[] = [
  { label: 'Admin', url: adminUrl, sidebarInputId: 'ssoo-admin-navigation-search-input' },
  { label: 'CRM', url: crmUrl, sidebarInputId: 'ssoo-crm-navigation-search-input' },
  { label: 'PMS', url: pmsUrl, sidebarInputId: 'ssoo-pms-desktop-navigation-search-input' },
  { label: 'DMS', url: dmsUrl, sidebarInputId: 'ssoo-dms-workspace-navigation-search-input' },
  { label: 'SNS', url: snsUrl, sidebarInputId: 'ssoo-sns-navigation-search-input' },
];

const domainInputSurfaces: DomainInputSurface[] = [
  { label: 'Admin user filter', url: adminUrl, path: '/users', inputId: 'admin-user-filter-search-input', intent: 'data-filter' },
  { label: 'CRM contract filter', url: crmUrl, path: '/contracts', inputId: 'crm-contract-search-input', intent: 'data-filter' },
  { label: 'PMS master data search', url: pmsUrl, path: '/', inputId: 'pms-master-data-search-input', intent: 'data-filter', navigation: 'pms-admin-menu' },
  { label: 'DMS in-view search', url: dmsUrl, path: '/', inputId: 'ssoo-in-view-search-input', intent: 'in-view-search', navigation: 'dms-home-search' },
  { label: 'SNS expert lookup', url: snsUrl, path: '/search', inputId: 'sns-expert-search-input', intent: 'entity-lookup' },
];

const rejectStoreName = '__ssooInputIntentRejects';

async function installRejectCapture(page: Page): Promise<void> {
  await page.addInitScript(({ storeName }) => {
    const rejectDetails: RejectDetail[] = [];
    Object.defineProperty(window, storeName, {
      configurable: true,
      value: rejectDetails,
    });
    document.addEventListener('ssoo:unexpected-autofill-rejected', (event) => {
      const detail = (event as CustomEvent<RejectDetail>).detail;
      rejectDetails.push({ inputId: detail.inputId, intent: detail.intent });
    });
  }, { storeName: rejectStoreName });
}

async function getRejectCount(page: Page, inputId: string): Promise<number> {
  return page.evaluate(({ storeName, targetInputId }) => {
    const details = (window as unknown as Record<string, RejectDetail[]>)[storeName] ?? [];
    return details.filter((detail) => detail.inputId === targetInputId).length;
  }, { storeName: rejectStoreName, targetInputId: inputId });
}

async function setNativeInputValue(input: Locator, value: string, dispatchInput: boolean): Promise<void> {
  await input.evaluate((element, payload) => {
    const nativeInput = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!setter) throw new Error('HTMLInputElement value setter is unavailable');
    setter.call(nativeInput, payload.value);
    if (payload.dispatchInput) {
      nativeInput.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: payload.value,
      }));
    }
  }, { value, dispatchInput });
}

async function forceNativeAutofill(
  cdp: CDPSession,
  inputId: string,
): Promise<{ nodeId: number; clear: () => Promise<void> }> {
  const documentResult = await cdp.send('DOM.getDocument', { depth: -1 }) as {
    root: { nodeId: number };
  };
  const queryResult = await cdp.send('DOM.querySelector', {
    nodeId: documentResult.root.nodeId,
    selector: `#${inputId}`,
  }) as { nodeId: number };
  if (!queryResult.nodeId) throw new Error(`CDP could not find #${inputId}`);

  await cdp.send('CSS.forcePseudoState', {
    nodeId: queryResult.nodeId,
    forcedPseudoClasses: ['autofill'],
  });
  return {
    nodeId: queryResult.nodeId,
    clear: async () => {
      await cdp.send('CSS.forcePseudoState', {
        nodeId: queryResult.nodeId,
        forcedPseudoClasses: [],
      });
    },
  };
}

async function expectSearchSignature(input: Locator, expectedIntent: string): Promise<void> {
  await expect(input).toBeVisible();
  await expect(input).toBeEnabled();
  await expect(input).toHaveAttribute('type', 'search');
  await expect(input).toHaveAttribute('role', 'searchbox');
  await expect(input).toHaveAttribute('autocomplete', 'off');
  await expect(input).toHaveAttribute('data-ssoo-input-intent', expectedIntent);
  await expect(input).toHaveAttribute('data-form-type', 'other');
  await expect(input).toHaveAttribute('data-1p-ignore', 'true');
  await expect(input).toHaveAttribute('data-lpignore', 'true');
  await expect(input).toHaveAttribute('data-bwignore', 'true');
}

async function verifyNativeAutofillRejection(
  page: Page,
  cdp: CDPSession,
  inputId: string,
  credentialCandidate: string,
): Promise<void> {
  const input = page.locator(`#${inputId}`);
  await input.evaluate((element) => (element as HTMLInputElement).blur());
  await setNativeInputValue(input, '', true);
  await page.waitForTimeout(1_700);

  const rejectCountBefore = await getRejectCount(page, inputId);
  const forcedState = await forceNativeAutofill(cdp, inputId);
  try {
    await setNativeInputValue(input, credentialCandidate, false);
    await expect.poll(() => input.evaluate((element) => ({
      autofill: element.matches(':autofill'),
      webkitAutofill: element.matches(':-webkit-autofill'),
    }))).toEqual({ autofill: true, webkitAutofill: true });

    await input.focus();
    await page.waitForTimeout(1_100);
    await expect(input).toHaveValue('');
    await expect.poll(() => getRejectCount(page, inputId)).toBe(rejectCountBefore + 1);
  } finally {
    await forcedState.clear();
  }

  await input.pressSequentially(credentialCandidate);
  await expect(input).toHaveValue(credentialCandidate);
  expect(await getRejectCount(page, inputId)).toBe(rejectCountBefore + 1);
  await input.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await input.press('Backspace');
  await expect(input).toHaveValue('');
  await input.evaluate((element) => (element as HTMLInputElement).blur());
}

async function expectNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(
    overflow.documentWidth,
    `${label} should not introduce horizontal page overflow`,
  ).toBeLessThanOrEqual(overflow.viewportWidth);
}

async function openDomainInputSurface(page: Page, surface: DomainInputSurface): Promise<void> {
  if (!surface.navigation || surface.navigation === 'url') {
    await page.goto(new URL(surface.path, surface.url).toString());
    return;
  }

  await page.goto(new URL('/', surface.url).toString());

  if (surface.navigation === 'dms-home-search') {
    await page.getByRole('button', { name: /^AI 검색/ }).click();
    return;
  }

  const mobileMenuButton = page.getByRole('button', { name: '모바일 메뉴 열기', exact: true });
  const adminSection = page.getByRole('button', { name: '관리자', exact: true });
  await expect(mobileMenuButton.or(adminSection).first()).toBeVisible();
  if (await mobileMenuButton.isVisible()) {
    await mobileMenuButton.click();
  }

  await expect(adminSection).toBeVisible();
  if (await adminSection.getAttribute('aria-expanded') !== 'true') {
    await adminSection.click();
  }
  await page.getByRole('button', { name: '기준정보', exact: true }).click();
}

test.describe('SSOO input intent integrity', () => {
  test.skip(!enabled, 'Set SSOO_INPUT_INTENT_E2E=1 and run against the five-app Docker stack.');
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(300_000);

  test('TC-INPUT-06/07: fixed five-app shell and representative domain inputs reject only native credential autofill', async ({ browserName, page }) => {
    test.skip(browserName !== 'chromium', 'CDP native pseudo-state proof requires Chromium.');

    await installRejectCapture(page);
    const monitor = monitorBrowserFailures(page, {
      label: `SSOO ${appSurfaces.map((surface) => surface.label).join('/')} input intent browser`,
      relevantOrigins: [...appSurfaces.map((surface) => surface.url), apiUrl],
    });

    await interactiveLogin(page, {
      appUrl: adminUrl,
      loginId,
      password,
      waitUntilReady: async (loginPage) => {
        await expect(loginPage.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 30_000 });
      },
      retryAfterRateLimit: true,
    });

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');

    try {
      let credentialProbeIndex = 0;
      for (const surface of appSurfaces) {
        await runLaunchPhase(`${surface.label} shell input intent`, async () => {
          await page.goto(new URL('/', surface.url).toString());
          const headerInput = page.locator('#ssoo-global-search-input');
          const sidebarInput = page.locator(`#${surface.sidebarInputId}`);
          await expectSearchSignature(headerInput, 'global-search');
          await expectSearchSignature(sidebarInput, 'navigation-search');
          await verifyNativeAutofillRejection(
            page,
            cdp,
            'ssoo-global-search-input',
            getCredentialProbe(credentialProbeIndex++),
          );
          await verifyNativeAutofillRejection(
            page,
            cdp,
            surface.sidebarInputId,
            getCredentialProbe(credentialProbeIndex++),
          );
          await expectNoHorizontalOverflow(page, surface.label);
        });
      }

      for (const surface of domainInputSurfaces) {
        await runLaunchPhase(`${surface.label} native autofill`, async () => {
          await openDomainInputSurface(page, surface);
          const input = page.locator(`#${surface.inputId}`);
          await expectSearchSignature(input, surface.intent);
          await verifyNativeAutofillRejection(
            page,
            cdp,
            surface.inputId,
            getCredentialProbe(credentialProbeIndex++),
          );
          await expectNoHorizontalOverflow(page, surface.label);
        });
      }

      await page.setViewportSize({ width: 390, height: 844 });
      for (const surface of domainInputSurfaces) {
        await runLaunchPhase(`${surface.label} mobile input`, async () => {
          await openDomainInputSurface(page, surface);
          const input = page.locator(`#${surface.inputId}`);
          await expectSearchSignature(input, surface.intent);
          await input.fill('문서');
          await expect(input).toHaveValue('문서');
          await expectNoHorizontalOverflow(page, `${surface.label} mobile`);
        });
      }

      monitor.assertClean();
    } finally {
      await cdp.detach();
    }
  });

  test('TC-INPUT-08/12: paste, composition, and CRM route-owned query remain intentional', async ({ browserName, page }) => {
    test.skip(browserName !== 'chromium', 'CDP native pseudo-state proof requires Chromium.');

    await installRejectCapture(page);
    const monitor = monitorBrowserFailures(page, {
      label: 'SSOO intentional input browser',
      relevantOrigins: [adminUrl, crmUrl, apiUrl],
    });
    await interactiveLogin(page, {
      appUrl: adminUrl,
      loginId,
      password,
      waitUntilReady: async (loginPage) => {
        await expect(loginPage.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 30_000 });
      },
      retryAfterRateLimit: true,
    });

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    try {
      const globalInputId = 'ssoo-global-search-input';
      const globalInput = page.locator(`#${globalInputId}`);
      await expectSearchSignature(globalInput, 'global-search');
      const initialRejectCount = await getRejectCount(page, globalInputId);

      await setNativeInputValue(globalInput, '', true);
      await globalInput.dispatchEvent('paste');
      let forcedState = await forceNativeAutofill(cdp, globalInputId);
      try {
        await setNativeInputValue(globalInput, intentionalSearchValue, true);
        await page.waitForTimeout(1_100);
        await expect(globalInput).toHaveValue(intentionalSearchValue);
        expect(await getRejectCount(page, globalInputId)).toBe(initialRejectCount);
      } finally {
        await forcedState.clear();
      }

      await setNativeInputValue(globalInput, '', true);
      await globalInput.dispatchEvent('compositionstart', { data: '문' });
      forcedState = await forceNativeAutofill(cdp, globalInputId);
      try {
        await setNativeInputValue(globalInput, '문서', true);
        await page.waitForTimeout(1_100);
        await expect(globalInput).toHaveValue('문서');
        expect(await getRejectCount(page, globalInputId)).toBe(initialRejectCount);
      } finally {
        await forcedState.clear();
        await globalInput.dispatchEvent('compositionend', { data: '문서' });
      }

      const initialCrmUrl = new URL('/contracts', crmUrl);
      initialCrmUrl.searchParams.set('search', intentionalSearchValue);
      await page.goto(initialCrmUrl.toString());
      const crmInputId = 'crm-contract-search-input';
      const crmInput = page.locator(`#${crmInputId}`);
      await expectSearchSignature(crmInput, 'data-filter');
      await expect(crmInput).toHaveValue(intentionalSearchValue);

      const crmRejectCount = await getRejectCount(page, crmInputId);
      forcedState = await forceNativeAutofill(cdp, crmInputId);
      try {
        await crmInput.focus();
        await page.waitForTimeout(1_100);
        await expect(crmInput).toHaveValue(intentionalSearchValue);
        expect(await getRejectCount(page, crmInputId)).toBe(crmRejectCount);
      } finally {
        await forcedState.clear();
      }

      await crmInput.fill('ralph-e2e-query');
      await page.getByRole('button', { name: '조회' }).click();
      await expect(page).toHaveURL(/\/contracts\?(?=[^#]*search=ralph-e2e-query)/u);
      await expect(crmInput).toHaveValue('ralph-e2e-query');
      await page.reload();
      await expect(page.locator(`#${crmInputId}`)).toHaveValue('ralph-e2e-query');
      monitor.assertClean();
    } finally {
      await cdp.detach();
    }
  });
});
