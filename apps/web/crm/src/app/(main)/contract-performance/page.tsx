import { ContractPerformanceWorkspace } from '@/components/pages/contracts/ContractPerformanceWorkspace';

export default async function ContractPerformancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <ContractPerformanceWorkspace query={params} />;
}
