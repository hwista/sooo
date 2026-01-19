'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { PageHeader, PageHeaderProps } from '../common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoadingState, ErrorState } from '../common/StateDisplay';

/**
 * 상세 섹션 정의
 */
export interface DetailSectionConfig {
  /** 섹션 키 */
  key: string;
  /** 섹션 제목 */
  title: string;
  /** 섹션 콘텐츠 */
  children: React.ReactNode;
}

/**
 * 상세 필드 정의
 */
export interface DetailFieldConfig {
  /** 필드 라벨 */
  label: string;
  /** 필드 값 */
  value: React.ReactNode;
  /** 컬럼 스팬 (기본 1) */
  colSpan?: 1 | 2 | 3 | 4;
}

/**
 * DetailPageTemplate Props
 */
export interface DetailPageTemplateProps {
  /** PageHeader 설정 */
  header: PageHeaderProps;
  /** 상세 섹션들 */
  sections: DetailSectionConfig[];
  /** 로딩 상태 */
  loading?: boolean;
  /** 에러 */
  error?: Error | string | null;
  /** 재시도 핸들러 */
  onRetry?: () => void;
  /** 페이지 wrapper className */
  className?: string;
}

/**
 * DetailPageTemplate 컴포넌트
 * 
 * 상세 페이지의 표준 레이아웃을 제공합니다.
 * PageHeader + DetailSections 구조
 * 
 * @example
 * ```tsx
 * <DetailPageTemplate
 *   header={{
 *     title: '고객요청 상세',
 *     breadcrumb: ['요청', '고객요청 관리', '상세'],
 *     actions: [{ label: '수정', onClick: () => router.push(`/edit/${id}`) }]
 *   }}
 *   sections={[
 *     {
 *       key: 'basic',
 *       title: '기본 정보',
 *       children: (
 *         <DetailFields
 *           fields={[
 *             { label: '제목', value: data.title },
 *             { label: '상태', value: <Badge>{data.status}</Badge> },
 *           ]}
 *         />
 *       )
 *     }
 *   ]}
 *   loading={isLoading}
 * />
 * ```
 */
export function DetailPageTemplate({
  header,
  sections,
  loading = false,
  error,
  onRetry,
  className,
}: DetailPageTemplateProps) {
  // 에러 상태
  if (error) {
    return (
      <div className={cn('space-y-6', className)}>
        <PageHeader {...header} />
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <PageHeader {...header} />
        <LoadingState message="데이터를 불러오는 중..." />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 페이지 헤더 */}
      <PageHeader {...header} />

      {/* 섹션들 */}
      {sections.map((section, index) => (
        <Card key={section.key}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{section.title}</CardTitle>
          </CardHeader>
          <CardContent>{section.children}</CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * DetailFields Props
 */
export interface DetailFieldsProps {
  /** 필드 배열 */
  fields: DetailFieldConfig[];
  /** 그리드 컬럼 수 (기본 2) */
  columns?: 2 | 3 | 4;
  /** 추가 className */
  className?: string;
}

/**
 * DetailFields 컴포넌트
 * 
 * 상세 정보를 그리드 레이아웃으로 표시합니다.
 */
export function DetailFields({
  fields,
  columns = 2,
  className,
}: DetailFieldsProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  const colSpanClass = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {fields.map((field, index) => (
        <div
          key={index}
          className={cn('space-y-1', field.colSpan && colSpanClass[field.colSpan])}
        >
          <dt className="text-sm font-medium text-muted-foreground">
            {field.label}
          </dt>
          <dd className="text-sm">
            {field.value ?? <span className="text-muted-foreground">-</span>}
          </dd>
        </div>
      ))}
    </div>
  );
}
