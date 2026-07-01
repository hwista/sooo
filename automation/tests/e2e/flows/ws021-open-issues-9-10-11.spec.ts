import { expect, type Browser, type BrowserContext, type Page, type Route, test } from '@playwright/test';

type HttpMethod = 'GET' | 'POST' | 'DELETE';
type JsonObject = Record<string, unknown>;
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

interface BrowserFetchResult {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  text: string;
}

interface LaunchUser {
  loginId: string;
  password: string;
}

interface AuthSession {
  storageState: StorageState;
  userId: string;
  accessToken: string;
}

interface UploadAttachmentResult {
  path: string;
  fileName: string;
  size: number;
  type?: string;
  provider?: string;
  storageUri?: string;
  versionId?: string;
  etag?: string;
  checksum?: string;
  status?: string;
  webUrl?: string;
}

interface StorageUploadResult {
  path: string;
  name: string;
  size: number;
  provider: 'local' | 'sharepoint' | 'nas';
  storageUri: string;
  versionId: string;
  etag: string;
  checksum: string;
  status: 'draft' | 'pending_confirm' | 'published';
  webUrl?: string;
}

interface StorageOpenNavigationResult {
  url: string;
  status: number;
  location: string;
}

const USERS = {
  admin: { loginId: 'admin', password: 'admin123!' },
  viewer: { loginId: 'viewer.han', password: 'user123!' },
} satisfies Record<string, LaunchUser>;

const DMS_BASE_URL = `http://127.0.0.1:${process.env.PLAYWRIGHT_DMS_PORT ?? '3003'}`;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

function unwrapApiData<T>(value: unknown): T {
  if (!isRecord(value)) {
    throw new Error(`expected object api payload, received ${JSON.stringify(value)}`);
  }
  return ('data' in value ? value.data : value) as T;
}

function readPersistedUserId(rawAuth: string | null): string {
  if (!rawAuth) {
    throw new Error('missing ssoo-auth localStorage payload');
  }

  try {
    const parsed = JSON.parse(rawAuth) as { state?: { user?: { userId?: unknown } } };
    const userId = parsed.state?.user?.userId;
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('missing persisted userId');
    }
    return userId;
  } catch (error) {
    throw new Error(`failed to parse persisted auth payload: ${String(error)}`);
  }
}

function encodeDocumentTabId(path: string): string {
  return `file-${encodeURIComponent(path)}`;
}

function resolvePageRequestUrl(page: Page, url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const currentUrl = page.url();
  if (!/^https?:\/\//i.test(currentUrl)) {
    throw new Error(`cannot resolve ${url} before page navigation`);
  }

  return new URL(url, currentUrl).toString();
}

async function restoreAccessToken(page: Page): Promise<string | undefined> {
  return page.evaluate(async () => {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        'X-SSOO-CSRF': '1',
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json().catch(() => null) as { accessToken?: unknown } | null;
    const accessToken = payload?.accessToken;
    return typeof accessToken === 'string' && accessToken.trim().length > 0 ? accessToken : null;
  }) ?? undefined;
}

function buildDocumentMetadata(
  ownerLoginId: string,
  title: string,
  summary: string,
  sourceFiles: JsonObject[] = [],
): JsonObject {
  return {
    title,
    summary,
    tags: ['ws021', 'playwright'],
    sourceLinks: [],
    bodyLinks: [],
    sourceFiles,
    comments: [],
    acl: {
      owners: [],
      editors: [],
      viewers: [],
    },
    grants: [],
    visibility: {
      scope: 'self',
    },
    ownerLoginId,
    author: ownerLoginId,
    lastModifiedBy: ownerLoginId,
  };
}

function toLatin1Mojibake(value: string): string {
  return Buffer.from(value, 'utf8').toString('latin1');
}

async function waitForDmsShell(page: Page) {
  await expect(page.getByRole('banner').getByRole('textbox').first()).toBeVisible({ timeout: 15_000 });
}

