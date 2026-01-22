/**
 * React Query Hooks
 *
 * 데이터 페칭 및 캐싱을 위한 커스텀 훅
 *
 * 사용 예시:
 * ```tsx
 * import { useProjectList, useCreateProject } from '@/hooks/queries';
 *
 * function ProjectListPage() {
 *   const { data, isLoading, error } = useProjectList({ status: 'active' });
 *   const createMutation = useCreateProject();
 *
 *   if (isLoading) return <LoadingState />;
 *   if (error) return <ErrorState message={error.message} />;
 *
 *   return <DataTable data={data?.data?.items ?? []} />;
 * }
 * ```
 */

export * from './useProjects';
export * from './useMenus';

// 추후 추가
// export * from './useCustomers';
// export * from './useUsers';
