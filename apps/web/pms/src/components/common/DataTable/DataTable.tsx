'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Table as ReactTable,
} from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorState, LoadingState } from '../StateDisplay';
import { DataTableToolbar } from './DataTableToolbar';
import { DataTableBody } from './DataTableBody';
import { DataTableFooter } from './DataTableFooter';

/**
 * DataTable Props
 */
export interface DataTableProps<TData, TValue> {
  /** 컬럼 정의 */
  columns: ColumnDef<TData, TValue>[];
  /** 데이터 배열 */
  data: TData[];
  /** 로딩 상태 */
  loading?: boolean;
  /** 에러 */
  error?: Error | string | null;
  /** 재시도 핸들러 */
  onRetry?: () => void;
  /** 행 클릭 핸들러 */
  onRowClick?: (row: TData) => void;
  /** 선택 활성화 */
  enableRowSelection?: boolean;
  /** 선택된 행 변경 핸들러 */
  onSelectionChange?: (selectedRows: TData[]) => void;
  /** 검색 활성화 */
  enableSearch?: boolean;
  /** 검색 필드 (검색 대상 컬럼 accessorKey) */
  searchField?: string;
  /** 검색 placeholder */
  searchPlaceholder?: string;
  /** 컬럼 숨김 활성화 */
  enableColumnVisibility?: boolean;
  /** 정렬 활성화 */
  enableSorting?: boolean;
  /** 페이지네이션 - 서버 사이드 */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  /** 페이지네이션 - 클라이언트 사이드 */
  enableClientPagination?: boolean;
  /** 빈 상태 커스텀 */
  emptyState?: React.ReactNode;
  /** 테이블 wrapper className */
  className?: string;
  /** 테이블 body className */
  tableClassName?: string;
}

/**
 * DataTable 컴포넌트
 * 
 * TanStack Table 기반의 데이터 테이블 컴포넌트입니다.
 * 정렬, 필터, 페이지네이션, 행 선택 등의 기능을 제공합니다.
 * 
 * @example
 * ```tsx
 * const columns: ColumnDef<User>[] = [
 *   { accessorKey: 'name', header: '이름' },
 *   { accessorKey: 'email', header: '이메일' },
 * ];
 * 
 * <DataTable
 *   columns={columns}
 *   data={users}
 *   loading={isLoading}
 *   onRowClick={(user) => router.push(`/users/${user.id}`)}
 * />
 * ```
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  error,
  onRetry,
  onRowClick,
  enableRowSelection = false,
  onSelectionChange,
  enableSearch = false,
  searchField,
  searchPlaceholder = '검색...',
  enableColumnVisibility = false,
  enableSorting = true,
  pagination,
  enableClientPagination = false,
  emptyState,
  className,
  tableClassName,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // 선택 컬럼 추가
  const tableColumns = React.useMemo(() => {
    if (!enableRowSelection) return columns;
    
    const selectColumn: ColumnDef<TData, TValue> = {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="전체 선택"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="행 선택"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };
    
    return [selectColumn, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    ...(enableClientPagination && { getPaginationRowModel: getPaginationRowModel() }),
    ...(enableSorting && { getSortedRowModel: getSortedRowModel() }),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // 선택 변경 콜백
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table
        .getSelectedRowModel()
        .rows.map((row) => row.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, table, onSelectionChange]);

  // 에러 상태
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  // 로딩 상태 (데이터 없을 때)
  if (loading && data.length === 0) {
    return (
      <LoadingState
        message="데이터를 불러오는 중..."
        className={className}
      />
    );
  }

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* 상단 툴바 */}
      <DataTableToolbar
        table={table}
        enableSearch={enableSearch}
        searchField={searchField}
        searchPlaceholder={searchPlaceholder}
        enableColumnVisibility={enableColumnVisibility}
      />

      {/* 테이블 본문 */}
      <DataTableBody
        table={table}
        columns={tableColumns}
        loading={loading}
        emptyState={emptyState}
        onRowClick={onRowClick}
        tableClassName={tableClassName}
      />

      {/* 하단 푸터 */}
      <DataTableFooter
        table={table}
        enableRowSelection={enableRowSelection}
        pagination={pagination}
        enableClientPagination={enableClientPagination}
      />
    </div>
  );
}

// Re-export types and utilities
export type { ColumnDef } from '@tanstack/react-table';
export type { ReactTable };