async function waitForAuthenticatedShell(page: Page, navigate: () => Promise<void>) {
  await navigate();
  try {
    await waitForDmsShell(page);
    return;
  } catch (error) {
    const loginVisible = await page.getByRole('heading', { name: '로그인' }).isVisible().catch(() => false);
    const rateLimited = await page.getByText(/Too Many Requests|ThrottlerException/).isVisible().catch(() => false);
    if (!loginVisible && !rateLimited) {
      throw error;
    }
  }

  await page.waitForTimeout(61_000);
  await page.goto(`${DMS_BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await waitForDmsShell(page);
}

async function reloadIntoAuthenticatedShell(page: Page) {
  await waitForAuthenticatedShell(page, () => page.reload({ waitUntil: 'domcontentloaded' }));
}

async function login(page: Page, loginId: string, password: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(`${DMS_BASE_URL}/login`);
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    await page.getByLabel('아이디').fill(loginId);
    await page.getByLabel('비밀번호').fill(password);
    await page.getByRole('button', { name: '로그인' }).click();

    try {
      await waitForDmsShell(page);
      return;
    } catch (error) {
      const rateLimited = await page.getByText(/Too Many Requests|ThrottlerException/).isVisible().catch(() => false);
      if (rateLimited && attempt === 0) {
        await page.waitForTimeout(61_000);
        continue;
      }
      throw error;
    }
  }
}

async function authenticate(browser: Browser, user: LaunchUser): Promise<AuthSession> {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await login(page, user.loginId, user.password);
    const userId = await page.evaluate(() => {
      const raw = window.localStorage.getItem('ssoo-auth');
      return raw;
    });
    const accessToken = await restoreAccessToken(page);
    if (!accessToken) {
      throw new Error('failed to restore access token after login');
    }
    return {
      storageState: await context.storageState(),
      userId: readPersistedUserId(userId),
      accessToken,
    };
  } finally {
    await context.close();
  }
}

function requireAuthSession(session: AuthSession | undefined): AuthSession {
  if (!session) {
    throw new Error('auth session is not initialized');
  }
  return session;
}

async function newAuthenticatedPage(
  browser: Browser,
  authSession: AuthSession,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ storageState: authSession.storageState });
  const page = await context.newPage();
  await waitForAuthenticatedShell(page, () => page.goto(`${DMS_BASE_URL}/`, { waitUntil: 'domcontentloaded' }));
  return { context, page };
}

function parseBrowserFetchPayload(result: BrowserFetchResult): unknown {
  const contentType = result.headers['content-type'] ?? '';
  if (!contentType.includes('application/json')) {
    return result.text;
  }

  try {
    return JSON.parse(result.text) as unknown;
  } catch {
    return null;
  }
}

async function performBrowserFetch(
  page: Page,
  accessToken: string,
  method: HttpMethod,
  url: string,
  body?: JsonObject,
): Promise<BrowserFetchResult> {
  const resolvedUrl = resolvePageRequestUrl(page, url);

  return page.evaluate(async ({ nextUrl, nextMethod, nextBody, nextAccessToken }) => {
    const headers = new Headers();
    if (nextBody !== undefined) {
      headers.set('Content-Type', 'application/json');
    }
    if (nextAccessToken) {
      headers.set('Authorization', `Bearer ${nextAccessToken}`);
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch(nextUrl, {
        method: nextMethod,
        headers,
        body: nextBody !== undefined ? JSON.stringify(nextBody) : undefined,
        signal: controller.signal,
      });

      return {
        ok: response.ok,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        text: await response.text(),
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, {
    nextUrl: resolvedUrl,
    nextMethod: method,
    nextBody: body,
    nextAccessToken: accessToken ?? null,
  });
}

async function performBrowserMultipartFetch(
  page: Page,
  accessToken: string,
  url: string,
  multipart: Record<string, string | { name: string; mimeType: string; buffer: Buffer }>,
): Promise<BrowserFetchResult> {
  const resolvedUrl = resolvePageRequestUrl(page, url);
  const serializedMultipart = Object.fromEntries(
    Object.entries(multipart).map(([key, value]) => (
      typeof value === 'string'
        ? [key, value]
        : [
            key,
            {
              name: value.name,
              mimeType: value.mimeType,
              base64: value.buffer.toString('base64'),
            },
          ]
    )),
  );

  return page.evaluate(async ({ nextUrl, nextMultipart, nextAccessToken }) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(nextMultipart)) {
      if (typeof value === 'string') {
        formData.append(key, value);
        continue;
      }

      const binary = Uint8Array.from(atob(value.base64), (char) => char.charCodeAt(0));
      const file = new File([binary], value.name, { type: value.mimeType });
      formData.append(key, file, value.name);
    }

    const headers = new Headers();
    if (nextAccessToken) {
      headers.set('Authorization', `Bearer ${nextAccessToken}`);
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch(nextUrl, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      return {
        ok: response.ok,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        text: await response.text(),
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, {
    nextUrl: resolvedUrl,
    nextMultipart: serializedMultipart,
    nextAccessToken: accessToken ?? null,
  });
}

async function apiRequest(
  page: Page,
  accessToken: string,
  method: HttpMethod,
  url: string,
  body?: JsonObject,
): Promise<unknown> {
  const response = await performBrowserFetch(page, accessToken, method, url, body);
  const payload = parseBrowserFetchPayload(response);

  expect(
    response.ok,
    `${method} ${url} failed with ${response.status}: ${JSON.stringify(payload)}`,
  ).toBeTruthy();

  return payload;
}

async function apiRequestOptional(
  page: Page,
  accessToken: string,
  method: HttpMethod,
  url: string,
  body?: JsonObject,
): Promise<void> {
  try {
    await apiRequest(page, accessToken, method, url, body);
  } catch {
    // cleanup best-effort
  }
}

async function apiMultipartRequest(
  page: Page,
  accessToken: string,
  url: string,
  multipart: Record<string, string | { name: string; mimeType: string; buffer: Buffer }>,
): Promise<unknown> {
  const response = await performBrowserMultipartFetch(page, accessToken, url, multipart);
  const payload = parseBrowserFetchPayload(response);

  expect(
    response.ok,
    `POST ${url} failed with ${response.status}: ${JSON.stringify(payload)}`,
  ).toBeTruthy();

  return payload;
}

async function createMarkdownDocument(
  page: Page,
  accessToken: string,
  path: string,
  title: string,
  content: string,
  metadataOverrides?: JsonObject,
) {
  await apiRequest(page, accessToken, 'POST', '/api/content', {
    path,
    content,
    metadata: {
      ...buildDocumentMetadata(USERS.admin.loginId, title, 'WS-021 Playwright regression fixture.', []),
      ...metadataOverrides,
    },
  });
}

async function seedOpenDocumentTab(
  page: Page,
  ownerUserId: string,
  path: string,
  seedTitle: string,
) {
  await page.evaluate(({ nextOwnerUserId, nextPath, nextTitle }) => {
    const now = new Date().toISOString();
    const tabId = `file-${encodeURIComponent(nextPath)}`;
    sessionStorage.setItem('dms-tab-store', JSON.stringify({
      state: {
        tabs: [
          {
            id: 'home',
            title: '홈',
            path: '/home',
            icon: 'Home',
            isEditing: false,
            closable: false,
            openedAt: now,
            lastActiveAt: now,
          },
          {
            id: tabId,
            title: nextTitle,
            path: `/doc/${encodeURIComponent(nextPath)}`,
            icon: 'FileText',
            isEditing: false,
            reloadSeq: 0,
            closable: true,
            openedAt: now,
            lastActiveAt: now,
          },
        ],
        activeTabId: tabId,
        ownerUserId: nextOwnerUserId,
      },
      version: 0,
    }));
  }, { nextOwnerUserId: ownerUserId, nextPath: path, nextTitle: seedTitle });

  await reloadIntoAuthenticatedShell(page);
}

async function ensureDocumentSidecarOpen(page: Page) {
  const sidecar = page.locator('[data-ssoo-content-page-slot="sidecar"]');
  if (await sidecar.isVisible().catch(() => false)) {
    return sidecar;
  }

  const expandPanelButton = page.getByRole('button', { name: '패널 펼치기' });
  await expect(expandPanelButton).toBeVisible({ timeout: 15_000 });
  await expandPanelButton.click();
  await expect(sidecar).toBeVisible({ timeout: 15_000 });
  return sidecar;
}

async function openAttachmentSection(page: Page, expectedAttachmentName?: string) {
  const sidecar = await ensureDocumentSidecarOpen(page);
  const expectedAttachment = expectedAttachmentName
    ? sidecar.getByRole('button', { name: expectedAttachmentName }).first()
    : undefined;

  if (expectedAttachment && await expectedAttachment.isVisible().catch(() => false)) {
    return;
  }

  const sectionButton = sidecar.getByRole('button', { name: '파일', exact: true }).first();
  await expect(sectionButton).toBeVisible({ timeout: 15_000 });
  await sectionButton.click();

  if (expectedAttachment) {
    await expect(expectedAttachment).toBeVisible({ timeout: 15_000 });
  }
}

test.describe('WS-021 DMS open issues regressions', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(240_000);

  let adminSession: AuthSession | undefined;
  let viewerSession: AuthSession | undefined;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(300_000);
    adminSession = await authenticate(browser, USERS.admin);
    viewerSession = await authenticate(browser, USERS.viewer);
  });

  /**
   * 테스트 케이스 ID: TC-DMS-WS021-09
   * 우선순위: P1
   *
   * @description locked preview 문서를 viewer가 열었을 때 탭 제목이 파일명이 아니라 문서 metadata 제목으로 유지되는지 검증한다.
   * @precondition admin / viewer 계정으로 로그인 가능한 Playwright DMS stack이 기동되어 있어야 한다.
   * @input self visibility 문서 1건, viewer session tab seed title(파일명)
   * @expected locked preview 본문이 표시되고, 탭 버튼이 metadata title로 재지정되며, 초기 파일명 탭 제목은 남지 않는다.
   */
  test('keeps locked preview tab title aligned with document title', async ({ browser }) => {
    const admin = requireAuthSession(adminSession);
    const viewer = requireAuthSession(viewerSession);
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const documentPath = `ws021/locked-preview-${suffix}.md`;
    const fileName = documentPath.split('/').pop() ?? documentPath;
    const documentTitle = `WS021 잠긴 문서 제목 ${suffix}`;
    const secretLine = `secret-${suffix}`;
    const { context: adminContext, page: adminPage } = await newAuthenticatedPage(browser, admin);
    const { context: viewerContext, page: viewerPage } = await newAuthenticatedPage(browser, viewer);

    try {
      await createMarkdownDocument(
        adminPage,
        admin.accessToken,
        documentPath,
        documentTitle,
        `# WS-021 Locked Preview\n\n${secretLine}\n`,
        buildDocumentMetadata(USERS.admin.loginId, documentTitle, 'WS-021 locked preview fixture.'),
      );

      await seedOpenDocumentTab(viewerPage, viewer.userId, documentPath, fileName);

      await expect(viewerPage.getByText(/열람 권한 요청이 필요합니다\./).first()).toBeVisible({ timeout: 30_000 });
      await expect(viewerPage.getByRole('tab', { name: documentTitle, exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(viewerPage.getByRole('tab', { name: fileName, exact: true })).toHaveCount(0);
      await expect(viewerPage.getByText(secretLine)).toHaveCount(0);
    } finally {
      await apiRequestOptional(adminPage, admin.accessToken, 'DELETE', '/api/content', { path: documentPath });
      await viewerContext.close();
      await adminContext.close();
    }
  });

  /**
   * 테스트 케이스 ID: TC-DMS-WS021-10
   * 우선순위: P1
   *
   * @description storage-backed SharePoint 첨부를 문서 패널에서 열 때 same-origin `/api/storage/open` navigation 이 401 없이 외부 webUrl redirect 를 반환하는지 검증한다.
   * @precondition admin 계정으로 로그인 가능한 Playwright DMS stack과 `https://sharepoint.local` route stub이 준비되어 있어야 한다.
   * @input SharePoint provider source file 1건이 연결된 문서
   * @expected 첨부 클릭 시 popup이 열리고 `/api/storage/open` 응답이 401이 아니라 302 redirect 이며, `Location` 헤더가 `https://sharepoint.local/...` 을 가리킨다.
   */
  test('opens sharepoint attachment through same-origin storage route without 401 regression', async ({ browser }) => {
    const admin = requireAuthSession(adminSession);
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const documentPath = `ws021/storage-open-${suffix}.md`;
    const documentTitle = `WS021 Storage Open ${suffix}`;
    const storageFileName = `ws021-sharepoint-${suffix}.pptx`;
    const { context, page } = await newAuthenticatedPage(browser, admin);

    try {
      await context.route('https://sharepoint.local/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: '<!doctype html><html><body>WS021 sharepoint open ok</body></html>',
        });
      });

      const uploadPayload = await apiRequest(page, admin.accessToken, 'POST', '/api/storage/upload', {
        fileName: storageFileName,
        content: 'WS-021 sharepoint binary fixture',
        provider: 'sharepoint',
        relativePath: `ws021/${suffix}`,
        origin: 'manual',
        status: 'published',
      });
      const uploaded = unwrapApiData<StorageUploadResult>(uploadPayload);

      await createMarkdownDocument(
        page,
        admin.accessToken,
        documentPath,
        documentTitle,
        '# WS-021 Storage Open Fixture\n',
        buildDocumentMetadata(USERS.admin.loginId, documentTitle, 'WS-021 storage open fixture.', [
          {
            name: uploaded.name,
            path: uploaded.path,
            type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            size: uploaded.size,
            url: uploaded.webUrl,
            storageUri: uploaded.storageUri,
            provider: uploaded.provider,
            versionId: uploaded.versionId,
            etag: uploaded.etag,
            checksum: uploaded.checksum,
            origin: 'manual',
            status: uploaded.status,
          },
        ]),
      );

      await seedOpenDocumentTab(page, admin.userId, documentPath, documentTitle);
      await expect(page.getByRole('tab', { name: documentTitle, exact: true })).toBeVisible({ timeout: 30_000 });

      await openAttachmentSection(page, uploaded.name);
      let resolveStorageOpenNavigation!: (result: StorageOpenNavigationResult) => void;
      const storageOpenResponsePromise = new Promise<StorageOpenNavigationResult>((resolve) => {
        resolveStorageOpenNavigation = resolve;
      });
      const handleStorageOpenRoute = async (route: Route) => {
        const response = await route.fetch({ maxRedirects: 0 });
        await route.fulfill({ response });
        await context.unroute('**/api/storage/open**', handleStorageOpenRoute);
        resolveStorageOpenNavigation({
          url: route.request().url(),
          status: response.status(),
          location: response.headers().location ?? '',
        });
      };
      await context.route('**/api/storage/open**', handleStorageOpenRoute);
      const popupPromise = context.waitForEvent('page');
      await page.getByRole('button', { name: uploaded.name }).click();
      const [popup, storageOpenNavigation] = await Promise.all([popupPromise, storageOpenResponsePromise]);
      expect(storageOpenNavigation.url).toContain('/api/storage/open?');
      expect(storageOpenNavigation.status).toBe(302);
      expect(storageOpenNavigation.location).toContain('https://sharepoint.local/');
      await popup.close();

      const cookieOnlyDownloadUrl = `/api/storage/open?storageUri=${encodeURIComponent(uploaded.storageUri)}&documentPath=${encodeURIComponent(documentPath)}&name=${encodeURIComponent(uploaded.name)}&download=1`;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const downloadResponse = await performBrowserFetch(page, '', 'GET', cookieOnlyDownloadUrl);
        const contentDisposition = downloadResponse.headers['content-disposition'] ?? '';
        expect(downloadResponse.ok, `cookie-only download attempt ${attempt + 1} failed with ${downloadResponse.status}: ${downloadResponse.text}`).toBeTruthy();
        expect(contentDisposition).toContain("filename*=UTF-8''");
      }
    } finally {
      await apiRequestOptional(page, admin.accessToken, 'DELETE', '/api/content', { path: documentPath });
      await context.close();
    }
  });

  /**
   * 테스트 케이스 ID: TC-DMS-WS021-11
   * 우선순위: P1
   *
   * @description mojibake 형태로 들어온 한글 첨부 파일명이 upload 응답, 문서 패널 표시, 다운로드 헤더에서 정규화된 UTF-8 이름으로 유지되는지 검증한다.
   * @precondition admin 계정으로 로그인 가능한 Playwright DMS stack이 기동되어 있어야 한다.
   * @input latin1-utf8 mojibake filename을 가진 txt attachment 1건
   * @expected upload 응답의 fileName이 복구된 한글명이고, 첨부 섹션에서 같은 이름이 보이며, `Content-Disposition`의 `filename*`도 동일한 UTF-8 이름을 사용한다.
   */
  test('preserves normalized Korean attachment names across upload, UI, and download headers', async ({ browser }) => {
    const admin = requireAuthSession(adminSession);
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const documentPath = `ws021/korean-attachment-${suffix}.md`;
    const documentTitle = `WS021 Korean Attachment ${suffix}`;
    const expectedFileName = `첨부-한글-테스트-${suffix}.txt`;
    const mojibakeFileName = toLatin1Mojibake(expectedFileName);
    const attachmentBody = `WS-021 Korean attachment body ${suffix}`;
    const { context, page } = await newAuthenticatedPage(browser, admin);

    try {
      const uploadPayload = await apiMultipartRequest(page, admin.accessToken, '/api/file/upload-attachment', {
        provider: 'local',
        file: {
          name: mojibakeFileName,
          mimeType: 'text/plain',
          buffer: Buffer.from(attachmentBody, 'utf8'),
        },
      });
      const uploaded = unwrapApiData<UploadAttachmentResult>(uploadPayload);

      expect(uploaded.fileName).toBe(expectedFileName);

      await createMarkdownDocument(
        page,
        admin.accessToken,
        documentPath,
        documentTitle,
        '# WS-021 Korean Attachment Fixture\n',
        buildDocumentMetadata(USERS.admin.loginId, documentTitle, 'WS-021 Korean filename fixture.', [
          {
            name: uploaded.fileName,
            path: uploaded.path,
            type: uploaded.type ?? 'text/plain',
            size: uploaded.size,
            url: uploaded.webUrl,
            storageUri: uploaded.storageUri,
            provider: uploaded.provider,
            versionId: uploaded.versionId,
            etag: uploaded.etag,
            checksum: uploaded.checksum,
            origin: 'manual',
            status: uploaded.status ?? 'published',
          },
        ]),
      );

      await seedOpenDocumentTab(page, admin.userId, documentPath, documentTitle);
      await expect(page.getByRole('tab', { name: documentTitle, exact: true })).toBeVisible({ timeout: 30_000 });

      await openAttachmentSection(page, expectedFileName);
      await expect(page.getByRole('button', { name: expectedFileName })).toBeVisible({ timeout: 15_000 });

      const response = await performBrowserFetch(
        page,
        admin.accessToken,
        'GET',
        `/api/file/serve-attachment?path=${encodeURIComponent(uploaded.path)}&name=${encodeURIComponent(uploaded.fileName)}&download=1`,
      );
      const contentDisposition = response.headers['content-disposition'] ?? '';
      const encodedFileName = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? '';

      expect(response.ok, `attachment download failed with ${response.status}`).toBeTruthy();
      expect(contentDisposition).toContain("filename*=UTF-8''");
      expect(decodeURIComponent(encodedFileName)).toBe(expectedFileName);
      expect(response.text).toBe(attachmentBody);
    } finally {
      await apiRequestOptional(page, admin.accessToken, 'DELETE', '/api/content', { path: documentPath });
      await context.close();
    }
  });
});
