'use client';

import { BusinessPlanPerformancePreviewWorkspaceClient } from './BusinessPlanPerformancePreviewWorkspaceClient';
import { businessPlanPerformancePreviewFallback } from './businessPlanPerformancePreviewFallback';
import { normalizeBusinessPlanPerformancePreviewQuery } from './businessPlanPerformancePreviewQuery';

export function BusinessPlanPerformancePreviewWorkspaceMdiPage({ path }: { path: string }) {
  return (
    <BusinessPlanPerformancePreviewWorkspaceClient
      data={businessPlanPerformancePreviewFallback}
      query={normalizeBusinessPlanPerformancePreviewQuery(path)}
    />
  );
}
