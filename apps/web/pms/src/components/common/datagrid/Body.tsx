'use client';

import { ColumnDef, flexRender, Table as ReactTable } from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '../StateDisplay';

interface BodyProps<TData, TValue> {
  table: ReactTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  tableClassName?: string;
}

/**
 * DataGrid 본문
 * - 테이블 헤더
 * - 테이블 바디 (로딩 스켈레톤, 데이터 행, 빈 상태)
 */
export function Body<TData, TValue>({
  table,
  columns,
  loading = false,
  emptyState,
  onRowClick,
  tableClassName,
}: BodyProps<TData, TValue>) {
  return (
    <div className={cn('flex-1 min-h-0 rounded-md border [&>div]:h-full', tableClassName)}>
      <Table>
        <TableHeader className="bg-gray-50 shadow-sm">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="sticky top-0 z-10 bg-gray-50">
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
          {/* 로딩 중 스켈레톤 */}
          {loading && (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                {columns.map((_, colIndex) => (
                  <TableCell key={`skeleton-${index}-${colIndex}`}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}

          {/* 데이터 행 */}
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
            /* 빈 상태 */
            !loading && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
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
  );
}
