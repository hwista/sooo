'use client';

import type { CrmCustomerSort, CrmCustomerType } from '@ssoo/types/crm';
import { CustomerWorkspaceClient, type CustomerWorkspaceQuery } from './CustomerWorkspaceClient';
import { customerFallback } from './customerWorkspaceFallback';

function normalizeQuery(path: string): CustomerWorkspaceQuery {
  const [, queryString = ''] = path.split('?');
  const searchParams = new URLSearchParams(queryString);
  const type = searchParams.get('type') as CrmCustomerType | 'all' | null;
  const sort = searchParams.get('sort') as CrmCustomerSort | null;

  return {
    search: (searchParams.get('search') ?? '').trim(),
    type: type && ['prospect', 'active', 'partner', 'inactive'].includes(type) ? type : 'all',
    sort: sort && ['activity-desc', 'name-asc'].includes(sort) ? sort : 'updated-desc',
    selected: searchParams.get('selected') ?? '',
  };
}

export function CustomerWorkspaceMdiPage({ path }: { path: string }) {
  return <CustomerWorkspaceClient data={customerFallback} query={normalizeQuery(path)} />;
}
