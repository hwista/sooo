import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('output/playwright/pms-launch-visual-qa');
const baseUrl = process.env.PMS_QA_WEB_BASE_URL ?? 'http://localhost:3002';
const apiBaseUrl = (
  process.env.PMS_QA_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000/api'
).replace(/\/+$/, '');
const loginId = process.env.PMS_QA_LOGIN_ID ?? 'admin';
const password = process.env.PMS_QA_PASSWORD ?? 'admin123!';
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  '/home/a0122024330/.cache/ms-playwright/chromium-1229/chrome-linux64/chrome';
const BODY_TEXT_TIMEOUT_MS = 20000;
const BODY_TEXT_RETRY_MS = 250;

const rawIdPatterns = [
  /담당\s+\d{1,}/,
  /담당자\s+\d{1,}/,
  /사용자\s+\d{1,}/,
  /조직\s+\d{1,}/,
  /공용 조직\s+\d{1,}/,
  /프로젝트\s*ID\s*\d{1,}/i,
  /\bID\s+\d{1,}/,
];

const consoleMessages = [];
const pageErrors = [];
const httpErrors = [];
const qaFindings = [];

await mkdir(outputDir, { recursive: true });
const fontConfigFile = path.join(outputDir, 'fonts.conf');
await writeFile(
  fontConfigFile,
  `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>/usr/share/fonts</dir>
  <dir>/mnt/c/Windows/Fonts</dir>
  <cachedir>/tmp/fontconfig-cache</cachedir>
</fontconfig>
`,
);
process.env.FONTCONFIG_FILE = fontConfigFile;

const browser = await chromium.launch({
  executablePath,
  headless: true,
});

try {
  await runViewportQa('desktop', { width: 1440, height: 960 });
  await runViewportQa('mobile', { width: 390, height: 844, isMobile: true });
} finally {
  await browser.close();
}

const summary = {
  baseUrl,
  consoleMessages,
  pageErrors,
  httpErrors,
  qaFindings,
};

await writeFile(
  path.join(outputDir, 'summary.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
);

const fatalConsoleErrors = consoleMessages.filter(
  (message) =>
    message.type === 'error' &&
    !/status of 401 \(Unauthorized\)/i.test(message.text),
);
const fatalHttpErrors = httpErrors.filter(
  (response) =>
    response.status >= 400 &&
    !(
      response.status === 401 &&
      /\/api\/auth\/(me|session)\b/.test(response.url)
    ) &&
    !(
      response.status === 410 &&
      /\/api\/projects\/\d+\/issues\b/.test(response.url)
    ),
);

if (pageErrors.length > 0 || fatalConsoleErrors.length > 0 || fatalHttpErrors.length > 0) {
  throw new Error('PMS browser QA found console/page errors');
}

if (qaFindings.some((finding) => finding.severity === 'error')) {
  throw new Error('PMS browser QA found launch-facing display regressions');
}

console.log('PMS browser QA passed');
console.log(JSON.stringify(summary, null, 2));

async function runViewportQa(name, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(12000);
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push({
        viewport: name,
        type: message.type(),
    text: message.text(),
      });
    }
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      httpErrors.push({
        viewport: name,
        status,
        url: response.url(),
      });
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push({
      viewport: name,
      message: error.message,
    });
  });

  try {
    const authSession = await login(page);
    await capturePage(page, name, 'home');
    await assertScreenText(page, name, 'home-header-breadcrumb', /PMS \/ 홈/);
    await assertScreenText(page, name, 'home-risk-report-summary', /리스크\/리포트 집계/);

    await openProjectDetailFromHome(page, name);
    await assertScreenText(page, name, 'project-detail-header-breadcrumb', /PMS \/ 프로젝트 상세/);
    await assertScreenText(page, name, 'project-detail-closeout', /PM 실행 closeout|다음 액션|막힌 조건|종료 가능 여부|처리 큐/);
    const projectId = await readCurrentProjectId(page, name);
    if (projectId && authSession?.accessToken && authSession?.currentUserId) {
      await ensureCurrentUserPmrPrrApproverMember(page, name, projectId, authSession);
    }
    await verifyCloseoutActionRail(page, name);
    await capturePage(page, name, 'project-detail');
    await verifyProjectManagementTabs(page, name);
    if (projectId && authSession?.accessToken) {
      await verifyLegacyIssueRetiredSurface(page, name, projectId, authSession.accessToken);
    }
    await verifyReviewFeedbackWriteSmoke(page, name, { projectId, authSession });

    await openSidebarItem(page, '요청 등록');
    await assertScreenText(page, name, 'request-create-header-breadcrumb', /PMS \/ 요청 등록/);
    await assertScreenText(page, name, 'request-create-route', /프로젝트명|고객사|요청 출처|요청 요약/);
    await capturePage(page, name, 'request-create');

  } finally {
    await context.close();
  }
}

