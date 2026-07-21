import type {
  CrmCustomerListResponse,
  CrmCustomerSort,
  CrmCustomerType,
} from '@ssoo/types/crm';
import { CustomerWorkspaceClient, type CustomerWorkspaceQuery } from './CustomerWorkspaceClient';
import { customerFallback } from './customerWorkspaceFallback';

const API_BASE_URL = process.env.CRM_SERVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function normalizeQuery(query: Record<string, string | string[] | undefined> = {}): CustomerWorkspaceQuery {
  const value = (key: string) => {
    const raw = query[key];
    return Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
  };
  const type = value('type') as CrmCustomerType | 'all';
  const sort = value('sort') as CrmCustomerSort;

  return {
    search: value('search').trim(),
    type: ['prospect', 'active', 'partner', 'inactive'].includes(type) ? type : 'all',
    sort: ['activity-desc', 'name-asc'].includes(sort) ? sort : 'updated-desc',
    selected: value('selected'),
  };
}

async function loadCustomers(query: CustomerWorkspaceQuery): Promise<CrmCustomerListResponse> {
  try {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.type !== 'all') params.set('type', query.type);
    if (query.sort !== 'updated-desc') params.set('sort', query.sort);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/crm/customers${suffix}`, { cache: 'no-store' });
    if (!response.ok) return customerFallback;
    const payload = await response.json();
    return payload?.data ?? customerFallback;
  } catch {
    return customerFallback;
  }
}

export async function CustomerWorkspace({ query = {} }: { query?: Record<string, string | string[] | undefined> }) {
  const normalizedQuery = normalizeQuery(query);
  const data = await loadCustomers(normalizedQuery);

  return <CustomerWorkspaceClient data={data} query={normalizedQuery} />;
}
