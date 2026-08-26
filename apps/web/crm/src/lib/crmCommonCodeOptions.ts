'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSharedAccessToken } from '@ssoo/web-auth';

export type CrmSourceCodeGroup = 'payment_term' | 'biz_type' | 'group_type' | 'biz_year';

export interface CrmCommonCodeOption {
  value: string;
  label: string;
}

interface CodeItemResponse {
  codeValue: string;
  displayNameKo: string;
  sortOrder: number;
  isActive: boolean;
}

interface CodeListResponse {
  success: boolean;
  data?: CodeItemResponse[];
}

const requestCache = new Map<CrmSourceCodeGroup, Promise<CrmCommonCodeOption[]>>();

async function fetchGroup(group: CrmSourceCodeGroup): Promise<CrmCommonCodeOption[]> {
  const existing = requestCache.get(group);
  if (existing) return existing;

  const accessToken = getSharedAccessToken();
  const request = fetch(`/api/codes?codeGroup=${encodeURIComponent(group)}`, {
    cache: 'no-store',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => null) as CodeListResponse | null;
      if (!response.ok || payload?.success !== true) throw new Error('공통코드를 불러오지 못했습니다.');
      return (payload.data ?? [])
        .filter((item) => item.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.codeValue.localeCompare(b.codeValue))
        .map((item) => ({ value: item.codeValue, label: item.displayNameKo }));
    })
    .finally(() => requestCache.delete(group));
  requestCache.set(group, request);
  return request;
}

export function useCrmCommonCodeOptions(groups: CrmSourceCodeGroup[]) {
  const groupKey = groups.join(',');
  const [options, setOptions] = useState<Partial<Record<CrmSourceCodeGroup, CrmCommonCodeOption[]>>>({});
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const loaded = await Promise.all(groups.map(async (group) => [group, await fetchGroup(group)] as const));
      setOptions(Object.fromEntries(loaded));
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '공통코드를 불러오지 못했습니다.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey]);

  useEffect(() => {
    void reload();
    const handleFocus = () => void reload();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [reload]);

  return { options, error, reload };
}

export function withCurrentCodeOption(
  options: CrmCommonCodeOption[],
  value: string,
  fallbackLabel?: string,
): CrmCommonCodeOption[] {
  if (!value || options.some((option) => option.value === value)) return options;
  return [{ value, label: fallbackLabel ?? value }, ...options];
}

export function useCrmBusinessYearOptions(currentYear: number, fallbackYears: number[]) {
  const commonCodes = useCrmCommonCodeOptions(['biz_year']);
  const configuredYears = (commonCodes.options.biz_year ?? [])
    .map((option) => Number.parseInt(option.value, 10))
    .filter((year) => Number.isInteger(year) && year >= 2000 && year <= 2100);
  const source = configuredYears.length > 0 ? configuredYears : fallbackYears;
  return {
    years: [...new Set([currentYear, ...source])].sort((left, right) => left - right),
    error: commonCodes.error,
    reload: commonCodes.reload,
  };
}
