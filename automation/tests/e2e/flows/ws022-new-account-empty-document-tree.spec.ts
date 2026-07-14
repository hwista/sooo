import {
  expect,
  type Browser,
  type BrowserContext,
  type Page,
  type Request,
  test,
} from '@playwright/test';

type HttpMethod = 'GET' | 'POST' | 'DELETE';
type JsonObject = Record<string, unknown>;
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

interface LaunchUser {
  loginId: string;
  password: string;
}

interface BrowserApiResult {
  ok: boolean;
  status: number;
  body: unknown;
}

interface AuthSession {
  storageState: StorageState;
  accessToken: string;
}

const USERS = {
  admin: { loginId: 'admin', password: 'admin123!' },
  emptyUser: { loginId: 'dev.lee', password: 'user123!' },
} satisfies Record<string, LaunchUser>;

const DMS_BASE_URL = `http://127.0.0.1:${process.env.PLAYWRIGHT_DMS_PORT ?? '3003'}`;
const SHARED_AUTH_STORAGE_KEY = 'ssoo-auth';
const SHARED_AUTH_CHANGE_EVENT = 'ssoo-auth-changed';
const EMPTY_RETRY_OBSERVATION_MS = 1_700;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

function isForceSyncRequest(request: Request): boolean {
  if (request.method() !== 'GET') {
    return false;
  }

  try {
    const url = new URL(request.url());
    return url.pathname === '/api/files' && url.searchParams.get('force') === '1';
  } catch {
    return false;
  }
}

function isRegularFileTreeRequest(request: Request): boolean {
  if (request.method() !== 'GET') {
    return false;
  }

  try {
    const url = new URL(request.url());
    return url.pathname === '/api/files' && url.searchParams.get('force') !== '1';
  } catch {
    return false;
  }
}

function getAuthStorageValue(storageState: StorageState): string {
  const origin = storageState.origins.find((item) => item.origin === DMS_BASE_URL);
  const authStorage = origin?.localStorage.find((item) => item.name === SHARED_AUTH_STORAGE_KEY)?.value;

  if (!authStorage) {
    throw new Error(`missing ${SHARED_AUTH_STORAGE_KEY} for ${DMS_BASE_URL}`);
  }

  return authStorage;
}

async function waitForDmsShell(page: Page) {
  await expect(page.getByRole('banner').getByRole('textbox').first()).toBeVisible({ timeout: 15_000 });
}

async function submitLogin(page: Page, user: LaunchUser) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    await page.getByLabel('아이디').fill(user.loginId);
    await page.getByLabel('비밀번호').fill(user.password);
    await page.getByRole('button', { name: '로그인' }).click();

    try {
      await waitForDmsShell(page);
      return;
    } catch (error) {
      const rateLimited = await page.getByText(/Too Many Requests|ThrottlerException/)
        .isVisible()
        .catch(() => false);
      if (rateLimited && attempt === 0) {
        await page.waitForTimeout(61_000);
        await page.goto(`${DMS_BASE_URL}/login`);
        continue;
      }
      throw error;
    }
  }
}

async function login(page: Page, user: LaunchUser) {
  await page.goto(`${DMS_BASE_URL}/login`);
  await submitLogin(page, user);
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
    return typeof payload?.accessToken === 'string' && payload.accessToken.trim().length > 0
      ? payload.accessToken
      : null;
  }) ?? undefined;
}

async function authenticate(browser: Browser, user: LaunchUser): Promise<AuthSession> {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await login(page, user);
    const accessToken = await restoreAccessToken(page);
    if (!accessToken) {
      throw new Error(`failed to restore access token for ${user.loginId}`);
    }
    return {
      storageState: await context.storageState(),
      accessToken,
    };
  } finally {
    await context.close();
  }
}

function requireAuthSession(session: AuthSession | undefined, label: string): AuthSession {
  if (!session) {
    throw new Error(`${label} auth state is not initialized`);
  }
  return session;
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

async function apiRequest(
  page: Page,
  accessToken: string,
  method: HttpMethod,
  url: string,
  body?: JsonObject,
): Promise<BrowserApiResult> {
  const response = await page.context().request.fetch(resolvePageRequestUrl(page, url), {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { data: body } : {}),
    timeout: 15_000,
  });
  const contentType = response.headers()['content-type'] ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  return {
    ok: response.ok(),
    status: response.status(),
    body: payload,
  };
}

