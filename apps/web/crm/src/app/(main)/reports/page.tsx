import { ReportsPreviewWorkspace } from '@/components/pages/reports/ReportsPreviewWorkspace';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <ReportsPreviewWorkspace query={params} />;
}
