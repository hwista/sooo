'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { DmsHomeSummary } from '@ssoo/types/dms';
import { homeApi } from '@/lib/api/homeApi';
import { getErrorMessage } from '@/lib/api/core';

export const homeQueryKeys = {
  summary: ['dms-home', 'summary'] as const,
};

async function loadHomeSummary(): Promise<DmsHomeSummary> {
  const response = await homeApi.getSummary();
  if (!response.success || !response.data) {
    throw new Error(getErrorMessage(response));
  }
  return response.data;
}

export function useHomeSummary(active: boolean) {
  const acknowledgedAtRef = useRef<string | null>(null);
  const wasActiveRef = useRef(false);
  const query = useQuery({
    queryKey: homeQueryKeys.summary,
    queryFn: loadHomeSummary,
    enabled: active,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });
  const { data, refetch } = query;

  useEffect(() => {
    if (active && wasActiveRef.current === false && data) {
      void refetch();
    }
    wasActiveRef.current = active;
  }, [active, data, refetch]);

  useEffect(() => {
    if (!active || !data || acknowledgedAtRef.current === data.generatedAt) {
      return;
    }
    acknowledgedAtRef.current = data.generatedAt;
    void homeApi.acknowledgeSeen({ seenAt: data.generatedAt });
  }, [active, data]);

  return query;
}

export function useInvalidateHomeSummary() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: homeQueryKeys.summary }),
    [queryClient],
  );
}
