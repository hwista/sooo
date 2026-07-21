'use client';

import { BusinessPlanPreviewWorkspaceClient, normalizeBusinessPlanPreviewQuery } from './BusinessPlanPreviewWorkspaceClient';
import { businessPlanPreviewFallback } from './businessPlanPreviewFallback';

export function BusinessPlanPreviewWorkspaceMdiPage({ path }: { path: string }) {
  return <BusinessPlanPreviewWorkspaceClient data={businessPlanPreviewFallback} query={normalizeBusinessPlanPreviewQuery(path)} />;
}