async function login(page) {
  const response = await page.request.post(`${baseUrl}/api/auth/login`, {
    headers: {
      'X-SSOO-CSRF': '1',
    },
    data: {
      loginId,
      password,
    },
  });

  if (!response.ok()) {
    qaFindings.push({
      severity: 'error',
      step: 'api-login',
      message: `login failed with HTTP ${response.status()}`,
      text: await response.text().catch(() => ''),
    });
  }

  const session = await response.json().catch(() => null);
  const accessToken = typeof session?.accessToken === 'string'
    ? session.accessToken
    : typeof session?.data?.accessToken === 'string'
      ? session.data.accessToken
      : null;
  if (!accessToken) {
    qaFindings.push({
      severity: 'error',
      step: 'api-login',
      message: 'login response did not include an access token for API-backed QA',
      text: JSON.stringify(session),
    });
  }
  const currentUserId = accessToken ? await readCurrentUserId(page, accessToken) : null;

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForAppReady(page, 'post-login');

  return {
    accessToken,
    currentUserId,
  };
}

async function readCurrentUserId(page, accessToken) {
  const response = await page.request.post(apiUrl('/auth/me'), {
    headers: apiHeaders(accessToken),
  });
  const payload = await response.json().catch(() => null);
  const userId = payload?.data?.userId ?? payload?.userId ?? null;
  if (!response.ok() || !userId) {
    qaFindings.push({
      severity: 'error',
      step: 'api-current-user',
      message: `current user lookup failed with HTTP ${response.status()}`,
      text: JSON.stringify(payload),
    });
    return null;
  }
  return String(userId);
}

async function capturePage(page, viewport, step) {
  await waitForAppReady(page, `${viewport}-${step}`);
  await page.screenshot({
    path: path.join(outputDir, `${viewport}-${step}.png`),
    fullPage: false,
    animations: 'disabled',
    timeout: 10000,
  });

  const text = await readBodyText(page);
  for (const pattern of rawIdPatterns) {
    const match = text.match(pattern);
    if (match) {
      qaFindings.push({
        severity: 'error',
        viewport,
        step,
        pattern: pattern.toString(),
        match: match[0],
      });
    }
  }

  const layout = await page.evaluate(() => {
    const body = document.body;
    const documentElement = document.documentElement;
    return {
      bodyTextLength: body.innerText.length,
      horizontalOverflow: documentElement.scrollWidth - documentElement.clientWidth,
      viewportWidth: documentElement.clientWidth,
    };
  });

  if (layout.horizontalOverflow > 8) {
    qaFindings.push({
      severity: 'warning',
      viewport,
      step,
      message: `horizontal overflow ${layout.horizontalOverflow}px`,
      layout,
    });
  }
}

async function gotoApp(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForAppReady(page, url);
}

async function openSidebarItem(page, label) {
  const item = page.getByText(label, { exact: true }).first();
  if (!(await item.isVisible().catch(() => false))) {
    await page.locator('button').first().click();
    await delay(500);
  }

  await item.click();
  await waitForAppReady(page, `sidebar:${label}`);
}

async function openProjectDetailFromHome(page, viewport) {
  const candidates = [
    page.getByTestId('pms-home-feedback-review-action').first(),
    page.getByTestId('pms-home-signal-action').first(),
    page.getByTestId('pms-home-access-project-action').first(),
    page.getByTestId('pms-home-recent-change-action').first(),
  ];

  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      await waitForAppReady(page, `${viewport}:project-detail-entry`);
      await page.getByTestId('pms-project-detail').waitFor({ state: 'visible', timeout: 10000 });
      return;
    }
  }

  qaFindings.push({
    severity: 'error',
    viewport,
    step: 'project-detail-entry',
    message: 'home did not expose a project detail entry action',
    text: await page.locator('body').innerText().catch(() => ''),
  });
}

