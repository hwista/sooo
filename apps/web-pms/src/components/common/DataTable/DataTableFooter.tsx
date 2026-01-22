'use client';

import { Table as ReactTable } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Pagination } from '../Pagination';

interface DataTableFooterProps<TData> {
  table: ReactTable<TData>;
  enableRowSelection?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  enableClientPagination?: boolean;
}

/**
 * DataTable 하단 푸터
 * - 선택 정보
 * - 서버 사이드 페이지네이션
 * - 클라이언트 사이드 페이지네이션
 */
export function DataTableFooter<TData>({
  table,
  enableRowSelection = false,
  pagination,
  enableClientPagination = false,
}: DataTableFooterProps<TData>) {
  // 푸터 표시 조건
  const hasContent = enableRowSelection || pagination || enableClientPagination;
  if (!hasContent) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      {/* 선택 정보 */}
      {enableRowSelection ? (
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length}개 선택됨 /{' '}
          {table.getFilteredRowModel().rows.length}개
        </div>
      ) : (
        <div />
      )}

      {/* 서버 사이드 페이지네이션 */}
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
  );
}
