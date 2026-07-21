'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import {
  SsooDataGrid,
  SsooDataWorkspacePage,
  type SsooDataGridColumnDef,
  type SsooDataWorkspaceFilterValues,
} from '@ssoo/web-shell';
import { useTabStore } from '@/stores';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCustomerList, useProjectList, useProjectMembers } from '@/hooks/queries';
import type { Project, ProjectFilters, ProjectRequestDetail, ProjectStageCode, ProjectStatusCode } from '@/lib/api/endpoints/projects';
import { formatCustomerLookupLabel, formatProjectCustomerLabel, formatProjectExecutionAssetLabel } from '@/lib/project-display';
import { formatPmsDate } from '@/lib/pms-format';
import { formatProjectMemberOwnerLabel } from '@/components/pages/project/tabs/ProjectMemberOwnerSelect';

const stageOptions: { label: string; value: ProjectStageCode }[] = [
  { label: '대기', value: 'waiting' },
  { label: '진행', value: 'in_progress' },
  { label: '완료', value: 'done' },
];

const statusLabels: Record<ProjectStatusCode, string> = {
  request: '요청',
  proposal: '제안',
  execution: '수행',
  transition: '전환',
};

const stageLabels: Record<ProjectStageCode, string> = {
  waiting: '대기',
  in_progress: '진행',
  done: '완료',
};

type RequestDetailRow = ProjectRequestDetail & {
  requestOwnerLabel: string;
};