async function verifyProjectManagementTabs(page, viewport) {
  const tabs = [
    ['tasks', /태스크|WBS|작업/],
    ['milestones', /마일스톤|목표/],
    ['controls', /정식 컨트롤 패널|이슈|리스크|변경/],
    ['deliverables', /산출물/],
    ['closeConditions', /종료조건/],
    ['handoffs', /인수인계|계약|읽기 전용/],
    ['review', /리뷰 피드백 수집|PMR\/PRR 준비도|PMR\/PRR 발행·승인 원장|보고\/리뷰 이벤트|피드백 큐/],
  ];

  for (const [tabKey, expectedText] of tabs) {
    const tab = page.getByTestId(`pms-management-tab-${tabKey}`).first();
    if (!(await tab.isVisible().catch(() => false))) {
      qaFindings.push({
        severity: 'error',
        viewport,
        step: `project-detail-${tabKey}`,
        message: `management tab ${tabKey} is not visible`,
        text: await page.locator('body').innerText().catch(() => ''),
      });
      continue;
    }

    await tab.click();
    await waitForAppReady(page, `${viewport}:project-detail-${tabKey}`);
    await assertScreenText(page, viewport, `project-detail-${tabKey}`, expectedText);
    await capturePage(page, viewport, `project-detail-${tabKey}`);
  }
}

async function readCurrentProjectId(page, viewport) {
  const text = await readBodyText(page);
  const match = text.match(/PRJ-(\d{1,})/);
  if (!match) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'project-detail-project-id',
      message: 'project detail header did not expose a PRJ identifier',
      text: text.slice(0, 500),
    });
    return null;
  }

  const projectId = Number.parseInt(match[1], 10);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'project-detail-project-id',
      message: `project identifier could not be parsed: ${match[0]}`,
    });
    return null;
  }

  return projectId;
}

async function verifyLegacyIssueRetiredSurface(page, viewport, projectId, accessToken) {
  const suffix = `${viewport}-${Date.now().toString(36)}`;
  const response = await page.request.post(apiUrl(`/projects/${projectId}/issues`), {
    headers: apiHeaders(accessToken),
    data: {
      issueCode: `QA-LEG-RETIRED-${suffix}`,
      issueTitle: `QA 기존 Issue 신규 차단 ${suffix}`,
      description: '런칭 브라우저 QA가 기존 Issue 신규 생성 차단을 확인하기 위한 요청입니다.',
      issueTypeCode: 'bug',
      priorityCode: 'normal',
      memo: 'pms-launch-visual-qa legacy issue retired surface probe',
    },
  });

  const payload = await response.json().catch(() => null);
  if (response.status() !== 410 || payload?.error?.code !== 'PMS_LEGACY_ISSUE_WRITE_DISABLED') {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'legacy-issue-retired-write-gate',
      message: `legacy issue POST was not rejected as retired (HTTP ${response.status()})`,
      text: JSON.stringify(payload),
    });
    return;
  }

  const controlsTab = page.getByTestId('pms-management-tab-controls').first();
  await controlsTab.click();
  await waitForAppReady(page, `${viewport}:legacy-issue-retired-surface`);
  await assertScreenText(page, viewport, 'legacy-issue-retired-surface', /기존 Issue cleanup 인박스|신규 작성 경로가 아니라/);
  await capturePage(page, viewport, 'project-detail-controls-legacy-retired');
}

async function waitForAnyVisibleText(page, text, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const locator = page.getByText(text, { exact: true });

  while (Date.now() < deadline) {
    const count = await locator.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      if (await locator.nth(index).isVisible().catch(() => false)) {
        return;
      }
    }
    await delay(500);
  }

  qaFindings.push({
    severity: 'error',
    step: 'visible-text',
    message: `expected visible text was not found: ${text}`,
    text: await page.locator('body').innerText().catch(() => ''),
  });
}

