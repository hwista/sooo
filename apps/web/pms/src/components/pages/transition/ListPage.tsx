'use client';

import { useState, useCallback, useMemo } from 'react';
import { ListPageTemplate } from '@/components/templates';
import { useTabStore } from '@/stores';
import { ColumnDef } from '@tanstack/react-table';
import type { FilterValues } from '@/components/common/page/Header';
import { useCustomerList, useProjectList } from '@/hooks/queries';
import type { Project, ProjectFilters, ProjectStageCode } from '@/lib/api/endpoints/projects';
import { formatCustomerLookupLabel, formatProjectCustomerLabel, formatProjectExecutionAssetLabel } from '@/lib/project-display';
import { formatPmsDate } from '@/lib/pms-format';

const stageOptions: { label: string; value: ProjectStageCode }[] = [
  { label: '대기', value: 'waiting' },
  { label: '진행', value: 'in_progress' },
  { label: '완료', value: 'done' },
];

const stageLabels: Record<ProjectStageCode, string> = {
  waiting: '대기',
  in_progress: '진행',
  done: '완료',
};

const columns: ColumnDef<Project>[] = [
  {
    accessorKey: 'id',
    header: '전환번호',
    size: 130,
    cell: ({ row }) => `TRN-${String(row.original.id).padStart(6, '0')}`,
  },
  {
    accessorKey: 'projectName',
    header: '프로젝트명',
    size: 220,
  },
  {
    id: 'customer',
    header: '고객사',
    size: 180,
    cell: ({ row }) => formatProjectCustomerLabel(row.original),
  },
  {
    id: 'executionAsset',
    header: '실행 자산',
    size: 220,
    cell: ({ row }) => formatProjectExecutionAssetLabel(row.original),
  },
  {
    accessorKey: 'stageCode',
    header: '단계',
    size: 90,
    cell: ({ row }) => {
      const stage = row.original.stageCode;
      const colorMap: Record<ProjectStageCode, string> = {
        waiting: 'bg-ssoo-warning-bg text-ssoo-warning',
        in_progress: 'bg-ssoo-info-bg text-ssoo-info',
        done: 'bg-ssoo-success-bg text-ssoo-success',
      };
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${colorMap[stage]}`}>
          {stageLabels[stage]}
        </span>
      );
    },
  },
  {
    id: 'transitionDueAt',
    header: '전환 마감일',
    size: 120,
    cell: ({ row }) => formatPmsDate(row.original.transitionDetail?.transitionDueAt),
  },
  {
    id: 'operationOwnerUserId',
    header: '운영 담당자',
    size: 120,
    cell: ({ row }) => {
      const id = row.original.transitionDetail?.operationOwnerUserId;
      return id ? '담당 지정됨' : '담당 미지정';
    },
  },
  {
    accessorKey: 'createdAt',
    header: '등록일',
    size: 120,
    cell: ({ row }) => formatPmsDate(row.original.createdAt),
  },
];

export function TransitionListPage() {
  const { openTab } = useTabStore();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<ProjectFilters>({
    statusCode: 'transition',
  });

  const { data: response, isLoading, error, refetch } = useProjectList({
    ...filters,
    statusCode: 'transition',
    page,
    pageSize,
  });
  const { data: customersResponse } = useCustomerList({ page: 1, pageSize: 100 });

  const projects = useMemo(() => response?.data?.items ?? [], [response]);
  const total = response?.data?.total ?? 0;
  const apiError = response && !response.success
    ? new Error(response.message || '요청 처리 중 오류가 발생했습니다.')
    : null;
  const customerOptions = useMemo(() => (
    customersResponse?.data?.items.map((customer) => ({
      label: formatCustomerLookupLabel(customer),
      value: String(customer.id),
    })) ?? []
  ), [customersResponse]);

  const handleSearch = useCallback((values: FilterValues) => {
    setFilters({
      statusCode: 'transition',
      search: values.projectName?.trim() || undefined,
      stageCode: values.stageCode as ProjectStageCode | undefined,
      customerId: values.customerId || undefined,
    });
    setPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setFilters({ statusCode: 'transition' });
    setPage(1);
  }, []);

  const handleRowClick = useCallback((row: Project) => {
    openTab({
      menuCode: `project.detail`,
      menuId: `project.detail.${row.id}`,
      title: `PRJ-${String(row.id).padStart(6, '0')} ${row.projectName}`,
      path: '/project/detail',
      params: { id: String(row.id) },
    });
  }, [openTab]);

  return (
    <ListPageTemplate
      breadcrumb={['전환', '전환 목록']}
      header={{
        collapsible: true,
        filters: [
          { key: 'projectName', type: 'text', id: 'pms-transition-project-search-input', name: 'pms-transition-project-search-query', ariaLabel: '전환 프로젝트명 검색', placeholder: '프로젝트명' },
          { key: 'customerId', type: 'select', placeholder: '고객사', options: customerOptions, width: '240px' },
          { key: 'stageCode', type: 'select', placeholder: '단계', options: stageOptions },
        ],
        onSearch: handleSearch,
        onReset: handleReset,
      }}
      table={{
        columns,
        data: projects,
        loading: isLoading,
        error: apiError || error,
        onRetry: () => refetch(),
        onRowClick: handleRowClick,
        getRowId: (row) => row.id,
        headerClassName: 'bg-ssoo-content-bg',
        headerCellClassName: 'bg-ssoo-content-bg',
        pagination: {
          page,
          pageSize,
          total,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        },
      }}
    />
  );
}
