/**
 * Common Components (Level 2 - Composite/분자)
 * 
 * 비즈니스 로직 없이 재사용 가능한 복합 컴포넌트
 * shadcn/ui 원자 컴포넌트를 조합하여 구성
 * 
 * 포함 컴포넌트:
 * - PageHeader: 페이지 제목 + 브레드크럼 + 액션 버튼
 * - DataTable: 정렬/선택/페이지네이션 통합 테이블
 * - Pagination: 페이지 네비게이션
 * - FormSection, FormActions, FormField: 폼 관련 컴포넌트
 * - EmptyState, LoadingState, ErrorState: 상태 표시
 */

export { PageHeader } from './PageHeader';
export type { PageHeaderProps, ActionButton, BreadcrumbItem } from './PageHeader';

export { DataTable, createSortableHeader, createActionsColumn } from './DataTable';
export type { DataTableProps } from './DataTable';

export { Pagination } from './Pagination';
export type { PaginationProps } from './Pagination';

export { FormSection, FormActions, FormField } from './FormComponents';
export type { FormSectionProps, FormActionsProps, FormFieldProps } from './FormComponents';

export { LoadingState, ErrorState, EmptyState } from './StateDisplay';
export type { LoadingStateProps, ErrorStateProps, EmptyStateProps } from './StateDisplay';