async function verifyCloseoutActionRail(page, viewport) {
  await page.getByTestId('pms-closeout-panel').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByTestId('pms-closeout-resolution-queue').waitFor({ state: 'visible', timeout: 10000 });

  const actions = [
    ['pms-closeout-deliverables-action', 'deliverables', /산출물/],
    ['pms-closeout-close-conditions-action', 'closeConditions', /종료조건/],
    ['pms-closeout-review-action', 'review', /리뷰 피드백 수집|피드백 큐/],
  ];

  for (const [actionTestId, tabKey, expectedText] of actions) {
    const action = page.getByTestId(actionTestId).first();
    if (!(await action.isVisible().catch(() => false))) {
      qaFindings.push({
        severity: 'error',
        viewport,
        step: `closeout-action-${tabKey}`,
        message: `closeout action ${actionTestId} is not visible`,
        text: await page.locator('body').innerText().catch(() => ''),
      });
      continue;
    }

    await action.click();
    await waitForAppReady(page, `${viewport}:closeout-action-${tabKey}`);
    await assertScreenText(page, viewport, `closeout-action-${tabKey}`, expectedText);
  }

  const queueActions = [
    ['pms-closeout-queue-deliverable', 'deliverables', /산출물/],
    ['pms-closeout-queue-close-condition', 'closeConditions', /종료조건/],
    ['pms-closeout-queue-review', 'review', /리뷰 피드백 수집|피드백 큐/],
  ];
  let clickedQueueAction = false;

  for (const [queueTestId, tabKey, expectedText] of queueActions) {
    const queueAction = page.getByTestId(queueTestId).first();
    if (!(await queueAction.isVisible().catch(() => false))) {
      continue;
    }

    await queueAction.click();
    await waitForAppReady(page, `${viewport}:closeout-queue-${tabKey}`);
    await assertScreenText(page, viewport, `closeout-queue-${tabKey}`, expectedText);
    clickedQueueAction = true;
    break;
  }

  if (!clickedQueueAction) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'closeout-resolution-queue',
      message: 'closeout resolution queue did not expose an actionable item',
      text: await page.locator('body').innerText().catch(() => ''),
    });
  }
}

async function verifyReviewFeedbackWriteSmoke(page, viewport, { projectId, authSession }) {
  const suffix = `${viewport}-${Date.now().toString(36)}`;
  const feedbackTitle = `QA 피드백 ${suffix}`;
  const reviewEventName = `QA 리뷰 이벤트 ${suffix}`;

  const reviewTab = page.getByTestId('pms-management-tab-review').first();
  if (!(await reviewTab.isVisible().catch(() => false))) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'review-write-smoke-entry',
      message: 'review tab is not visible for write smoke',
      text: await page.locator('body').innerText().catch(() => ''),
    });
    return;
  }

  await reviewTab.click();
  await waitForAppReady(page, `${viewport}:review-write-smoke`);
  await page.getByTestId('pms-review-summary-tab').waitFor({ state: 'visible', timeout: 10000 });

  await createReviewFeedbackIssue(page, viewport, feedbackTitle);
  await resolveReviewFeedbackIssue(page, viewport, feedbackTitle);
  await createReviewEvent(page, viewport, reviewEventName);
  await createPmrPrrLedgerEntry(page, viewport);
  await createPmrPrrPublicationWorkflow(page, viewport, authSession);
  await capturePage(page, viewport, 'project-detail-review-write-smoke');
}

async function ensureCurrentUserPmrPrrApproverMember(page, viewport, projectId, authSession) {
  const membersResponse = await page.request.get(apiUrl(`/projects/${projectId}/members`), {
    headers: apiHeaders(authSession.accessToken),
  });
  const membersPayload = await membersResponse.json().catch(() => null);
  const members = Array.isArray(membersPayload?.data) ? membersPayload.data : [];
  const existing = members.find((member) => String(member?.userId) === authSession.currentUserId);
  if (existing?.isActive) {
    authSession.currentUserApproverLabel = getProjectMemberDisplayName(existing);
    return;
  }

  const response = await page.request.post(apiUrl(`/projects/${projectId}/members`), {
    headers: apiHeaders(authSession.accessToken),
    data: {
      userId: authSession.currentUserId,
      roleCode: 'qa',
      accessLevel: 'owner',
      isPhaseOwner: true,
      allocationRate: 100,
      memo: 'pms-launch-visual-qa-pmr-prr-approver',
    },
  });

  if (response.status() === 409) {
    const restoredResponse = await page.request.put(
      apiUrl(`/projects/${projectId}/members/${authSession.currentUserId}/qa`),
      {
        headers: apiHeaders(authSession.accessToken),
        data: {
          accessLevel: 'owner',
          isPhaseOwner: true,
          isActive: true,
          allocationRate: 100,
          memo: 'pms-launch-visual-qa-pmr-prr-approver',
        },
      },
    );
    if (restoredResponse.ok()) {
      const restoredPayload = await restoredResponse.json().catch(() => null);
      authSession.currentUserApproverLabel = getProjectMemberDisplayName(restoredPayload?.data);
      return;
    }

    const refreshedResponse = await page.request.get(apiUrl(`/projects/${projectId}/members`), {
      headers: apiHeaders(authSession.accessToken),
    });
    const refreshedPayload = await refreshedResponse.json().catch(() => null);
    const refreshedMembers = Array.isArray(refreshedPayload?.data) ? refreshedPayload.data : [];
    const refreshed = refreshedMembers.find((member) => String(member?.userId) === authSession.currentUserId);
    authSession.currentUserApproverLabel = getProjectMemberDisplayName(refreshed);
    return;
  }

  if (!response.ok()) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'pmr-prr-current-user-member',
      message: `could not ensure current user as PMR/PRR approver member (HTTP ${response.status()})`,
      text: await response.text().catch(() => ''),
    });
    return;
  }

  const createdPayload = await response.json().catch(() => null);
  const createdMember = createdPayload?.data ?? null;
  if (createdMember) {
    authSession.currentUserApproverLabel = getProjectMemberDisplayName(createdMember);
  }
}

