import { CostPlanPreviewWorkspace } from '@/components/pages/cost-plan/CostPlanPreviewWorkspace';

export default async function CostPlanPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <CostPlanPreviewWorkspace query={params} />;
}
