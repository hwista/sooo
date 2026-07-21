import type { CrmBusinessPlanPreviewResponse } from '@ssoo/types/crm';
import {
  BusinessPlanPreviewWorkspaceClient,
  normalizeBusinessPlanPreviewQueryRecord,
  toRequiredBusinessPlanPreviewQuery,
} from './BusinessPlanPreviewWorkspaceClient';
import { businessPlanPreviewFallback } from './businessPlanPreviewFallback';

const API_BASE_URL = process.env.CRM_SERVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function loadBusinessPlanPreview(query: ReturnType<typeof toRequiredBusinessPlanPreviewQuery>): Promise<CrmBusinessPlanPreviewResponse> {
  try {
    const params = new URLSearchParams();
    params.set('baseYear', String(query.baseYear));
    if (query.businessType) params.set('businessType', query.businessType);
    if (query.industryLine) params.set('industryLine', query.industryLine);
    if (query.region !== 'all') params.set('region', query.region);
    if (query.search) params.set('search', query.search);
    const response = await fetch(`${API_BASE_URL}/crm/business-plan/preview?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) return businessPlanPreviewFallback;
    const payload = await response.json();
    return payload?.data ?? businessPlanPreviewFallback;
  } catch {
    return businessPlanPreviewFallback;
  }
}

export async function BusinessPlanPreviewWorkspace({ query = {} }: { query?: Record<string, string | string[] | undefined> }) {
  const normalizedQuery = normalizeBusinessPlanPreviewQueryRecord(query);
  const data = await loadBusinessPlanPreview(toRequiredBusinessPlanPreviewQuery(normalizedQuery));

  return <BusinessPlanPreviewWorkspaceClient data={data} query={normalizedQuery} />;
}
