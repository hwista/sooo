'use client';

import { ContractPerformanceWorkspaceClient, normalizeContractPerformanceQuery } from './ContractPerformanceWorkspaceClient';
import { contractPerformanceFallback } from './contractPerformanceFallback';

export function ContractPerformanceWorkspaceMdiPage({ path }: { path: string }) {
  return <ContractPerformanceWorkspaceClient data={contractPerformanceFallback} query={normalizeContractPerformanceQuery(path)} />;
}
