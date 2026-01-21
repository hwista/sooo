/**
 * 페이지 레이아웃 컴포넌트
 * 
 * 새 표준 페이지 구조:
 * - Breadcrumb: 경로 표시
 * - PageHeader: 액션 버튼 + 검색 필터 (접기/펼치기)
 * - PageContent: 고정 크기 컨텐츠 영역
 * - DataGrid: DataTable + Pagination 묶음
 */

export { Breadcrumb } from './Breadcrumb';
export type { BreadcrumbItem, BreadcrumbProps } from './Breadcrumb';

export { PageHeader } from './PageHeader';
export type { PageHeaderProps, ActionItem, FilterField } from './PageHeader';

export { PageContent } from './PageContent';
export type { PageContentProps } from './PageContent';

export { DataGrid } from './DataGrid';
export type { DataGridProps } from './DataGrid';

export { FilterBar } from './FilterBar';
export type { FilterBarProps } from './FilterBar';