async function apiRequestRequired(
  page: Page,
  accessToken: string,
  method: HttpMethod,
  url: string,
  body?: JsonObject,
): Promise<unknown> {
  const result = await apiRequest(page, accessToken, method, url, body);
  expect(
    result.ok,
    `${method} ${url} failed with ${result.status}: ${JSON.stringify(result.body)}`,
  ).toBeTruthy();
  return result.body;
}

async function apiRequestOptional(
  page: Page,
  accessToken: string,
  method: HttpMethod,
  url: string,
  body?: JsonObject,
) {
  try {
    await apiRequest(page, accessToken, method, url, body);
  } catch {
    // Cleanup is best-effort; the primary assertion retains the original failure.
  }
}

async function createSelfDocument(
  page: Page,
  accessToken: string,
  path: string,
  title: string,
  ownerLoginId: string,
) {
  await apiRequestRequired(page, accessToken, 'POST', '/api/content', {
    path,
    content: `# ${title}\n\nWS-022 ACL empty-tree fixture.\n`,
    metadata: {
      title,
      summary: 'WS-022 ACL empty-tree fixture.',
      tags: ['ws022', 'playwright'],
      sourceLinks: [],
      bodyLinks: [],
      sourceFiles: [],
      comments: [],
      referenceFiles: [],
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
    },
  });
}

async function expandFileTree(page: Page) {
  if (await page.getByText('파일이 없습니다.', { exact: true }).isVisible().catch(() => false)) {
    return;
  }

  const sectionButton = page.getByRole('button', { name: '전체 파일', exact: true });
  await expect(sectionButton).toBeVisible();
  if (await sectionButton.getAttribute('aria-expanded') !== 'true') {
    await sectionButton.click();
  }
}

async function expectEmptyFileTree(page: Page) {
  await expandFileTree(page);
  await expect(page.getByText('파일이 없습니다.', { exact: true })).toBeVisible();
}

function getWritePath(request: Request): string | null {
  if (request.method() !== 'POST') {
    return null;
  }

  try {
    if (new URL(request.url()).pathname !== '/api/file') {
      return null;
    }
    const payload = request.postDataJSON() as JsonObject;
    return payload.action === 'write' && typeof payload.path === 'string' ? payload.path : null;
  } catch {
    return null;
  }
}