function getProjectMemberDisplayName(member) {
  return (
    member?.user?.displayName ||
    member?.user?.userName ||
    member?.displayName ||
    member?.userName ||
    ''
  );
}

async function createReviewFeedbackIssue(page, viewport, feedbackTitle) {
  const action = page.getByTestId('pms-review-feedback-issue-action').first();
  if (!(await action.isVisible().catch(() => false))) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'review-feedback-issue-action',
      message: 'feedback issue action is not visible',
    });
    return;
  }
  if (!(await action.isEnabled().catch(() => false))) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'review-feedback-issue-action',
      message: 'feedback issue action is disabled',
      text: await page.locator('body').innerText().catch(() => ''),
    });
    return;
  }

  await action.click();
  await page.getByTestId('pms-review-feedback-dialog').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByTestId('pms-review-feedback-title-input').fill(feedbackTitle);
  await page
    .getByTestId('pms-review-feedback-description-input')
    .fill('런칭 브라우저 QA가 실제 피드백 이슈 저장을 확인했습니다.');
  await page.getByTestId('pms-review-feedback-submit').click();
  await waitForResponsiveReviewText(
    page.getByTestId('pms-review-feedback-queue'),
    viewport,
    feedbackTitle,
  );
}

async function resolveReviewFeedbackIssue(page, viewport, feedbackTitle) {
  const list = page.getByTestId('pms-review-launch-feedback-list');
  await waitForResponsiveReviewText(list, viewport, feedbackTitle);
  const visibleScope =
    viewport === 'mobile'
      ? list.locator('.md\\:hidden')
      : list.locator('tbody');

  const item = visibleScope
    .getByTestId('pms-review-launch-feedback-item')
    .filter({ hasText: feedbackTitle })
    .first();
  await item.waitFor({ state: 'visible', timeout: 10000 });

  const resolveAction = item.getByTestId('pms-review-feedback-resolve-action').first();
  if (!(await resolveAction.isVisible().catch(() => false))) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'review-feedback-resolve-action',
      message: 'feedback resolve action is not visible',
      text: await list.innerText().catch(() => ''),
    });
    return;
  }
  if (!(await resolveAction.isEnabled().catch(() => false))) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'review-feedback-resolve-action',
      message: 'feedback resolve action is disabled',
      text: await item.innerText().catch(() => ''),
    });
    return;
  }

  await resolveAction.click();
  await item.getByText('해결', { exact: true }).first().waitFor({ state: 'visible', timeout: 12000 });
}

async function createReviewEvent(page, viewport, reviewEventName) {
  const action = page.getByTestId('pms-review-event-action').first();
  if (!(await action.isVisible().catch(() => false))) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'review-event-action',
      message: 'review event action is not visible',
    });
    return;
  }
  if (!(await action.isEnabled().catch(() => false))) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'review-event-action',
      message: 'review event action is disabled',
      text: await page.locator('body').innerText().catch(() => ''),
    });
    return;
  }

  await action.click();
  await page.getByTestId('pms-review-event-dialog').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByTestId('pms-review-event-name-input').fill(reviewEventName);
  await page
    .getByTestId('pms-review-event-summary-input')
    .fill('런칭 브라우저 QA가 실제 리뷰 이벤트 저장을 확인했습니다.');
  await page.getByTestId('pms-review-event-submit').click();
  await waitForResponsiveReviewText(
    page.getByTestId('pms-review-event-list'),
    viewport,
    reviewEventName,
  );
}

