import type { CrmOperationsPreviewQuery } from '@ssoo/types/crm';

export interface OperationsPreviewWorkspaceQuery {
  year: number;
}

export function normalizeOperationsPreviewQuery(path: string): OperationsPreviewWorkspaceQuery {
  const [, queryString = ''] = path.split('?');
  const searchParams = new URLSearchParams(queryString);
  const year = Number(searchParams.get('year') ?? new Date().getFullYear());
  return {
    year: Number.isFinite(year) && year >= 2000 ? Math.trunc(year) : new Date().getFullYear(),
  };
}

export function toRequiredOperationsPreviewQuery(query: OperationsPreviewWorkspaceQuery): Required<CrmOperationsPreviewQuery> {
  return { year: query.year };
}

export function normalizeOperationsPreviewQueryRecord(
  query: Record<string, string | string[] | undefined> = {},
): OperationsPreviewWorkspaceQuery {
  const raw = query.year;
  const value = Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
  const year = Number(value || new Date().getFullYear());
  return {
    year: Number.isFinite(year) && year >= 2000 ? Math.trunc(year) : new Date().getFullYear(),
  };
}

