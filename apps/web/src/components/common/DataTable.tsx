'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, MoreHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from './Pagination';
import { EmptyState, LoadingState, ErrorState } from './StateDisplay';

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

  // 로딩 상태
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
      {(enableSearch || enableColumnVisibility) && (
        <div className="flex items-center justify-between">
          {/* 검색 */}
          {enableSearch && searchField && (
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchField)?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn(searchField)?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          )}
          {!enableSearch && <div />}

          {/* 컬럼 가시성 */}
          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  컨럼 <ChevronDown className="ml-2 icon-body" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* 테이블 */}
      <div className={cn('rounded-md border', tableClassName)}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading && (
              // 로딩 중 스켈레톤
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {tableColumns.map((_, colIndex) => (
                    <TableCell key={`skeleton-${index}-${colIndex}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
            {!loading && table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(onRowClick && 'cursor-pointer hover:bg-muted/50')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              !loading && (
                <TableRow>
                  <TableCell
                    colSpan={tableColumns.length}
                    className="h-24 text-center"
                  >
                    {emptyState || <EmptyState title="데이터가 없습니다" />}
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </div>

      {/* 하단 정보 */}
      <div className="flex items-center justify-between">
        {/* 선택 정보 */}
        {enableRowSelection && (
          <div className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length}개 선택됨 /{' '}
            {table.getFilteredRowModel().rows.length}개
          </div>
        )}
        {!enableRowSelection && <div />}

        {/* 페이지네이션 */}
        {pagination && (
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
            showTotal={!enableRowSelection}
          />
        )}

        {/* 클라이언트 사이드 페이지네이션 */}
        {enableClientPagination && !pagination && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              이전
            </Button>
            <span className="text-sm text-muted-foreground">
              {table.getState().pagination.pageIndex + 1} /{' '}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              다음
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 정렬 가능한 헤더를 생성하는 유틸리티 함수
 */
export function createSortableHeader(label: string) {
  const SortableHeader = ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => 'asc' | 'desc' | false } }) => (
    <Button
      variant="ghost"
      className="-ml-4"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {label}
      <ArrowUpDown className="ml-2 icon-body" />
    </Button>
  );
  SortableHeader.displayName = `SortableHeader(${label})`;
  return SortableHeader;
}

/**
 * 액션 메뉴 컬럼을 생성하는 유틸리티 함수
 */
export function createActionsColumn<TData>(
  actions: {
    label: string;
    onClick: (row: TData) => void;
    variant?: 'default' | 'destructive';
  }[]
): ColumnDef<TData> {
  return {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">메뉴 열기</span>
              <MoreHorizontal className="icon-body" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>작업</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {actions.map((action, index) => (
              <DropdownMenuItem
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick(row.original);
                }}
                className={cn(
                  action.variant === 'destructive' && 'text-destructive'
                )}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };
}
