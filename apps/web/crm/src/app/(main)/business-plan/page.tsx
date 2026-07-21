import { BusinessPlanPreviewWorkspace } from '@/components/pages/business-plan/BusinessPlanPreviewWorkspace';

export default async function BusinessPlanPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <BusinessPlanPreviewWorkspace query={params} />;
}
