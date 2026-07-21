'use client';

import { CostPlanPreviewWorkspaceClient, normalizeCostPlanPreviewQuery } from './CostPlanPreviewWorkspaceClient';
import { costPlanPreviewFallback } from './costPlanPreviewFallback';

export function CostPlanPreviewWorkspaceMdiPage({ path }: { path: string }) {
  return <CostPlanPreviewWorkspaceClient data={costPlanPreviewFallback} query={normalizeCostPlanPreviewQuery(path)} />;
}
