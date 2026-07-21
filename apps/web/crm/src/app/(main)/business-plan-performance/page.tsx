import { BusinessPlanPerformancePreviewWorkspace } from '@/components/pages/business-plan-performance/BusinessPlanPerformancePreviewWorkspace';

export default async function BusinessPlanPerformancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <BusinessPlanPerformancePreviewWorkspace query={params} />;
}
