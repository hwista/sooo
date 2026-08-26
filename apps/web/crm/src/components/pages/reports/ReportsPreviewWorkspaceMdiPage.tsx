'use client';

import { ReportsPreviewWorkspaceClient } from './ReportsPreviewWorkspaceClient';
import { normalizeReportsPreviewQuery } from './reportsPreviewQuery';
import { reportsPreviewFallback } from './reportsPreviewFallback';

export function ReportsPreviewWorkspaceMdiPage({ path }: { path: string }) {
  return <ReportsPreviewWorkspaceClient data={reportsPreviewFallback} query={normalizeReportsPreviewQuery(path)} />;
}
