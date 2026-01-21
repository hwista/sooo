/**
 * DataTable 컴포넌트
 * 
 * TanStack Table 기반의 데이터 테이블 컴포넌트입니다.
 * 정렬, 필터, 페이지네이션, 행 선택 등의 기능을 제공합니다.
 * 
 * @module DataTable
 */

// Main component
export { DataTable } from './DataTable';
export type { DataTableProps } from './DataTable';

// Sub components
export { DataTableToolbar } from './DataTableToolbar';
export { DataTableBody } from './DataTableBody';
export { DataTableFooter } from './DataTableFooter';

// Utilities
export { createSortableHeader, createActionsColumn } from './data-table-utils';

// Re-export types from tanstack table
export type { ColumnDef } from '@tanstack/react-table';
