'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { PageHeader, PageHeaderProps } from '../common/PageHeader';
import { DataTable, DataTableProps } from '../common/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RotateCcw } from 'lucide-react';

/**
 * 검색 필터 필드 정의
 */
export interface SearchFilterField {
  /** 필드 키 */
  key: string;
  /** 라벨 */
  label: string;
  /** 타입 */
  type: 'text' | 'select' | 'date';
  /** placeholder */
  placeholder?: string;
  /** select 옵션 */
  options?: { label: string; value: string }[];
  /** 너비 */
  width?: string;
}

/**
 * ListPageTemplate Props
 */
export interface ListPageTemplateProps<TData, TValue>
  extends Omit<DataTableProps<TData, TValue>, 'className'> {
  /** PageHeader 설정 */
  header: PageHeaderProps;
  /** 검색 필터 필드들 */
  filterFields?: SearchFilterField[];
  /** 필터 값 */
  filterValues?: Record<string, string>;
  /** 필터 변경 핸들러 */
  onFilterChange?: (key: string, value: string) => void;
  /** 검색 핸들러 */
  onSearch?: () => void;
  /** 필터 리셋 핸들러 */
  onFilterReset?: () => void;
  /** 페이지 wrapper className */
  className?: string;
  /** 테이블 영역 wrapper className */
  tableWrapperClassName?: string;
}

/**
 * ListPageTemplate 컴포넌트
 * 
 * 목록 페이지의 표준 레이아웃을 제공합니다.
 * PageHeader + 검색 필터 + DataTable 구조
 * 
 * @example
 * ```tsx
 * <ListPageTemplate
 *   header={{
 *     title: '고객요청 목록',
 *     breadcrumb: ['요청', '고객요청 관리'],
 *     actions: [{ label: '등록', onClick: () => router.push('/request/customer/create') }]
 *   }}
 *   filterFields={[
 *     { key: 'title', label: '제목', type: 'text' },
 *     { key: 'status', label: '상태', type: 'select', options: [...] }
 *   ]}
 *   filterValues={filters}
 *   onFilterChange={handleFilterChange}
 *   onSearch={handleSearch}
 *   columns={columns}
 *   data={requests}
 *   loading={isLoading}
 *   pagination={pagination}
 * />
 * ```
 */
export function ListPageTemplate<TData, TValue>({
  header,
  filterFields,
  filterValues = {},
  onFilterChange,
  onSearch,
  onFilterReset,
  className,
  tableWrapperClassName,
  ...tableProps
}: ListPageTemplateProps<TData, TValue>) {
  return (
    <div className={cn('p-6 space-y-6', className)}>
      {/* 페이지 헤더 */}
      <PageHeader {...header} />

      {/* 검색 필터 영역 */}
      {filterFields && filterFields.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              {filterFields.map((field) => (
                <div key={field.key} className="space-y-1" style={{ width: field.width || '200px' }}>
                  <label className="text-sm font-medium">{field.label}</label>
                  {field.type === 'text' && (
                    <Input
                      placeholder={field.placeholder || `${field.label} 입력`}
                      value={filterValues[field.key] || ''}
                      onChange={(e) => onFilterChange?.(field.key, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSearch?.();
                      }}
                    />
                  )}
                  {field.type === 'select' && (
                    <Select
                      value={filterValues[field.key] || ''}
                      onValueChange={(value) => onFilterChange?.(field.key, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder || '선택'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">전체</SelectItem>
                        {field.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}

              {/* 검색/리셋 버튼 */}
              <div className="flex gap-2 pb-0.5">
                {onSearch && (
                  <Button onClick={onSearch}>
                    <Search className="mr-2 h-4 w-4" />
                    검색
                  </Button>
                )}
                {onFilterReset && (
                  <Button variant="outline" onClick={onFilterReset}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    초기화
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 데이터 테이블 영역 */}
      <Card className={tableWrapperClassName}>
        <CardContent className="pt-6">
          <DataTable {...tableProps} />
        </CardContent>
      </Card>
    </div>
  );
}
