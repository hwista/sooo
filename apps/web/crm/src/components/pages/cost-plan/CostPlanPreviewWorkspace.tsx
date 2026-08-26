import type { CrmCostPlanPreviewResponse } from '@ssoo/types/crm';
import { CostPlanPreviewWorkspaceClient } from './CostPlanPreviewWorkspaceClient';
import { normalizeCostPlanPreviewQueryRecord, toRequiredCostPlanPreviewQuery } from './costPlanPreviewQuery';
import { costPlanPreviewFallback } from './costPlanPreviewFallback';

const API_BASE_URL = process.env.CRM_SERVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function loadCostPlanPreview(query: ReturnType<typeof toRequiredCostPlanPreviewQuery>): Promise<CrmCostPlanPreviewResponse> {
  try {
    const params = new URLSearchParams();
    params.set('year', String(query.year));
    if (query.businessType) params.set('businessType', query.businessType);
    if (query.industryLine) params.set('industryLine', query.industryLine);
    if (query.region !== 'all') params.set('region', query.region);
    if (query.search) params.set('search', query.search);
    const response = await fetch(`${API_BASE_URL}/crm/cost-plan/preview?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) return costPlanPreviewFallback;
    const payload = await response.json();
    return payload?.data ?? costPlanPreviewFallback;
  } catch {
    return costPlanPreviewFallback;
  }
}

export async function CostPlanPreviewWorkspace({ query = {} }: { query?: Record<string, string | string[] | undefined> }) {
  const normalizedQuery = normalizeCostPlanPreviewQueryRecord(query);
  const data = await loadCostPlanPreview(toRequiredCostPlanPreviewQuery(normalizedQuery));

  return <CostPlanPreviewWorkspaceClient data={data} query={normalizedQuery} />;
}
