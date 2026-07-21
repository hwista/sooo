import type { CrmReportsPreviewResponse } from '@ssoo/types/crm';
import {
  ReportsPreviewWorkspaceClient,
  normalizeReportsPreviewQueryRecord,
  toRequiredReportsPreviewQuery,
} from './ReportsPreviewWorkspaceClient';
import { reportsPreviewFallback } from './reportsPreviewFallback';

const API_BASE_URL = process.env.CRM_SERVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function loadReportsPreview(query: ReturnType<typeof toRequiredReportsPreviewQuery>): Promise<CrmReportsPreviewResponse> {
  try {
    const params = new URLSearchParams();
    params.set('year', String(query.year));
    if (query.businessType) params.set('businessType', query.businessType);
    if (query.industryLine) params.set('industryLine', query.industryLine);
    if (query.region !== 'all') params.set('region', query.region);
    if (query.search) params.set('search', query.search);
    const response = await fetch(`${API_BASE_URL}/crm/reports/preview?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) return reportsPreviewFallback;
    const payload = await response.json();
    return payload?.data ?? reportsPreviewFallback;
  } catch {
    return reportsPreviewFallback;
  }
}

export async function ReportsPreviewWorkspace({ query = {} }: { query?: Record<string, string | string[] | undefined> }) {
  const normalizedQuery = normalizeReportsPreviewQueryRecord(query);
  const data = await loadReportsPreview(toRequiredReportsPreviewQuery(normalizedQuery));

  return <ReportsPreviewWorkspaceClient data={data} query={normalizedQuery} />;
}
