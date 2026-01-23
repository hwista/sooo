'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { PageHeader, PageHeaderProps } from '../common/PageHeader';
import { FormSection, FormActions, FormActionsProps } from '../common/FormComponents';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState, ErrorState } from '../common/StateDisplay';

/**
 * 폼 섹션 정의
 */
export interface FormSectionConfig {
  /** 섹션 키 */
  key: string;
  /** 섹션 제목 */
  title: string;
  /** 섹션 설명 */
  description?: string;
  /** 섹션 콘텐츠 (폼 필드들) */
  children: React.ReactNode;
}

/**
 * FormPageTemplate Props
 */
export interface FormPageTemplateProps extends Omit<FormActionsProps, 'className'> {
  /** PageHeader 설정 */
  header: PageHeaderProps;
  /** 폼 섹션들 */
  sections: FormSectionConfig[];
  /** 로딩 상태 */
  loading?: boolean;
  /** 에러 */
  error?: Error | string | null;
  /** 재시도 핸들러 */
  onRetry?: () => void;
  /** 폼 제출 핸들러 (form onSubmit) */
  onFormSubmit?: (e: React.FormEvent) => void;
  /** 페이지 wrapper className */
  className?: string;
  /** 폼 영역 wrapper className */
  formClassName?: string;
}

/**
 * FormPageTemplate 컴포넌트
 * 
 * 폼 페이지의 표준 레이아웃을 제공합니다.
 * PageHeader + FormSections + FormActions 구조
 * 
 * @example
 * ```tsx
 * <FormPageTemplate
 *   header={{
 *     title: '고객요청 등록',
 *     breadcrumb: ['요청', '고객요청 관리', '등록'],
 *   }}
 *   sections={[
 *     {
 *       key: 'basic',
 *       title: '기본 정보',
 *       children: (
 *         <>
 *           <FormField label="제목" required>
 *             <Input {...register('title')} />
 *           </FormField>
 *         </>
 *       )
 *     }
 *   ]}
 *   onSubmit={handleSubmit}
 *   onCancel={() => router.back()}
 *   loading={isSubmitting}
 * />
 * ```
 */
export function FormPageTemplate({
  header,
  sections,
  loading = false,
  error,
  onRetry,
  onFormSubmit,
  className,
  formClassName,
  // FormActions props
  onSubmit,
  onCancel,
  onDelete,
  submitLabel,
  cancelLabel,
  deleteLabel,
  submitDisabled,
  showDelete,
  loading: actionLoading,
}: FormPageTemplateProps) {
  // 에러 상태
  if (error) {
    return (
      <div className={cn('p-6 space-y-6', className)}>
        <PageHeader {...header} />
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className={cn('p-6 space-y-6', className)}>
        <PageHeader {...header} />
        <LoadingState message="데이터를 불러오는 중..." />
      </div>
    );
  }

  return (
    <div className={cn('p-6 space-y-6', className)}>
      {/* 페이지 헤더 */}
      <PageHeader {...header} />

      {/* 폼 영역 */}
      <form onSubmit={onFormSubmit}>
        <Card className={formClassName}>
          <CardContent className="pt-6 space-y-8">
            {/* 섹션들 */}
            {sections.map((section) => (
              <FormSection
                key={section.key}
                title={section.title}
                description={section.description}
              >
                {section.children}
              </FormSection>
            ))}

            {/* 액션 버튼 */}
            <FormActions
              onSubmit={onSubmit}
              onCancel={onCancel}
              onDelete={onDelete}
              submitLabel={submitLabel}
              cancelLabel={cancelLabel}
              deleteLabel={deleteLabel}
              loading={actionLoading}
              submitDisabled={submitDisabled}
              showDelete={showDelete}
            />
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
