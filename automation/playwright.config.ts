import { defineConfig } from '@playwright/test';
import { resolve } from 'path';

const automationDir = __dirname;
const repoRoot = resolve(automationDir, '..');
const dmsPort = process.env.PLAYWRIGHT_DMS_PORT ?? '3003';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${dmsPort}`;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === '1'
  || process.env.PLAYWRIGHT_SKIP_WEB_SERVER === 'true';
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === '1'
  || process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === 'true';
const launchEvidence = process.env.PLAYWRIGHT_LAUNCH_EVIDENCE === '1'
  || process.env.PLAYWRIGHT_LAUNCH_EVIDENCE === 'true';
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR
  ? resolve(repoRoot, process.env.PLAYWRIGHT_OUTPUT_DIR)
  : resolve(repoRoot, 'test-results');
const jsonOutputFile = process.env.PLAYWRIGHT_JSON_OUTPUT_FILE
  ? resolve(repoRoot, process.env.PLAYWRIGHT_JSON_OUTPUT_FILE)
  : null;
const viewportWidth = Number(process.env.PLAYWRIGHT_VIEWPORT_WIDTH ?? '1440');
const viewportHeight = Number(process.env.PLAYWRIGHT_VIEWPORT_HEIGHT ?? '1000');

export default defineConfig({
  testDir: resolve(automationDir, 'tests/e2e'),
  outputDir,
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  reporter: jsonOutputFile
    ? [['list'], ['json', { outputFile: jsonOutputFile }]]
    : [['list']],
  use: {
    baseURL,
    headless: true,
    viewport: { width: viewportWidth, height: viewportHeight },
    trace: launchEvidence ? 'on' : 'retain-on-failure',
    screenshot: launchEvidence ? 'on' : 'only-on-failure',
    video: launchEvidence ? 'on' : 'retain-on-failure',
  },
  webServer: skipWebServer ? undefined : {
      command: 'bash automation/scripts/playwright/start-dms-e2e-stack.sh',
      cwd: repoRoot,
      url: `http://127.0.0.1:${dmsPort}/login`,
      reuseExistingServer,
      timeout: 10 * 60 * 1000,
      gracefulShutdown: {
        signal: 'SIGTERM',
        timeout: 15_000,
      },
    },
});
