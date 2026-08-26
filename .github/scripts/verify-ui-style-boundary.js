#!/usr/bin/env node
/**
 * SSOO platform UI style boundary gate.
 *
 * Keeps typography/theme ownership global and prevents app/domain surfaces,
 * including final page internals, from reintroducing local visual recipes.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');
const WEB_APPS_DIR = path.join(ROOT_DIR, 'apps/web');
const WEB_UI_CN_PATH = path.join(ROOT_DIR, 'packages/web-ui/src/cn.ts');
const WEB_UI_TAILWIND_PRESET_PATH = path.join(ROOT_DIR, 'packages/web-ui/tailwind-preset.cjs');
const APP_NAMES = ['admin', 'crm', 'pms', 'dms', 'sns'];
const IGNORED_DIRS = new Set(['.git', '.next', 'coverage', 'dist', 'node_modules', 'storybook-static']);
const SOURCE_FILE_PATTERN = /\.(ts|tsx|css|js)$/;
const STORY_FILE_PATTERN = /\.stories\.(ts|tsx)$/;

const CENTRAL_TOKEN_PATTERN = /^\s*(--(?:font-sans|font-mono|ssoo-[\w-]+|background|foreground|card|card-foreground|popover|popover-foreground|primary|primary-foreground|secondary|secondary-foreground|muted|muted-foreground|accent|accent-foreground|destructive|destructive-foreground|border|input|ring|radius))\s*:/;
const FONT_DECLARATION_PATTERN = /\bfont-family\s*:|\bfontFamily\s*:/;
const ALLOWED_FONT_VALUE_PATTERN = /var\(--font-(?:sans|mono)\)|['"]inherit['"]|\binherit\b|design\/font-override/;
const APP_THEME_SELECTOR_PATTERN = /\[data-ssoo-theme=|body\[data-ssoo-theme=/;
const SOURCE_FIDELITY_OVERRIDE_START = 'design/source-fidelity-override:start';
const SOURCE_FIDELITY_OVERRIDE_END = 'design/source-fidelity-override:end';
const SOURCE_FIDELITY_OVERRIDE_METADATA_PATTERN = /\bref=[A-Z0-9-]+\b.*\bevidence=[A-Z0-9-]+\b/;

const FORBIDDEN_TAILWIND_THEME_PATTERN = /\btheme\s*:|\b(?:fontFamily|fontSize|colors|spacing|borderRadius|boxShadow)\s*:/;
const FORBIDDEN_SURFACE_TOKEN_PATTERNS = [
  {
    name: 'raw-tailwind-color-token',
    pattern: /\b(?:bg|text|fill|stroke|border|ring|outline|divide|placeholder|placeholder:text|hover:bg|hover:text|hover:border|focus:bg|focus:text|focus:border|focus:ring|focus-visible:ring|disabled:bg|disabled:text|disabled:border)-(?:(?:white|black)(?:\/\d+)?|(?:gray|slate|zinc|neutral|blue|indigo|violet|purple|emerald|green|red|yellow|orange|amber|teal|cyan|sky|pink|rose)-\d{2,3}(?:\/\d+)?)\b/,
  },
  {
    name: 'arbitrary-text-token',
    pattern: /\btext-\[[^\]]+\]/,
  },
  {
    name: 'raw-hex-token',
    pattern: /#[0-9A-Fa-f]{3,8}\b/,
  },
];

const DOMAIN_SURFACE_PATH_PATTERNS = [
  /^apps\/web\/[^/]+\/src\/components\/templates\//,
  /^apps\/web\/[^/]+\/src\/components\/common\/(?:datagrid|page|form)\//,
];

const FINAL_PAGE_PATH_PATTERNS = [
  /^apps\/web\/[^/]+\/src\/components\/pages\//,
  /^apps\/web\/[^/]+\/src\/app\/(?:\(main\)\/.*\/page|page|not-found|global-error|.*\/error)\.tsx$/,
];

const SHARED_STANDARD_PATH_PATTERNS = [
  /^packages\/web-ui\/src\//,
  /^packages\/web-auth\/src\/(?:ui|password-reset-page|user-surface)\.tsx$/,
  /^packages\/web-shell\/src\/.*\.tsx$/,
];

function toRepoPath(filePath) {
  return path.relative(ROOT_DIR, filePath).split(path.sep).join('/');
}

function listFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(entryPath));
    } else if (SOURCE_FILE_PATTERN.test(entryPath) && !STORY_FILE_PATTERN.test(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

function readLines(filePath) {
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
}

function pushIssue(issues, filePath, lineIndex, rule, message, code) {
  issues.push({
    file: toRepoPath(filePath),
    line: lineIndex + 1,
    rule,
    message,
    code: code.trim(),
  });
}

function isCommentLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
}

function verifyAppGlobalCss(filePath, issues) {
  if (!fs.existsSync(filePath)) {
    pushIssue(issues, filePath, 0, 'missing-app-globals', 'web app globals.css is missing', '');
    return;
  }

  const lines = readLines(filePath);
  lines.forEach((line, index) => {
    if (isCommentLine(line)) {
      return;
    }

    const centralTokenMatch = line.match(CENTRAL_TOKEN_PATTERN);
    if (centralTokenMatch) {
      pushIssue(
        issues,
        filePath,
        index,
        'app-global-central-token',
        `app globals.css must not define platform token ${centralTokenMatch[1]}; use packages/web-shell/src/styles/ssoo-global.css`,
        line,
      );
    }

    if (APP_THEME_SELECTOR_PATTERN.test(line)) {
      pushIssue(
        issues,
        filePath,
        index,
        'app-theme-selector',
        'app globals.css must not define app theme selectors; theme blocks are owned by ssoo-global.css',
        line,
      );
    }

    if (FONT_DECLARATION_PATTERN.test(line) && !ALLOWED_FONT_VALUE_PATTERN.test(line)) {
      pushIssue(
        issues,
        filePath,
        index,
        'app-global-font-declaration',
        'app globals.css must not define local font-family; use --font-sans/--font-mono from the platform global CSS',
        line,
      );
    }

    for (const rule of FORBIDDEN_SURFACE_TOKEN_PATTERNS) {
      if (rule.pattern.test(line)) {
        pushIssue(
          issues,
          filePath,
          index,
          `app-global-${rule.name}`,
          'app globals.css must use semantic SSOO tokens/classes instead of raw visual tokens',
          line,
        );
      }
    }
  });
}

function verifyTailwindConfig(filePath, issues) {
  const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (!content) {
    pushIssue(issues, filePath, 0, 'missing-tailwind-config', 'web app tailwind config is missing', '');
    return;
  }

  if (!content.includes("@ssoo/web-ui/tailwind-preset")) {
    pushIssue(
      issues,
      filePath,
      0,
      'missing-platform-tailwind-preset',
      'web app tailwind config must consume @ssoo/web-ui/tailwind-preset',
      '',
    );
  }

  readLines(filePath).forEach((line, index) => {
    if (FORBIDDEN_TAILWIND_THEME_PATTERN.test(line)) {
      pushIssue(
        issues,
        filePath,
        index,
        'app-tailwind-theme-recipe',
        'web app tailwind config must not redefine theme recipes; add platform tokens to @ssoo/web-ui instead',
        line,
      );
    }
  });
}

function isDomainSurfaceFile(repoPath) {
  return DOMAIN_SURFACE_PATH_PATTERNS.some((pattern) => pattern.test(repoPath));
}

function isSharedStandardFile(repoPath) {
  return SHARED_STANDARD_PATH_PATTERNS.some((pattern) => pattern.test(repoPath));
}

function isFinalPageFile(repoPath) {
  return FINAL_PAGE_PATH_PATTERNS.some((pattern) => pattern.test(repoPath));
}

function collectSourceFidelityOverrideLines(filePath, issues) {
  const lines = readLines(filePath);
  const overrideLines = new Set();
  const repoPath = toRepoPath(filePath);
  let activeStartIndex = null;

  lines.forEach((line, index) => {
    if (line.includes(SOURCE_FIDELITY_OVERRIDE_START)) {
      if (activeStartIndex !== null) {
        pushIssue(issues, filePath, index, 'nested-source-fidelity-override', 'source fidelity override blocks must not nest', line);
        return;
      }
      if (!isFinalPageFile(repoPath)) {
        pushIssue(issues, filePath, index, 'invalid-source-fidelity-override-path', 'source fidelity overrides are restricted to final page renderers', line);
      }
      if (!SOURCE_FIDELITY_OVERRIDE_METADATA_PATTERN.test(line)) {
        pushIssue(issues, filePath, index, 'missing-source-fidelity-override-evidence', 'source fidelity override start markers require ref=<reference-id> and evidence=<test-id>', line);
      }
      activeStartIndex = index;
      overrideLines.add(index);
      return;
    }

    if (line.includes(SOURCE_FIDELITY_OVERRIDE_END)) {
      if (activeStartIndex === null) {
        pushIssue(issues, filePath, index, 'orphan-source-fidelity-override-end', 'source fidelity override end marker has no matching start', line);
        return;
      }
      overrideLines.add(index);
      activeStartIndex = null;
      return;
    }

    if (activeStartIndex !== null) overrideLines.add(index);
  });

  if (activeStartIndex !== null) {
    pushIssue(issues, filePath, activeStartIndex, 'unclosed-source-fidelity-override', 'source fidelity override start marker must have a matching end marker', lines[activeStartIndex]);
  }
  return overrideLines;
}

function verifyComponentFontBoundary(filePath, issues, overrideLines) {
  const lines = readLines(filePath);
  lines.forEach((line, index) => {
    if (isCommentLine(line) || overrideLines.has(index)) {
      return;
    }

    if (FONT_DECLARATION_PATTERN.test(line) && !ALLOWED_FONT_VALUE_PATTERN.test(line)) {
      pushIssue(
        issues,
        filePath,
        index,
        'component-local-font-declaration',
        'runtime components must use inherited/platform font tokens, not local fontFamily/font-family recipes',
        line,
      );
    }
  });
}

function verifyDomainSurfaceTokens(filePath, issues, overrideLines) {
  const lines = readLines(filePath);
  lines.forEach((line, index) => {
    if (isCommentLine(line) || overrideLines.has(index)) {
      return;
    }

    for (const rule of FORBIDDEN_SURFACE_TOKEN_PATTERNS) {
      if (rule.pattern.test(line)) {
        pushIssue(
          issues,
          filePath,
          index,
          rule.name,
        'shared primitives/templates, domain reusable surfaces, and final page internals must use semantic SSOO tokens/classes instead of local visual tokens',
        line,
      );
    }
    }
  });
}

function verifyPlatformClassMergeConfig(issues) {
  const content = fs.existsSync(WEB_UI_CN_PATH) ? fs.readFileSync(WEB_UI_CN_PATH, 'utf8') : '';
  const requiredMarkers = [
    'extendTailwindMerge',
    'SSOO_TEXT_SIZE_CLASS_PARTS',
    "'body-sm'",
    "'label-md'",
    "'action-md'",
  ];

  for (const marker of requiredMarkers) {
    if (!content.includes(marker)) {
      pushIssue(
        issues,
        WEB_UI_CN_PATH,
        0,
        'platform-class-merge-config',
        `@ssoo/web-ui cn() must preserve SSOO typography token ${marker} alongside color tokens`,
        '',
      );
    }
  }
}

function verifyPlatformTypographyContract(issues) {
  const content = fs.existsSync(WEB_UI_TAILWIND_PRESET_PATH) ? fs.readFileSync(WEB_UI_TAILWIND_PRESET_PATH, 'utf8') : '';
  const requiredMarkers = [
    "'action-md': ['0.8125rem'",
    "lineHeight: '1.125rem'",
    "fontWeight: '500'",
  ];

  for (const marker of requiredMarkers) {
    if (!content.includes(marker)) {
      pushIssue(
        issues,
        WEB_UI_TAILWIND_PRESET_PATH,
        0,
        'platform-page-action-typography',
        'Button pageAction typography must preserve the DMS document header action baseline: 13px medium text, not a promoted 16px label',
        '',
      );
    }
  }
}

function printIssues(issues) {
  if (issues.length === 0) {
    console.log('✅ UI style boundary 검증 통과');
    return;
  }

  console.log('\n🎨 UI style boundary 검증 결과\n');
  for (const issue of issues) {
    console.log(`  ${issue.file}:${issue.line}`);
    console.log(`    [${issue.rule}] ${issue.message}`);
    if (issue.code) {
      console.log(`    ${issue.code}`);
    }
    console.log('');
  }
  console.log(`총: ${issues.length} 오류\n`);
}

function main() {
  const issues = [];

  verifyPlatformClassMergeConfig(issues);
  verifyPlatformTypographyContract(issues);

  for (const appName of APP_NAMES) {
    const appRoot = path.join(WEB_APPS_DIR, appName);
    verifyAppGlobalCss(path.join(appRoot, 'src/app/globals.css'), issues);

    const tailwindConfigPath = fs.existsSync(path.join(appRoot, 'tailwind.config.ts'))
      ? path.join(appRoot, 'tailwind.config.ts')
      : path.join(appRoot, 'tailwind.config.js');
    verifyTailwindConfig(tailwindConfigPath, issues);
  }

  const componentFiles = listFilesRecursive(WEB_APPS_DIR)
    .filter((filePath) => /\.(ts|tsx|css)$/.test(filePath));

  const sharedStandardFiles = [
    ...listFilesRecursive(path.join(ROOT_DIR, 'packages/web-ui/src')),
    ...listFilesRecursive(path.join(ROOT_DIR, 'packages/web-auth/src')),
    ...listFilesRecursive(path.join(ROOT_DIR, 'packages/web-shell/src')),
  ].filter((filePath) => isSharedStandardFile(toRepoPath(filePath)));

  for (const filePath of [...componentFiles, ...sharedStandardFiles]) {
    const repoPath = toRepoPath(filePath);
    const overrideLines = collectSourceFidelityOverrideLines(filePath, issues);
    verifyComponentFontBoundary(filePath, issues, overrideLines);
    if (isDomainSurfaceFile(repoPath) || isFinalPageFile(repoPath) || isSharedStandardFile(repoPath)) {
      verifyDomainSurfaceTokens(filePath, issues, overrideLines);
    }
  }

  printIssues(issues);
  process.exit(issues.length > 0 ? 1 : 0);
}

main();
