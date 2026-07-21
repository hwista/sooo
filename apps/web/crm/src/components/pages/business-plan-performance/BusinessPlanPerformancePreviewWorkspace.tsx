import type { CrmBusinessPlanPerformanceResponse } from '@ssoo/types/crm';
import {
  BusinessPlanPerformancePreviewWorkspaceClient,
  normalizeBusinessPlanPerformancePreviewQueryRecord,
  toRequiredBusinessPlanPerformancePreviewQuery,
} from './BusinessPlanPerformancePreviewWorkspaceClient';
import { businessPlanPerformancePreviewFallback } from './businessPlanPerformancePreviewFallback';

const API_BASE_URL = process.env.CRM_SERVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function loadBusinessPlanPerformancePreview(
  query: ReturnType<typeof toRequiredBusinessPlanPerformancePreviewQuery>,
): Promise<CrmBusinessPlanPerformanceResponse> {
  try {
    const params = new URLSearchParams();
    params.set('year', String(query.year));
    if (query.businessType) params.set('businessType', query.businessType);
    if (query.industryLine) params.set('industryLine', query.industryLine);
    if (query.region !== 'all') params.set('region', query.region);
    if (query.search) params.set('search', query.search);
    const response = await fetch(`${API_BASE_URL}/crm/business-plan/performance-preview?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) return businessPlanPerformancePreviewFallback;
    const payload = await response.json();
    return payload?.data ?? businessPlanPerformancePreviewFallback;
  } catch {
    return businessPlanPerformancePreviewFallback;
  }
}

export async function BusinessPlanPerformancePreviewWorkspace({ query = {} }: { query?: Record<string, string | string[] | undefined> }) {
  const normalizedQuery = normalizeBusinessPlanPerformancePreviewQueryRecord(query);
  const data = await loadBusinessPlanPerformancePreview(toRequiredBusinessPlanPerformancePreviewQuery(normalizedQuery));

  return <BusinessPlanPerformancePreviewWorkspaceClient data={data} query={normalizedQuery} />;
}