async function createPmrPrrLedgerEntry(page, viewport) {
  const action = page.getByTestId('pms-review-pmr-prr-ledger-action').first();
  if (!(await action.isVisible().catch(() => false))) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'pmr-prr-ledger-action',
      message: 'PMR/PRR ledger action is not visible',
    });
    return;
  }
  if (!(await action.isEnabled().catch(() => false))) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'pmr-prr-ledger-action',
      message: 'PMR/PRR ledger action is disabled',
      text: await page.locator('body').innerText().catch(() => ''),
    });
    return;
  }

  const ledger = page.getByTestId('pms-review-pmr-prr-ledger');
  await ledger.waitFor({ state: 'visible', timeout: 10000 });
  const visibleScope =
    viewport === 'mobile'
      ? ledger.locator('.md\\:hidden')
      : ledger.locator('tbody');
  const beforeCount = await visibleScope
    .getByTestId('pms-review-pmr-prr-ledger-item')
    .count()
    .catch(() => 0);

  await action.click();
  await waitForPmrPrrLedgerRefresh(page, viewport, beforeCount, 'PMR/PRR 발행 기록');
  await visibleScope
    .getByTestId('pms-review-pmr-prr-ledger-item')
    .filter({ hasText: 'PMR/PRR 발행 기록' })
    .first()
    .waitFor({ state: 'visible', timeout: 12000 });
}

