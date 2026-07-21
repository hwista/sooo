'use client';

import type { CrmContractSort, CrmContractStatus } from '@ssoo/types/crm';
import { ContractWorkspaceClient, type ContractWorkspaceQuery } from './ContractWorkspaceClient';
import { contractFallback } from './contractWorkspaceFallback';

function normalizeQuery(path: string): ContractWorkspaceQuery {
  const [, queryString = ''] = path.split('?');
  const searchParams = new URLSearchParams(queryString);
  const status = searchParams.get('status') as CrmContractStatus | 'all' | null;
  const sort = searchParams.get('sort') as CrmContractSort | null;

  return {
    search: (searchParams.get('search') ?? '').trim(),
    status: status && ['review', 'active', 'completed', 'terminated'].includes(status) ? status : 'all',
    sort: sort && ['revenue-desc', 'margin-desc', 'start-asc'].includes(sort) ? sort : 'updated-desc',
    selected: searchParams.get('selected') ?? '',
  };
}

export function ContractWorkspaceMdiPage({ path }: { path: string }) {
  return <ContractWorkspaceClient data={contractFallback} query={normalizeQuery(path)} />;
}
