'use client';

import { CostPlanPreviewWorkspaceClient } from './CostPlanPreviewWorkspaceClient';
import { normalizeCostPlanPreviewQuery } from './costPlanPreviewQuery';
import { costPlanPreviewFallback } from './costPlanPreviewFallback';

export function CostPlanPreviewWorkspaceMdiPage({ path }: { path: string }) {
  return <CostPlanPreviewWorkspaceClient data={costPlanPreviewFallback} query={normalizeCostPlanPreviewQuery(path)} />;
}
