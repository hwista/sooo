import type { CrmBusinessPlanPreviewQuery, CrmBusinessPlanPreviewRegion } from '@ssoo/types/crm';

export interface BusinessPlanPreviewWorkspaceQuery {
  baseYear: number;
  businessType: string;
  industryLine: string;
  region: CrmBusinessPlanPreviewRegion;
  search: string;
  mode: 'operations' | 'source-compatible';
}

export function normalizeBusinessPlanPreviewQuery(path: string): BusinessPlanPreviewWorkspaceQuery {
  const [, queryString = ''] = path.split('?');
  const searchParams = new URLSearchParams(queryString);
  const baseYear = Number(searchParams.get('baseYear') ?? new Date().getFullYear());
  const region = searchParams.get('region') as CrmBusinessPlanPreviewRegion | null;
  return {
    baseYear: Number.isFinite(baseYear) && baseYear >= 2000 ? Math.trunc(baseYear) : new Date().getFullYear(),
    businessType: (searchParams.get('businessType') ?? '').trim(),
    industryLine: (searchParams.get('industryLine') ?? '').trim(),
    region: region && ['all', 'domestic', 'overseas'].includes(region) ? region : 'all',
    search: (searchParams.get('search') ?? '').trim(),
    mode: searchParams.get('mode') === 'source-compatible' ? 'source-compatible' : 'operations',
  };
}

export function toRequiredBusinessPlanPreviewQuery(
  query: BusinessPlanPreviewWorkspaceQuery,
): Required<CrmBusinessPlanPreviewQuery> {
  return {
    baseYear: query.baseYear,
    businessType: query.businessType,
    industryLine: query.industryLine,
    region: query.region,
    search: query.search,
  };
}

export function normalizeBusinessPlanPreviewQueryRecord(
  query: Record<string, string | string[] | undefined> = {},
): BusinessPlanPreviewWorkspaceQuery {
  const value = (key: string) => {
    const raw = query[key];
    return Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
  };
  const baseYear = Number(value('baseYear') || new Date().getFullYear());
  const region = value('region') as CrmBusinessPlanPreviewRegion;
  return {
    baseYear: Number.isFinite(baseYear) && baseYear >= 2000 ? Math.trunc(baseYear) : new Date().getFullYear(),
    businessType: value('businessType').trim(),
    industryLine: value('industryLine').trim(),
    region: ['all', 'domestic', 'overseas'].includes(region) ? region : 'all',
    search: value('search').trim(),
    mode: value('mode') === 'source-compatible' ? 'source-compatible' : 'operations',
  };
}
