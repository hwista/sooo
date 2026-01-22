'use client';

import * as React from 'react';
import { Loader2, AlertCircle, RefreshCw, FileX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * LoadingState Props
 */
export interface LoadingStateProps {
  /** 로딩 메시지 */
  message?: string;
  /** 추가 className */
  className?: string;
}

/**
 * LoadingState 컴포넌트
 */
export function LoadingState({
  message = '데이터를 불러오는 중...',
  className,
}: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * ErrorState Props
 */
export interface ErrorStateProps {
  /** 에러 객체 또는 메시지 */
  error?: Error | string | null;
  /** 기본 에러 메시지 */
  defaultMessage?: string;
  /** 재시도 핸들러 */
  onRetry?: () => void;
  /** 추가 className */
  className?: string;
}

/**
 * ErrorState 컴포넌트
 */
export function ErrorState({
  error,
  defaultMessage = '데이터를 불러오는데 실패했습니다.',
  onRetry,
  className,
}: ErrorStateProps) {
  const message = error
    ? typeof error === 'string'
      ? error
      : error.message
    : defaultMessage;

  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <RefreshCw className="icon-body" />
          다시 시도
        </Button>
      )}
    </div>
  );
}

/**
 * EmptyState Props
 */
export interface EmptyStateProps {
  /** 아이콘 (React 노드) */
  icon?: React.ReactNode;
  /** 제목 */
  title?: string;
  /** 설명 */
  description?: string;
  /** 액션 버튼 */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** 추가 className */
  className?: string;
}

/**
 * EmptyState 컴포넌트
 */
export function EmptyState({
  icon,
  title = '데이터가 없습니다',
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      {icon || <FileX className="h-10 w-10 text-muted-foreground" />}
      <h3 className="mt-4 heading-3">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
