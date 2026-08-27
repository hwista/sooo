import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const workspaceRoot = path.resolve(projectRoot, '../../..');

function read(relPath, base = projectRoot) {
  return fs.readFileSync(path.join(base, relPath), 'utf8');
}

const checks = [
  {
    file: 'src/app/(main)/layout.tsx',
    patterns: [
      'accessSnapshot?.features.canReadDocuments',
      'refreshFileTree({ forceSync: true })',
    ],
    description: 'DMS only preloads the document tree after read access is hydrated',
  },
  {
    file: 'src/stores/file.store.ts',
    patterns: [
      'const result = await filesApi.getFileTree(options);',
      'const nextFiles = toFileNodes(result.data);',
      'isInitialized: true',
      'filesOwnerUserId: requestScope.userId',
    ],
    absentPatterns: [
      'FORCE_SYNC_EMPTY_RETRY_COUNT',
      'waitForFileTreeRetry',
      'requestFileTree(options)',
    ],
    description: 'file tree refresh treats successful empty arrays as initialized user-scoped state',
  },
  {
    file: 'src/components/layout/sidebar/Sidebar.tsx',
    patterns: [
      'refreshAction',
      'await refreshFileTree({ forceSync: true });',
      'disabled: isRefreshing || !canReadDocuments',
    ],
    description: 'workspace sidebar keeps the manual force-sync refresh action',
  },
  {
    file: 'src/components/layout/sidebar/FileTree.tsx',
    patterns: [
      'const canReadDocuments = useAccessStore',
      'const handleRetry = async () =>',
      'await refreshFileTree({ forceSync: true });',
      '문서 목록 다시 불러오기',
      '표시할 문서가 없습니다.',
      '문서가 있어야 하는데 보이지 않으면 목록을 다시 동기화하세요.',
    ],
    description: 'file tree error state exposes an in-place retry affordance and empty state is non-blocking',
  },
  {
    base: workspaceRoot,
    file: 'docs/dms/explanation/architecture/document-control-plane-hydration-contract.md',
    patterns: [
      '문서 0건은 오류가 아니다',
      '정상 로그인 사용자를 full-page blocking recovery 화면에 가두지 않는다',
      '오류 상태에는 사용자가 수동으로 다시 불러올 수 있는 visible retry 동선이 있어야 한다',
    ],
    description: 'DMS documentation defines the non-blocking hydrate failure contract',
  },
  {
    base: workspaceRoot,
    file: '.codex/instructions/codex-instructions.md',
    patterns: [
      'Behavior Impact Gate',
      '사용자-visible 기능',
      'dead code로 간주하지 않는다',
    ],
    description: 'Codex instructions require user gating for behavior-impacting changes',
  },
  {
    base: workspaceRoot,
    file: '.github/copilot-instructions.md',
    patterns: [
      'Behavior Impact Gate',
      '사용자-visible 기능',
      'dead code로 간주하지 않는다',
    ],
    description: 'GitHubDocs instructions require user gating for behavior-impacting changes',
  },
];

const failures = [];

for (const check of checks) {
  const text = read(check.file, check.base);
  for (const pattern of check.patterns) {
    if (!text.includes(pattern)) {
      failures.push(`- ${check.description} (${check.file}) missing pattern: ${pattern}`);
    }
  }
  for (const pattern of check.absentPatterns ?? []) {
    if (text.includes(pattern)) {
      failures.push(`- ${check.description} (${check.file}) contains forbidden pattern: ${pattern}`);
    }
  }
}

if (failures.length > 0) {
  console.error('[document-hydration-contract] failed');
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log('[document-hydration-contract] passed');