async function createPmrPrrPublicationWorkflow(page, viewport, authSession) {
  const workflowMarker = `반복 예약과 승인 흐름 ${viewport}-${Date.now()}`;
  const action = page.getByTestId('pms-review-pmr-prr-workflow-action').first();
  if (!(await action.isVisible().catch(() => false))) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'pmr-prr-workflow-action',
      message: 'PMR/PRR scheduled workflow action is not visible',
    });
    return;
  }
  if (!(await action.isEnabled().catch(() => false))) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'pmr-prr-workflow-action',
      message: 'PMR/PRR scheduled workflow action is disabled',
      text: await page.locator('body').innerText().catch(() => ''),
    });
    return;
  }

  const ledger = page.getByTestId('pms-review-pmr-prr-ledger');
  await ledger.waitFor({ state: 'visible', timeout: 10000 });
  const visibleScope =
    viewport === 'mobile'
      ? ledger.locator('.md\\:hidden')
      : ledger.locator('tbody');
  const beforeCount = await visibleScope
    .getByTestId('pms-review-pmr-prr-ledger-item')
    .count()
    .catch(() => 0);

  await action.click();
  await page
    .getByTestId('pms-review-pmr-prr-workflow-dialog')
    .waitFor({ state: 'visible', timeout: 10000 });
  await page
    .getByTestId('pms-review-pmr-prr-workflow-notification-preview')
    .waitFor({ state: 'visible', timeout: 10000 });
  await page
    .getByTestId('pms-review-pmr-prr-workflow-approval-policy-select')
    .waitFor({ state: 'visible', timeout: 10000 });
  await page
    .getByTestId('pms-review-pmr-prr-workflow-notification-audience-select')
    .waitFor({ state: 'visible', timeout: 10000 });
  await selectCurrentUserPmrPrrApprover(page, viewport, authSession);
  await page.getByTestId('pms-review-pmr-prr-workflow-repeat-count-select').click();
  await page.getByRole('option', { name: '4차수 반복 예약' }).click();
  await page
    .getByTestId('pms-review-pmr-prr-workflow-notification-preview')
    .getByText('4차수 반복 예약', { exact: true })
    .waitFor({ state: 'visible', timeout: 10000 });
  await page
    .getByTestId('pms-review-pmr-prr-workflow-notification-preview')
    .getByText('결재선과 활성 멤버 알림', { exact: true })
    .waitFor({ state: 'visible', timeout: 10000 });
  await page
    .getByTestId('pms-review-pmr-prr-workflow-summary-input')
    .fill(`런칭 브라우저 QA가 PMR/PRR ${workflowMarker}을 확인했습니다.`);
  await page.getByTestId('pms-review-pmr-prr-workflow-submit').click();
  await waitForPmrPrrLedgerRefresh(page, viewport, beforeCount, workflowMarker);

  const candidates = visibleScope
    .getByTestId('pms-review-pmr-prr-ledger-item')
    .filter({ hasText: workflowMarker });
  await candidates.first().waitFor({ state: 'visible', timeout: 12000 });

  const candidateCount = await candidates.count();
  let item = null;
  for (let index = 0; index < candidateCount; index += 1) {
    const candidate = candidates.nth(index);
    const candidateRequestAction = candidate
      .getByTestId('pms-review-pmr-prr-approval-request-action')
      .first();
    if (await candidateRequestAction.isEnabled().catch(() => false)) {
      item = candidate;
      break;
    }
  }

  if (!item) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'pmr-prr-approval-request-action',
      message: 'PMR/PRR approval request action is disabled',
      text: await candidates.first().innerText().catch(() => ''),
    });
    return;
  }

  const requestAction = item.getByTestId('pms-review-pmr-prr-approval-request-action').first();
  if (!(await requestAction.isEnabled().catch(() => false))) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'pmr-prr-approval-request-action',
      message: 'PMR/PRR approval request action is disabled',
      text: await item.innerText().catch(() => ''),
    });
    return;
  }
  const workflowEventId = await item.getAttribute('data-pmr-prr-event-id').catch(() => null);
  await requestAction.click();
  const workflowItem = workflowEventId
    ? visibleScope.locator(`[data-pmr-prr-event-id="${workflowEventId}"]`).first()
    : item;
  await workflowItem
    .waitFor({ state: 'visible', timeout: 12000 });
  await waitForPmrPrrWorkflowStatus(page, workflowEventId, workflowItem, 'approval_requested');
  await workflowItem
    .getByText('승인·반려는 지정 승인자만 처리할 수 있습니다.', { exact: true })
    .waitFor({ state: 'hidden', timeout: 12000 })
    .catch(() => null);

  const approveAction = workflowItem.getByTestId('pms-review-pmr-prr-approve-action').first();
  if (!(await approveAction.isEnabled().catch(() => false))) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'pmr-prr-approve-action',
      message: 'PMR/PRR approve action is disabled',
      text: await workflowItem.innerText().catch(() => ''),
    });
    return;
  }
  await approveAction.click();
  await waitForPmrPrrWorkflowStatus(page, workflowEventId, workflowItem, 'approved');

  const publishAction = workflowItem.getByTestId('pms-review-pmr-prr-publish-action').first();
  if (!(await publishAction.isEnabled().catch(() => false))) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'pmr-prr-publish-action',
      message: 'PMR/PRR publish action is disabled',
      text: await workflowItem.innerText().catch(() => ''),
    });
    return;
  }
  await publishAction.click();
  await publishAction.waitFor({ state: 'hidden', timeout: 12000 });
  await waitForPmrPrrWorkflowStatus(page, workflowEventId, workflowItem, 'completed');
}

async function waitForPmrPrrWorkflowStatus(page, eventId, item, statusCode) {
  const deadline = Date.now() + 45000;
  const eventLocator = eventId
    ? page.locator(`[data-pmr-prr-event-id="${eventId}"]`)
    : null;

  while (Date.now() < deadline) {
    const currentStatusCode = eventLocator
      ? await eventLocator
          .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-pmr-prr-status-code')))
          .then((statuses) => statuses.find((status) => status === statusCode) ?? statuses[0] ?? null)
          .catch(() => null)
      : await item
          .evaluate((element) => element.getAttribute('data-pmr-prr-status-code'))
          .catch(() => null);

    if (currentStatusCode === statusCode) {
      return;
    }

    await delay(250);
  }

  const observedStatuses = eventLocator
    ? await eventLocator
        .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-pmr-prr-status-code')))
        .catch(() => [])
    : [];
  throw new Error(
    `PMR/PRR workflow status did not become ${statusCode}; observed=${observedStatuses.join(',') || 'none'}`,
  );
}

