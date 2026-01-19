/**
 * Components Export
 * 
 * 컴포넌트 계층 구조:
 * 
 * Level 1: ui/ (Primitive - 원자)
 *   └── shadcn/ui 기반 기본 컴포넌트
 *   └── Button, Input, Select, Dialog, etc.
 * 
 * Level 2: common/ (Composite - 분자)
 *   └── 비즈니스 로직 없는 재사용 컴포넌트
 *   └── PageHeader, DataTable, FormSection, etc.
 * 
 * Level 3: templates/ (Organism - 유기체)
 *   └── 페이지 레이아웃 템플릿
 *   └── ListPageTemplate, FormPageTemplate, etc.
 * 
 * Level 4: layout/ (App Layout)
 *   └── 전체 앱 레이아웃 컴포넌트
 *   └── Header, Sidebar, TabBar, ContentArea
 */

// Layout components
export * from './layout';

// Common components (추후 활성화)
// export * from './common';

// Page templates (추후 활성화)
// export * from './templates';