test.describe('WS-022 new-account empty document tree', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  let adminSession: AuthSession | undefined;
  let emptyUserSession: AuthSession | undefined;
  let adminDocumentPath = '';
  let adminDocumentTitle = '';

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(300_000);
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    adminDocumentPath = `ws022/admin-self-${suffix}.md`;
    adminDocumentTitle = `WS022 Admin Self ${suffix}`;

    adminSession = await authenticate(browser, USERS.admin);
    emptyUserSession = await authenticate(browser, USERS.emptyUser);
  });

  test.afterAll(async ({ browser }) => {
    if (!adminSession || !adminDocumentPath) {
      return;
    }

    const context = await browser.newContext({ storageState: adminSession.storageState });
    const page = await context.newPage();
    try {
      await page.goto(`${DMS_BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      await apiRequestOptional(
        page,
        adminSession.accessToken,
        'DELETE',
        '/api/content',
        { path: adminDocumentPath },
      );
    } finally {
      await context.close();
    }
  });

  /**
   * 테스트 케이스 ID: TC-DMS-WS022-01
   * @description 실제 ACL 결과가 빈 user의 bootstrap과 첫 문서 생성을 검증한다.
   * @expected 200 + []은 자동 force-sync 1회 뒤 shell/empty state를 렌더하고, 첫 문서는 별도 tree refresh 뒤 노출된다.
   */
  test('treats the real ACL empty result as ready and shows the first owned document after save', async ({ browser }) => {
    const emptyUser = requireAuthSession(emptyUserSession, 'empty user');
    const context = await browser.newContext({
      storageState: emptyUser.storageState,
    });
    const page = await context.newPage();
    const automaticForceSyncRequests: Request[] = [];
    const regularTreeRefreshRequests: Request[] = [];
    let createdPath: string | null = null;

    page.on('request', (request) => {
      if (isForceSyncRequest(request)) {
        automaticForceSyncRequests.push(request);
      } else if (isRegularFileTreeRequest(request)) {
        regularTreeRefreshRequests.push(request);
      }
    });

    try {
      await page.goto(`${DMS_BASE_URL}/`);
      await waitForDmsShell(page);
      await page.waitForTimeout(EMPTY_RETRY_OBSERVATION_MS);

      expect(automaticForceSyncRequests).toHaveLength(1);
      await expect(page.getByRole('heading', { name: '문서 목록을 준비하지 못했습니다.' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '새 문서', exact: true })).toBeVisible();
      await expectEmptyFileTree(page);

      const aclTreeResult = await apiRequest(page, emptyUser.accessToken, 'GET', '/api/files?force=1');
      expect(aclTreeResult.status).toBe(200);
      expect(aclTreeResult.body).toEqual([]);

      const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const documentTitle = `WS022 First Owned ${suffix}`;
      await page.getByRole('button', { name: '새 문서', exact: true }).click();
      await page.getByRole('button', { name: '새 문서 새 문서를 작성합니다', exact: true }).click();
      await expect(page.locator('.cm-content')).toBeVisible({ timeout: 15_000 });
      await page.locator('.cm-content').click();
      await page.keyboard.insertText(`# ${documentTitle}\n\n첫 문서 생성 회귀 검증`);

      const saveButton = page.getByRole('button', { name: '저장', exact: true });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      const dialog = page.getByRole('dialog', { name: '새 문서 저장' });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel('문서명').fill(documentTitle);
      await dialog.getByLabel('저장 위치').fill('/ws022');

      const writeRequestPromise = page.waitForRequest((request) => getWritePath(request) !== null, {
        timeout: 20_000,
      });
      const writeResponsePromise = page.waitForResponse(
        (response) => getWritePath(response.request()) !== null,
        { timeout: 20_000 },
      );
      const treeRefreshPromise = page.waitForResponse(
        (response) => isRegularFileTreeRequest(response.request()),
        { timeout: 20_000 },
      );

      const refreshCountBeforeSave = regularTreeRefreshRequests.length;
      await dialog.getByRole('button', { name: '확인', exact: true }).click();
      const writeRequest = await writeRequestPromise;
      createdPath = getWritePath(writeRequest);
      expect(createdPath).not.toBeNull();
      expect((await writeResponsePromise).ok(), 'first document write should succeed').toBeTruthy();
      expect((await treeRefreshPromise).ok(), 'first document tree refresh should succeed').toBeTruthy();
      expect(regularTreeRefreshRequests.length - refreshCountBeforeSave).toBe(1);

      const sidebar = page.getByRole('complementary');
      await sidebar.getByRole('button', { name: 'ws022', exact: true }).click();
      await expect(sidebar.getByRole('button', { name: documentTitle, exact: true })).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      if (createdPath) {
        await apiRequestOptional(
          page,
          emptyUser.accessToken,
          'DELETE',
          '/api/content',
          { path: createdPath },
        );
      }
      await context.close();
    }
  });

  /**
   * 테스트 케이스 ID: TC-DMS-WS022-02
   * @description 실제 오류와 정상 empty를 구분하고 수동 retry의 요청 경계를 검증한다.
   * @expected 첫 500은 fatal/retry를 표시하고 retry click 1회는 단일 200 + [] 요청으로 shell을 복구한다.
   */
  test('keeps a real error fatal and recovers empty-ready with one request per retry click', async ({ browser }) => {
    const emptyUser = requireAuthSession(emptyUserSession, 'empty user');
    const context = await browser.newContext({
      storageState: emptyUser.storageState,
    });
    let forceSyncRequestCount = 0;

    await context.route('**/api/files?force=1', async (route) => {
      forceSyncRequestCount += 1;
      if (forceSyncRequestCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'WS-022 forced file-tree failure' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
    });

    const page = await context.newPage();
    try {
      await page.goto(`${DMS_BASE_URL}/`);
      await expect(page.getByRole('heading', { name: '문서 목록을 준비하지 못했습니다.' })).toBeVisible();
      await expect(page.getByRole('button', { name: '문서 목록 다시 불러오기' })).toBeVisible();
      expect(forceSyncRequestCount).toBe(1);

      await page.getByRole('button', { name: '문서 목록 다시 불러오기' }).click();
      await waitForDmsShell(page);
      await page.waitForTimeout(EMPTY_RETRY_OBSERVATION_MS);

      expect(forceSyncRequestCount).toBe(2);
      await expect(page.getByRole('heading', { name: '문서 목록을 준비하지 못했습니다.' })).toHaveCount(0);
      await expectEmptyFileTree(page);
    } finally {
      await context.close();
    }
  });

  /**
   * 테스트 케이스 ID: TC-DMS-WS022-03
   * @description 실제 logout/login 계정 전환에서 이전 tree가 남지 않는지 검증한다.
   * @expected admin self 문서는 admin에게만 보이고 dev.lee 로그인 후에는 정상 empty state가 보인다.
   */
  test('clears the prior tree across the real logout and login boundary', async ({ browser }) => {
    const fixtureAdmin = requireAuthSession(adminSession, 'admin');
    const fixtureContext = await browser.newContext({ storageState: fixtureAdmin.storageState });
    const fixturePage = await fixtureContext.newPage();
    try {
      await fixturePage.goto(`${DMS_BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      await createSelfDocument(
        fixturePage,
        fixtureAdmin.accessToken,
        adminDocumentPath,
        adminDocumentTitle,
        USERS.admin.loginId,
      );
    } finally {
      await fixtureContext.close();
    }

    const admin = await authenticate(browser, USERS.admin);
    const context = await browser.newContext({
      storageState: admin.storageState,
    });
    const page = await context.newPage();

    try {
      await page.goto(`${DMS_BASE_URL}/`);
      await waitForDmsShell(page);
      await expandFileTree(page);
      const sidebar = page.getByRole('complementary');
      await sidebar.getByRole('button', { name: 'ws022', exact: true }).click();
      await expect(sidebar.getByRole('button', { name: adminDocumentTitle, exact: true })).toBeVisible({
        timeout: 20_000,
      });

      await page.getByRole('button', { name: '시스템관리자', exact: true }).click();
      await page.getByRole('menuitem', { name: '로그아웃' }).click();
      await page.waitForURL('**/login');
      await submitLogin(page, USERS.emptyUser);

      await expectEmptyFileTree(page);
      await expect(page.getByText(adminDocumentTitle, { exact: true })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: '문서 목록을 준비하지 못했습니다.' })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  /**
   * 테스트 케이스 ID: TC-DMS-WS022-04
   * @description 사용자 scope 전환 뒤 늦게 도착한 이전 scope의 성공/오류 응답 폐기를 검증한다.
   * @expected 새 scope가 empty-ready가 된 뒤 prior non-empty/500이 도착해도 tree/error를 덮어쓰지 않는다.
   */
  test('discards delayed success and error responses from the prior user scope', async ({ browser }) => {
    const admin = requireAuthSession(adminSession, 'admin');
    const emptyUser = requireAuthSession(emptyUserSession, 'empty user');
    const nextAuthStorage = getAuthStorageValue(emptyUser.storageState);

    for (const priorResult of ['success', 'error'] as const) {
      const context = await browser.newContext({
        storageState: admin.storageState,
      });
      let requestCount = 0;
      let markFirstRequestStarted!: () => void;
      let releaseFirstRequest!: () => void;
      const firstRequestStarted = new Promise<void>((resolve) => {
        markFirstRequestStarted = resolve;
      });
      const firstRequestGate = new Promise<void>((resolve) => {
        releaseFirstRequest = resolve;
      });

      await context.route('**/api/files?force=1', async (route) => {
        requestCount += 1;
        if (requestCount === 1) {
          markFirstRequestStarted();
          await firstRequestGate;

          if (priorResult === 'error') {
            await route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'delayed prior-user failure' }),
            });
            return;
          }

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                name: adminDocumentPath.split('/').pop(),
                path: adminDocumentPath,
                type: 'file',
                title: adminDocumentTitle,
              },
            ]),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '[]',
        });
      });

      const page = await context.newPage();
      try {
        await page.goto(`${DMS_BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await firstRequestStarted;
        await page.evaluate(({ storageKey, storageValue, changeEvent }) => {
          window.localStorage.setItem(storageKey, storageValue);
          window.dispatchEvent(new Event(changeEvent));
        }, {
          storageKey: SHARED_AUTH_STORAGE_KEY,
          storageValue: nextAuthStorage,
          changeEvent: SHARED_AUTH_CHANGE_EVENT,
        });

        await expect.poll(() => requestCount, {
          message: `new user scope should issue its own bootstrap after delayed prior ${priorResult}`,
          timeout: 15_000,
        }).toBe(2);
        await waitForDmsShell(page);

        releaseFirstRequest();
        await page.waitForTimeout(500);

        await expectEmptyFileTree(page);
        await expect(page.getByText(adminDocumentTitle, { exact: true })).toHaveCount(0);
        await expect(page.getByRole('heading', { name: '문서 목록을 준비하지 못했습니다.' })).toHaveCount(0);
      } finally {
        releaseFirstRequest();
        await context.close();
      }
    }
  });
});