async function waitForPmrPrrLedgerRefresh(page, viewport, beforeCount, expectedText) {
  const deadline = Date.now() + 12000;
  const ledger = page.getByTestId('pms-review-pmr-prr-ledger');
  const visibleScope =
    viewport === 'mobile'
      ? ledger.locator('.md\\:hidden')
      : ledger.locator('tbody');

  while (Date.now() < deadline) {
    const currentCount = await visibleScope
      .getByTestId('pms-review-pmr-prr-ledger-item')
      .count()
      .catch(() => 0);
    const expectedVisible = await visibleScope
      .getByText(expectedText)
      .first()
      .isVisible()
      .catch(() => false);

    if (currentCount > beforeCount || expectedVisible) {
      return;
    }

    await delay(500);
  }

  qaFindings.push({
    severity: 'error',
    viewport,
    step: 'pmr-prr-ledger-refresh',
    message: `PMR/PRR ledger did not show expected update: ${expectedText}`,
    text: await ledger.innerText().catch(() => ''),
  });
}

async function selectCurrentUserPmrPrrApprover(page, viewport, authSession) {
  const currentUserId = authSession?.currentUserId;
  const currentUserApproverLabel = authSession?.currentUserApproverLabel;
  if (!currentUserId) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step: 'pmr-prr-current-user-approver',
      message: 'current user id is required to prove PMR/PRR approver-gated approval',
    });
    return;
  }

  const trigger = page.getByTestId('pms-review-pmr-prr-workflow-approver-select');
  const selectedValue = await trigger
    .evaluate((node) => node.getAttribute('data-value') || node.textContent || '')
    .catch(() => '');
  if (
    selectedValue.includes(currentUserId)
    || (currentUserApproverLabel && selectedValue.includes(currentUserApproverLabel))
  ) {
    return;
  }

  await trigger.click();
  const option = page.locator(`[role="option"][data-value="${currentUserId}"]`).first();
  if (await option.isVisible().catch(() => false)) {
    await option.click();
    return;
  }
  if (currentUserApproverLabel) {
    const labelOption = page.getByRole('option', { name: new RegExp(escapeRegExp(currentUserApproverLabel)) }).first();
    if (await labelOption.isVisible().catch(() => false)) {
      await labelOption.click();
      return;
    }
  }

  await page.keyboard.press('Escape').catch(() => null);
  qaFindings.push({
    severity: 'error',
    viewport,
    step: 'pmr-prr-current-user-approver',
    message: 'current user was not available as a PMR/PRR approver option',
    text: await page
      .getByTestId('pms-review-pmr-prr-workflow-dialog')
      .innerText()
      .catch(() => ''),
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function waitForResponsiveReviewText(section, viewport, text) {
  const visibleScope =
    viewport === 'mobile'
      ? section.locator('.md\\:hidden')
      : section.locator('tbody');

  await visibleScope
    .getByText(text, { exact: true })
    .first()
    .waitFor({ state: 'visible', timeout: 12000 });
}

function apiUrl(pathname) {
  return `${apiBaseUrl}${pathname}`;
}

function apiHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-SSOO-App': 'pms',
  };
}

async function waitForAppReady(page, label) {
  try {
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return text.length > 120 && !/^로딩\s*중/.test(text.trim());
      },
      { timeout: 20000 },
    );
  } catch {
    qaFindings.push({
      severity: 'error',
      step: label,
      message: 'screen did not leave the initial loading state within 20s',
      text: await page.locator('body').innerText().catch(() => ''),
    });
  }
  await delay(800);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readBodyText(page, timeoutMs = BODY_TEXT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      return await page.locator('body').innerText({ timeout: 1000 });
    } catch (error) {
      lastError = error;
      await delay(BODY_TEXT_RETRY_MS);
    }
  }

  throw lastError ?? new Error('body text was not readable');
}

async function assertScreenText(page, viewport, step, pattern) {
  const text = await readBodyText(page);
  if (!pattern.test(text)) {
    qaFindings.push({
      severity: 'error',
      viewport,
      step,
      message: 'expected screen text was not visible',
      pattern: pattern.toString(),
      text: text.slice(0, 500),
    });
  }
}

async function clickFirstRequestRow(page) {
  const firstRow = page.locator('tbody tr').first();
  if (await firstRow.count()) {
    await firstRow.click();
  }
}

async function openFirstProjectDetail(page) {
  const detailLink = page.getByRole('button', { name: /REQ-\d{6}|PRJ-\d{6}/ }).first();
  if (await detailLink.count()) {
    await detailLink.click();
    return;
  }

  const fallbackRow = page.locator('tbody tr').first();
  if (await fallbackRow.count()) {
    await fallbackRow.dblclick();
  }
}