const columns: SsooDataGridColumnDef<Project>[] = [
  {
    accessorKey: 'id',
    header: '요청번호',
    size: 100,
    cell: ({ row }) => {
      const label = `REQ-${String(row.original.id).padStart(6, '0')}`;
      return (
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-label-md font-medium text-ssoo-primary"
          onClick={(e) => {
            e.stopPropagation();
            const { openTab } = useTabStore.getState();
            openTab({
              menuCode: 'project.detail',
              menuId: `project.detail.${row.original.id}`,
              title: `PRJ-${String(row.original.id).padStart(6, '0')} ${row.original.projectName}`,
              path: '/project/detail',
              params: { id: String(row.original.id) },
            });
          }}
        >
          {label}
        </Button>
      );
    },
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
    accessorKey: 'statusCode',
    header: '상태',
    size: 90,
    cell: ({ row }) => {
      const status = row.original.statusCode;
      return (
        <Badge variant="outline" className="rounded border-transparent bg-ssoo-info-bg px-2 py-1 text-xs font-medium text-ssoo-info">
          {statusLabels[status]}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'stageCode',
    header: '단계',
    size: 90,
    cell: ({ row }) => {
      const stage = row.original.stageCode;
      const colorMap: Record<ProjectStageCode, string> = {
        waiting: 'bg-ssoo-warning-bg text-ssoo-warning',
        in_progress: 'bg-ssoo-success-bg text-ssoo-success',
        done: 'bg-muted text-foreground',
      };
      return (
        <Badge variant="outline" className={`rounded border-transparent px-2 py-1 text-xs font-medium ${colorMap[stage]}`}>
          {stageLabels[stage]}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: '요청일',
    size: 130,
    cell: ({ row }) => formatPmsDate(row.original.createdAt),
  },
];

const detailColumns: SsooDataGridColumnDef<RequestDetailRow>[] = [
  {
    accessorKey: 'requestSourceCode',
    header: '요청구분',
    size: 120,
    cell: ({ row }) => row.original.requestSourceCode || '-',
  },
  {
    accessorKey: 'requestChannelCode',
    header: '접수채널',
    size: 120,
    cell: ({ row }) => row.original.requestChannelCode || '-',
  },
  {
    accessorKey: 'requestSummary',
    header: '요약',
    size: 240,
    cell: ({ row }) => row.original.requestSummary || '-',
  },
  {
    accessorKey: 'requestReceivedAt',
    header: '접수일',
    size: 140,
    cell: ({ row }) => formatPmsDate(row.original.requestReceivedAt),
  },
  {
    accessorKey: 'requestPriorityCode',
    header: '우선순위',
    size: 120,
    cell: ({ row }) => row.original.requestPriorityCode || '-',
  },
  {
    accessorKey: 'requestOwnerLabel',
    header: '담당자',
    size: 140,
    cell: ({ row }) => row.original.requestOwnerLabel,
  },
  {
    accessorKey: 'memo',
    header: '메모',
    size: 240,
    cell: ({ row }) => row.original.memo || '-',
  },
];

export function RequestListPage() {
  const { openTab } = useTabStore();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<ProjectFilters>({
    statusCode: 'request',
  });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSecondGridOpen, setIsSecondGridOpen] = useState(false);

  const { data: response, isLoading, error, refetch } = useProjectList({
    ...filters,
    statusCode: 'request',
    page,
    pageSize,
  });
  const { data: customersResponse } = useCustomerList({ page: 1, pageSize: 100 });
  const selectedProjectId = selectedProject ? Number(selectedProject.id) : 0;
  const { data: selectedProjectMembersResponse } = useProjectMembers(selectedProjectId);

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

  const selectedProjectMembers = useMemo(
    () => selectedProjectMembersResponse?.data ?? [],
    [selectedProjectMembersResponse],
  );

  const detailRows = useMemo<RequestDetailRow[]>(() => {
    if (!selectedProject) {
      return [];
    }
    const detail = selectedProject.requestDetail;
    const fallbackDate = new Date(selectedProject.createdAt).toISOString();
    const requestOwnerUserId = detail?.requestOwnerUserId ?? selectedProject.currentOwnerUserId ?? null;

    return [
      {
        requestSourceCode: detail?.requestSourceCode ?? 'RFP',
        requestChannelCode: detail?.requestChannelCode ?? 'email',
        requestSummary: detail?.requestSummary ?? `${selectedProject.projectName} 요청`,
        requestReceivedAt: detail?.requestReceivedAt ?? fallbackDate,
        requestPriorityCode: detail?.requestPriorityCode ?? 'normal',
        requestOwnerUserId,
        requestOwnerLabel: formatProjectMemberOwnerLabel(selectedProjectMembers, requestOwnerUserId),
        memo: detail?.memo ?? selectedProject.memo ?? '요청 상세 테스트 데이터',
      },
    ];
  }, [selectedProject, selectedProjectMembers]);

  const handleCreate = () => {
    openTab({
      menuCode: 'request.create',
      menuId: 'request.create',
      title: '요청 등록',
      path: '/request/create',
    });
  };

  const handleSearch = useCallback((values: SsooDataWorkspaceFilterValues) => {
    const nextFilters: ProjectFilters = {
      statusCode: 'request',
      search: values.projectName?.trim() || undefined,
      stageCode: values.stageCode as ProjectStageCode | undefined,
      customerId: values.customerId || undefined,
    };

    setFilters(nextFilters);
    setPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setFilters({ statusCode: 'request' });
    setPage(1);
  }, []);

  const handleRowClick = useCallback((row: Project) => {
    setSelectedProject(row);
    setIsSecondGridOpen(true);
  }, []);

  return (
    <SsooDataWorkspacePage
      breadcrumb={['요청', '요청 목록']}
      toolbar={{
        collapsible: true,
        actions: [
          {
            label: '등록',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleCreate,
          },
        ],
        filters: [
          { key: 'projectName', type: 'text', placeholder: '프로젝트명' },
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
        selectedRowId: selectedProject?.id ?? null,
        headerClassName: 'bg-ssoo-content-bg',
        headerCellClassName: 'bg-ssoo-content-bg',
        secondGrid: {
          enabled: true,
          content: (
            <SsooDataGrid
              columns={detailColumns}
              data={detailRows}
              loading={false}
              className="h-full"
              tableClassName="h-full"
              headerClassName="bg-ssoo-content-bg"
              headerCellClassName="bg-ssoo-content-bg"
              emptyState={<div className="text-center text-sm text-muted-foreground">행을 선택하세요.</div>}
            />
          ),
          defaultOpen: Boolean(selectedProject),
          isOpen: isSecondGridOpen,
          onOpenChange: setIsSecondGridOpen,
        },
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
