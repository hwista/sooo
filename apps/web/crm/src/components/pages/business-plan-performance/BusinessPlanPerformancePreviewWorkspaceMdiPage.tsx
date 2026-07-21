'use client';

import { BusinessPlanPerformancePreviewWorkspaceClient, normalizeBusinessPlanPerformancePreviewQuery } from './BusinessPlanPerformancePreviewWorkspaceClient';
import { businessPlanPerformancePreviewFallback } from './businessPlanPerformancePreviewFallback';

export function BusinessPlanPerformancePreviewWorkspaceMdiPage({ path }: { path: string }) {
  return (
    <BusinessPlanPerformancePreviewWorkspaceClient
      data={businessPlanPerformancePreviewFallback}
      query={normalizeBusinessPlanPerformancePreviewQuery(path)}
    />
  );
}
