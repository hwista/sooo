'use client';

import { OperationsPreviewWorkspaceClient, normalizeOperationsPreviewQuery } from './OperationsPreviewWorkspaceClient';
import { operationsPreviewFallback } from './operationsPreviewFallback';

export function OperationsPreviewWorkspaceMdiPage({ path }: { path: string }) {
  return <OperationsPreviewWorkspaceClient data={operationsPreviewFallback} query={normalizeOperationsPreviewQuery(path)} />;
}
