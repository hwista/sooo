import path from 'path';
import { promises as fs } from 'fs';
import { renderMarkdown } from './markdown';
import type { DocLink, DocSection, DocsIndex } from './index';

const docsRoot = path.resolve(process.cwd(), '..', '..', 'docs');

const sanitizeSegments = (segments: string[]) =>
  segments.map((segment) => decodeURIComponent(segment)).filter(Boolean);

const resolveDocCandidate = async (relativePath: string) => {
  const candidate = path.resolve(docsRoot, relativePath);
  const relative = path.relative(docsRoot, candidate);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  try {
    const stat = await fs.stat(candidate);
    if (stat.isFile()) {
      return candidate;
    }
  } catch {
    return null;
  }

  return null;
};

const extractTitle = (markdown: string, fallback: string) => {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
};

const toPosixPath = (value: string) => value.replace(/\\/g, '/');

const buildDocHref = (relativePath: string) => {
  const cleanPath = toPosixPath(relativePath).replace(/\.md$/i, '');
  return `/docs/${cleanPath}`;
};

const readDocTitle = async (absolutePath: string, fallback: string) => {
  const markdown = await fs.readFile(absolutePath, 'utf8');
  return extractTitle(markdown, fallback);
};

export const loadDocBySlug = async (slug: string[]) => {
  const segments = sanitizeSegments(slug);
  const slugPath = segments.join('/');

  const candidates = [
    slugPath ? `${slugPath}.md` : 'README.md',
    slugPath ? `${slugPath}/README.md` : null,
  ].filter(Boolean) as string[];

  let resolvedPath: string | null = null;
  for (const candidate of candidates) {
    resolvedPath = await resolveDocCandidate(candidate);
    if (resolvedPath) {
      break;
    }
  }

  if (!resolvedPath) {
    return null;
  }

  const markdown = await fs.readFile(resolvedPath, 'utf8');
  const relativePath = toPosixPath(path.relative(docsRoot, resolvedPath));
  const currentDir = path.posix.dirname(relativePath) === '.'
    ? ''
    : path.posix.dirname(relativePath);

  return {
    html: renderMarkdown(markdown, currentDir),
    title: extractTitle(markdown, path.basename(relativePath, '.md')),
    relativePath: relativePath.replace(/\.md$/i, ''),
  };
};

export const loadDocsIndex = async (): Promise<DocsIndex> => {
  const entries = await fs.readdir(docsRoot, { withFileTypes: true });
  const rootItems: DocLink[] = [];
  const sections: DocSection[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const absolutePath = path.join(docsRoot, entry.name);

    if (entry.isFile() && entry.name.endsWith('.md')) {
      const title = await readDocTitle(absolutePath, entry.name.replace(/\.md$/i, ''));
      rootItems.push({ title, href: buildDocHref(entry.name) });
      continue;
    }

    if (!entry.isDirectory()) {
      continue;
    }

    const sectionDir = entry.name;
    const sectionEntries = await fs.readdir(absolutePath, { withFileTypes: true });
    const sectionItems: DocLink[] = [];
    let sectionTitle = sectionDir;
    let sectionHref: string | null = null;

    for (const child of sectionEntries) {
      if (!child.isFile() || !child.name.endsWith('.md')) {
        continue;
      }

      const childPath = path.join(absolutePath, child.name);
      const relativePath = toPosixPath(path.relative(docsRoot, childPath));
      const title = await readDocTitle(childPath, child.name.replace(/\.md$/i, ''));

      if (child.name.toLowerCase() === 'readme.md') {
        sectionTitle = title;
        sectionHref = buildDocHref(relativePath);
        continue;
      }

      sectionItems.push({ title, href: buildDocHref(relativePath) });
    }

    if (sectionItems.length > 0 || sectionHref) {
      sections.push({
        title: sectionTitle,
        href: sectionHref,
        items: sectionItems,
      });
    }
  }

  rootItems.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  sections.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  sections.forEach((section) => {
    section.items.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  });

  return { root: rootItems, sections };
};
