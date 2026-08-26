import type { CrmOperationsPreviewResponse } from '@ssoo/types/crm';
import { OperationsPreviewWorkspaceClient } from './OperationsPreviewWorkspaceClient';
import {
  normalizeOperationsPreviewQueryRecord,
  toRequiredOperationsPreviewQuery,
} from './operationsPreviewQuery';
import { operationsPreviewFallback } from './operationsPreviewFallback';

const API_BASE_URL = process.env.CRM_SERVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function loadOperationsPreview(query: ReturnType<typeof toRequiredOperationsPreviewQuery>): Promise<CrmOperationsPreviewResponse> {
  try {
    const params = new URLSearchParams();
    params.set('year', String(query.year));
    const response = await fetch(`${API_BASE_URL}/crm/operations/preview?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) return operationsPreviewFallback;
    const payload = await response.json();
    return payload?.data ?? operationsPreviewFallback;
  } catch {
    return operationsPreviewFallback;
  }
}

export async function OperationsPreviewWorkspace({ query = {} }: { query?: Record<string, string | string[] | undefined> }) {
  const normalizedQuery = normalizeOperationsPreviewQueryRecord(query);
  const data = await loadOperationsPreview(toRequiredOperationsPreviewQuery(normalizedQuery));

  return <OperationsPreviewWorkspaceClient data={data} query={normalizedQuery} />;
}
