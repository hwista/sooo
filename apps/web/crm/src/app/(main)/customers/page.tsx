import { CustomerWorkspace } from '@/components/pages/customers/CustomerWorkspace';

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <CustomerWorkspace query={params} />;
}
