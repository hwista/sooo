/**
 * Common Components (Level 2 - Composite/분자)
 * 
 * 비즈니스 로직 없이 재사용 가능한 복합 컴포넌트
 * shadcn/ui 원자 컴포넌트를 조합하여 구성
 * 
 * 포함 컴포넌트:
 * - Page 컴포넌트: Breadcrumb, Header, Content, DataGrid, FilterBar
 * - DataTable: 정렬/선택/페이지네이션 통합 테이블
 * - Pagination: 페이지 네비게이션
 * - FormSection, FormActions, FormField: 폼 관련 컴포넌트
 * - EmptyState, LoadingState, ErrorState: 상태 표시
 */

// 페이지 컴포넌트
export {
  Breadcrumb,
  Header,
  Content,
  DataGrid,
  FilterBar,
} from './page';
export type {
  BreadcrumbItem,
  BreadcrumbProps,
  HeaderProps,
  ActionItem,
  FilterField,
  ContentProps,
  DataGridProps,
  FilterBarProps,
} from './page';

// DataTable (폴더 구조로 분리됨)
export { 
  DataTable, 
  DataTableToolbar,
  DataTableBody,
  DataTableFooter,
  createSortableHeader, 
  createActionsColumn,
} from './DataTable';
export type { DataTableProps, ColumnDef } from './DataTable';

export { Pagination } from './Pagination';
export type { PaginationProps } from './Pagination';

export { FormSection, FormActions, FormField } from './FormComponents';
export type { FormSectionProps, FormActionsProps, FormFieldProps } from './FormComponents';

export { LoadingState, ErrorState, EmptyState } from './StateDisplay';
export type { LoadingStateProps, ErrorStateProps, EmptyStateProps } from './StateDisplay';
