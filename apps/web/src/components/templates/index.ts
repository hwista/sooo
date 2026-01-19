/**
 * Page Templates (Level 3 - Organism/유기체)
 * 
 * 표준화된 페이지 레이아웃 템플릿
 * common 컴포넌트를 조합하여 일관된 페이지 구조 제공
 * 
 * 포함 템플릿:
 * - ListPageTemplate: 목록 페이지 (PageHeader + 검색필터 + DataTable)
 * - FormPageTemplate: 등록/수정 페이지 (PageHeader + FormSections + FormActions)
 * - DetailPageTemplate: 상세 페이지 (PageHeader + DetailSections)
 * 
 * 사용 예시:
 * ```tsx
 * <ListPageTemplate
 *   header={{ title: '목록', breadcrumb: ['메뉴', '목록'] }}
 *   columns={columns}
 *   data={data}
 *   pagination={pagination}
 * />
 * ```
 */

export { ListPageTemplate } from './ListPageTemplate';
export type { ListPageTemplateProps, SearchFilterField } from './ListPageTemplate';

export { FormPageTemplate } from './FormPageTemplate';
export type { FormPageTemplateProps, FormSectionConfig } from './FormPageTemplate';

export { DetailPageTemplate, DetailFields } from './DetailPageTemplate';
export type { DetailPageTemplateProps, DetailSectionConfig, DetailFieldConfig, DetailFieldsProps } from './DetailPageTemplate';
