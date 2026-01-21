'use client';

import * as React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * 브레드크럼 아이템
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * 액션 버튼
 */
export interface ActionButton {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}

/**
 * PageHeader Props
 */
export interface PageHeaderProps {
  /** 페이지 제목 */
  title: string;
  /** 페이지 설명 (선택) */
  description?: string;
  /** 브레드크럼 경로 */
  breadcrumb?: (string | BreadcrumbItem)[];
  /** 우측 액션 버튼들 */
  actions?: ActionButton[];
  /** 추가 className */
  className?: string;
  /** 자식 요소 (제목 아래 추가 콘텐츠) */
  children?: React.ReactNode;
}

/**
 * PageHeader 컴포넌트 (레거시)
 *
 * 페이지 상단에 제목, 브레드크럼, 액션 버튼을 표시합니다.
 *
 * @deprecated 새 페이지 개발 시 `@/components/common/page`의 새 표준 컴포넌트를 사용하세요.
 * - Breadcrumb: 경로 표시 (별도 컴포넌트)
 * - PageHeader: 액션 버튼 + 검색 필터 (접기/펼치기 지원)
 *
 * @example
 * ```tsx
 * // 레거시 사용 (FormPageTemplate, DetailPageTemplate 내부)
 * <PageHeader
 *   title="고객요청 목록"
 *   breadcrumb={['요청', '고객요청 관리', '목록']}
 *   actions={[
 *     { label: '등록', icon: <Plus />, onClick: handleCreate }
 *   ]}
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {/* 브레드크럼 */}
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center body-text-muted">
          <Home className="h-3.5 w-3.5" />
          {breadcrumb.map((item, index) => {
            const label = typeof item === 'string' ? item : item.label;
            const isLast = index === breadcrumb.length - 1;
            
            return (
              <React.Fragment key={index}>
                <ChevronRight className="mx-1 h-3.5 w-3.5" />
                <span className={cn(isLast && 'text-foreground font-medium')}>
                  {label}
                </span>
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* 제목 및 액션 영역 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-1">{title}</h1>
          {description && (
            <p className="body-text-muted mt-1">{description}</p>
          )}
        </div>

        {/* 액션 버튼들 */}
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'default'}
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
              >
                {action.loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  action.icon
                )}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* 추가 콘텐츠 */}
      {children}
    </div>
  );
}
