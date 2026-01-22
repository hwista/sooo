import path from 'path';
import { marked } from 'marked';

const DOCS_ROUTE_PREFIX = '/docs';

const isExternalLink = (href: string) =>
  /^(https?:)?\/\//i.test(href) || href.startsWith('mailto:');

const normalizeDocHref = (currentDir: string, href: string) => {
  const [rawPath, hash] = href.split('#');
  const resolvedPath = path.posix.normalize(
    path.posix.join('/', currentDir || '', rawPath || ''),
  );
  const normalized = resolvedPath
    .replace(/^\/+/, '')
    .replace(/\.mdx?$/i, '');
  const anchor = hash ? `#${hash}` : '';
  return `${DOCS_ROUTE_PREFIX}/${normalized}${anchor}`;
};

export const renderMarkdown = (markdown: string, currentDir: string) => {
  const renderer = new marked.Renderer();

  renderer.link = (href, title, text) => {
    if (!href) {
      return text;
    }

    const normalizedHref = isExternalLink(href) || href.startsWith('/') || href.startsWith('#')
      ? href
      : normalizeDocHref(currentDir, href);

    const titleAttribute = title ? ` title="${title}"` : '';
    const target = isExternalLink(href) ? ' target="_blank" rel="noreferrer"' : '';

    return `<a href="${normalizedHref}"${titleAttribute}${target}>${text}</a>`;
  };

  renderer.image = (href, title, text) => {
    if (!href) {
      return text || '';
    }

    const normalizedHref = href.startsWith('/') || isExternalLink(href)
      ? href
      : normalizeDocHref(currentDir, href);
    const titleAttribute = title ? ` title="${title}"` : '';
    const altAttribute = text ? ` alt="${text}"` : '';

    return `<img src="${normalizedHref}"${altAttribute}${titleAttribute} />`;
  };

  return marked.parse(markdown, { renderer }) as string;
};
