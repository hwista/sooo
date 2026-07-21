import { ContractWorkspace } from '@/components/pages/contracts/ContractWorkspace';

export default async function ContractsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <ContractWorkspace query={params} />;
}
