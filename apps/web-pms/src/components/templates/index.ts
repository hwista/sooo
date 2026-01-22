/**
 * Page Templates (Level 3 - Organism/유기체)
 * 
 * 표준화된 페이지 레이아웃 템플릿
 * common 컴포넌트를 조합하여 일관된 페이지 구조 제공
 * 
 * 포함 템플릿:
 * - ListPageTemplate: 목록 페이지 (새 표준: PageHeader + PageContent + DataGrid)
 * - FormPageTemplate: 등록/수정 페이지 (PageHeader + FormSections)
 * - DetailPageTemplate: 상세 페이지 (PageHeader + DetailSections)
 * 
 * 새 표준 구조 (2026-01-19):
 * - PageHeader: 액션 버튼(좌측 정렬) + 검색 필터, 접기/펼치기 가능
 * - PageContent: 고정 크기 컨텐츠 영역 (single/vertical/horizontal 레이아웃)
 * - DataGrid: DataTable + Pagination 묶음
 * 
 * @see docs/ui-design/page-layouts.md
 */

// 새 표준 템플릿 (V2)
export { ListPageTemplate as ListPageTemplateV2 } from './ListPageTemplateV2';
export type { ListPageTemplateProps as ListPageTemplateV2Props } from './ListPageTemplateV2';

// 기존 템플릿 (레거시, 점진적 마이그레이션)
export { ListPageTemplate } from './ListPageTemplate';
export type { ListPageTemplateProps, SearchFilterField } from './ListPageTemplate';

export { FormPageTemplate } from './FormPageTemplate';
export type { FormPageTemplateProps, FormSectionConfig } from './FormPageTemplate';

export { DetailPageTemplate, DetailFields } from './DetailPageTemplate';
export type { DetailPageTemplateProps, DetailSectionConfig, DetailFieldConfig, DetailFieldsProps } from './DetailPageTemplate';

