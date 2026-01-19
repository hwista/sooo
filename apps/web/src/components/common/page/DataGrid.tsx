'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * DataGrid Props
 */
export interface DataGridProps {
  /** 내부 스크롤 여부 */
  scrollable?: boolean;
  /** 최소 높이 */
  minHeight?: string;
  /** 최대 높이 */
  maxHeight?: string;
  /** 자식 컴포넌트 (DataTable + Pagination 또는 Chart) */
  children: React.ReactNode;
  /** 추가 className */
  className?: string;
}

/**
 * DataGrid 컴포넌트
 * 
 * DataTable + Pagination을 하나의 단위로 묶습니다.
 * 차트나 커스텀 컴포넌트도 배치할 수 있습니다.
 * 
 * @example
 * ```tsx
 * <DataGrid>
 *   <DataTable columns={columns} data={data} />
 *   <Pagination page={page} total={total} ... />
 * </DataGrid>
 * 
 * // 스크롤 가능한 그리드
 * <DataGrid scrollable maxHeight="400px">
 *   <DataTable columns={columns} data={data} />
 *   <Pagination page={page} total={total} ... />
 * </DataGrid>
 * 
 * // 차트 그리드
 * <DataGrid minHeight="300px">
 *   <Chart type="bar" data={chartData} />
 * </DataGrid>
 * ```
 */
export function DataGrid({
  scrollable = false,
  minHeight,
  maxHeight,
  children,
  className,
}: DataGridProps) {
  const style: React.CSSProperties = {
    minHeight: minHeight,
    maxHeight: scrollable ? maxHeight : undefined,
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full',
        scrollable && 'overflow-hidden',
        className
      )}
      style={style}
    >
      {/* 테이블/차트 영역 (스크롤 가능) */}
      <div className={cn('flex-1 min-h-0', scrollable && 'overflow-auto')}>
        {React.Children.map(children, (child, index) => {
          // Pagination은 마지막에 고정
          if (React.isValidElement(child)) {
            const childType = (child.type as any)?.displayName || (child.type as any)?.name;
            if (childType === 'Pagination') {
              return null; // 아래에서 별도 렌더링
            }
          }
          return child;
        })}
      </div>

      {/* Pagination 고정 영역 */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const childType = (child.type as any)?.displayName || (child.type as any)?.name;
          if (childType === 'Pagination') {
            return (
              <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/50 px-4 py-2">
                {child}
              </div>
            );
          }
        }
        return null;
      })}
    </div>
  );
}
