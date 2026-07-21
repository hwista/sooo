import { OperationsPreviewWorkspace } from '@/components/pages/operations/OperationsPreviewWorkspace';

export default async function OperationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <OperationsPreviewWorkspace query={params} />;
}
