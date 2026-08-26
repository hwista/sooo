export const DMS_GO_LIVE_TRACK_IDS = Object.freeze([
  'release-artifact',
  'production-infrastructure',
  'recovery-proof',
  'operational-control-proof',
  'browser-ralph',
]);

export const DMS_GO_LIVE_REQUIRED_ASSETS = Object.freeze([
  'automation/tsconfig.json',
  'scripts/verify-dms-backup-restore.mjs',
  'scripts/verify-dms-public-endpoints.mjs',
  'scripts/verify-workspace-release-state.mjs',
  'scripts/verify-dms-launch-contract.mjs',
  'scripts/verify-prisma-deepmerge-security.mjs',
  'automation/tests/e2e/support/launch-browser.ts',
  'automation/tests/e2e/support/mutation-recovery.ts',
  'automation/tests/e2e/dms-launch-smoke.spec.ts',
  'automation/tests/e2e/dms-production-readiness.spec.ts',
  'automation/tests/e2e/dms-mobile-readiness.spec.ts',
  'automation/tests/e2e/admin-operational-readiness.spec.ts',
  'automation/tests/e2e/dms-operational-settings.spec.ts',
]);

export const DMS_GO_LIVE_CURRENT_DOC_MARKERS = Object.freeze([
  {
    path: 'docs/dms/planning/2026-08-14-operational-launch-ralph-plan.md',
    markers: ['다섯 번째 blocking 트랙', 'release SHA/run ID', 'atomic checkpoint'],
  },
  {
    path: 'docs/dms/planning/backlog.md',
    markers: ['다섯 트랙 통합 gate'],
  },
  {
    path: 'docs/dms/planning/roadmap.md',
    markers: ['다섯 트랙'],
  },
  {
    path: 'docs/dms/guides/deployment.md',
    markers: ['DMS_GO_LIVE_RUN_ID', '--resume'],
  },
]);

export function createDmsGoLiveGatePlan({
  localRuntimeDir,
  localPostgresPort,
  localServerPort,
  localDmsPort,
  localAdminPort,
  localSmtpPort,
  localServerUrl,
  localDmsUrl,
  localAdminUrl,
  runId,
  evidenceDir,
}) {
  const playwrightEvidence = {
    PLAYWRIGHT_RUN_ID: runId,
    PLAYWRIGHT_LAUNCH_EVIDENCE: '1',
    PLAYWRIGHT_OUTPUT_DIR: `${evidenceDir}/playwright/artifacts`,
    PLAYWRIGHT_JSON_OUTPUT_FILE: `${evidenceDir}/playwright/results.json`,
    PLAYWRIGHT_VIEWPORT_WIDTH: '1440',
    PLAYWRIGHT_VIEWPORT_HEIGHT: '1000',
  };

  return [
    {
      id: 'release-artifact',
      label: '모노레포 release artifact',
      steps: [
        ['launch-contract', ['run', 'verify:dms-launch-contract']],
        ['launch-types', ['run', 'verify:dms-launch-types']],
        ['playwright-stack-contract', ['run', 'verify:dms-playwright-stack:self-test']],
        ['codex-sync', ['run', 'codex:verify-sync']],
        ['codex-preflight', ['run', 'codex:preflight']],
        ['lint', ['run', 'lint']],
        ['server-tests', ['run', 'test:server']],
        ['production-security-audit', ['run', 'security:audit']],
        ['prisma-deepmerge-security', ['run', 'verify:prisma-deepmerge-security']],
        ['database-contract-tests', ['run', 'db:contract:test']],
        ['monorepo-build', ['run', 'build']],
        ['dms-guard', ['run', 'codex:dms-guard']],
        ['push-guard', ['run', 'codex:push-guard']],
        ['remote-release-state', ['run', 'verify:workspace-release-state']],
      ],
    },
    {
      id: 'production-infrastructure',
      label: '프로덕션 구성·TLS·공개 endpoint',
      steps: [
        ['production-env', ['run', 'docker:production:verify-env']],
        ['production-compose', ['run', 'docker:production:config']],
        ['public-endpoints', ['run', 'verify:dms-public-endpoints']],
      ],
    },
    {
      id: 'recovery-proof',
      label: 'PostgreSQL·DMS runtime 격리 복원',
      steps: [
        ['backup-restore', ['run', 'verify:dms-backup-restore:production']],
      ],
    },
    {
      id: 'operational-control-proof',
      label: '격리 DB·runtime Admin/DMS 운영 mutation proof',
      steps: [
        [
          'isolated-operational-browser',
          [
            'exec',
            'playwright',
            'test',
            '--config',
            'automation/playwright.config.ts',
            'automation/tests/e2e/dms-launch-smoke.spec.ts',
            'automation/tests/e2e/flows/ws015-markdown-fixes.spec.ts',
            'automation/tests/e2e/flows/ws019-inline-file-selection.spec.ts',
            'automation/tests/e2e/admin-operational-readiness.spec.ts',
            'automation/tests/e2e/dms-operational-settings.spec.ts',
            'automation/tests/e2e/dms-mobile-readiness.spec.ts',
          ],
          {
            ...playwrightEvidence,
            PLAYWRIGHT_SKIP_WEB_SERVER: '0',
            PLAYWRIGHT_REUSE_EXISTING_SERVER: 'false',
            PLAYWRIGHT_RUNTIME_DIR: localRuntimeDir,
            PLAYWRIGHT_LOG_DIR: `${evidenceDir}/runtime-logs`,
            PLAYWRIGHT_PG_PORT: localPostgresPort,
            PLAYWRIGHT_SERVER_PORT: localServerPort,
            PLAYWRIGHT_DMS_PORT: localDmsPort,
            PLAYWRIGHT_ADMIN_PORT: localAdminPort,
            PLAYWRIGHT_SMTP_PORT: localSmtpPort,
            PLAYWRIGHT_DMS_MARKDOWN_ROOT: `${localRuntimeDir}/markdown`,
            PLAYWRIGHT_BASE_URL: localDmsUrl,
            DMS_GO_LIVE_DMS_URL: localDmsUrl,
            DMS_GO_LIVE_ADMIN_URL: localAdminUrl,
            DMS_GO_LIVE_API_URL: `${localServerUrl}/api`,
            DMS_GO_LIVE_ADMIN_LOGIN_ID: 'admin',
            DMS_GO_LIVE_ADMIN_PASSWORD: 'admin123!',
            DMS_GO_LIVE_EDITOR_LOGIN_ID: 'pm.kim',
            DMS_GO_LIVE_EDITOR_PASSWORD: 'user123!',
            ADMIN_OPERATIONAL_MUTATIONS: '1',
            DMS_OPERATIONAL_MUTATIONS: '1',
          },
        ],
      ],
    },
    {
      id: 'browser-ralph',
      label: '배포 DMS·Admin 실제 브라우저·운영 표면',
      steps: [
        [
          'production-browser',
          [
            'exec',
            'playwright',
            'test',
            '--config',
            'automation/playwright.config.ts',
            'automation/tests/e2e/dms-production-readiness.spec.ts',
            'automation/tests/e2e/admin-operational-readiness.spec.ts',
            'automation/tests/e2e/dms-operational-settings.spec.ts',
            'automation/tests/e2e/dms-mobile-readiness.spec.ts',
          ],
          {
            ...playwrightEvidence,
            PLAYWRIGHT_SKIP_WEB_SERVER: '1',
            ADMIN_OPERATIONAL_MUTATIONS: '0',
            DMS_OPERATIONAL_MUTATIONS: '0',
          },
        ],
      ],
    },
  ];
}
