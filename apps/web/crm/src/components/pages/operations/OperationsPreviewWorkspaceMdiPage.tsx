'use client';

import { OperationsPreviewWorkspaceClient } from './OperationsPreviewWorkspaceClient';
import { operationsPreviewFallback } from './operationsPreviewFallback';
import { normalizeOperationsPreviewQuery } from './operationsPreviewQuery';

export function OperationsPreviewWorkspaceMdiPage({ path }: { path: string }) {
  return <OperationsPreviewWorkspaceClient data={operationsPreviewFallback} query={normalizeOperationsPreviewQuery(path)} />;
}
