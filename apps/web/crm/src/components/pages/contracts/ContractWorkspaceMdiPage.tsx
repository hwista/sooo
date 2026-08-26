'use client';

import type { CrmContractSort, CrmContractStatus } from '@ssoo/types/crm';
import { ContractWorkspaceClient, type ContractWorkspaceQuery } from './ContractWorkspaceClient';
import { contractFallback } from './contractWorkspaceFallback';

function normalizeQuery(path: string): ContractWorkspaceQuery {
  const [, queryString = ''] = path.split('?');
  const searchParams = new URLSearchParams(queryString);
  const status = searchParams.get('status') as CrmContractStatus | 'all' | null;
  const sort = searchParams.get('sort') as CrmContractSort | null;
  const sourceSurface = searchParams.get('sourceSurface');

  return {
    search: (searchParams.get('search') ?? '').trim(),
    status: status && ['review', 'active', 'completed', 'terminated'].includes(status) ? status : 'all',
    sort: sort && ['revenue-desc', 'margin-desc', 'start-asc'].includes(sort) ? sort : 'updated-desc',
    selected: searchParams.get('selected') ?? '',
    sourceSurface: sourceSurface && ['list', 'form', 'billing-actual'].includes(sourceSurface)
      ? sourceSurface as ContractWorkspaceQuery['sourceSurface']
      : '',
    billingView: searchParams.get('view') === 'list' ? 'list' : 'detail',
    create: searchParams.get('create') === 'contract',
  };
}

export function ContractWorkspaceMdiPage({ path, active }: { path: string; active: boolean }) {
  return <ContractWorkspaceClient data={contractFallback} query={normalizeQuery(path)} active={active} />;
}
