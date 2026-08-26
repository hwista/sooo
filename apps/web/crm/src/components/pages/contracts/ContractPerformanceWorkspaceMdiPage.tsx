'use client';

import { ContractPerformanceWorkspaceClient } from './ContractPerformanceWorkspaceClient';
import { normalizeContractPerformanceQuery } from './contractPerformanceQuery';
import { contractPerformanceFallback } from './contractPerformanceFallback';

export function ContractPerformanceWorkspaceMdiPage({ path }: { path: string }) {
  return <ContractPerformanceWorkspaceClient data={contractPerformanceFallback} query={normalizeContractPerformanceQuery(path)} />;
}
