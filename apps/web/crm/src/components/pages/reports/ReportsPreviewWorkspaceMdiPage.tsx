'use client';

import { ReportsPreviewWorkspaceClient, normalizeReportsPreviewQuery } from './ReportsPreviewWorkspaceClient';
import { reportsPreviewFallback } from './reportsPreviewFallback';

export function ReportsPreviewWorkspaceMdiPage({ path }: { path: string }) {
  return <ReportsPreviewWorkspaceClient data={reportsPreviewFallback} query={normalizeReportsPreviewQuery(path)} />;
}
