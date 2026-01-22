'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import type {
  Project,
  ProjectFilters,
  CreateProjectRequest,
  UpdateProjectRequest,
} from '@/lib/api/endpoints/projects';
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types';

/**
 * Query Keys
 */
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: ProjectFilters) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: number) => [...projectKeys.details(), id] as const,
};

/**
 * 프로젝트 목록 조회
 */
export function useProjectList(
  filters?: ProjectFilters,
  options?: Omit<
    UseQueryOptions<ApiResponse<PaginatedResponse<Project>>, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => projectsApi.list(filters),
    staleTime: 5 * 60 * 1000, // 5분
    ...options,
  });
}

/**
 * 프로젝트 상세 조회
 */
export function useProjectDetail(
  id: number,
  options?: Omit<UseQueryOptions<ApiResponse<Project>, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * 프로젝트 생성
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.create(data),
    onSuccess: () => {
      // 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * 프로젝트 수정
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectRequest }) =>
      projectsApi.update(id, data),
    onSuccess: (_, variables) => {
      // 해당 프로젝트 상세 캐시 무효화
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      // 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * 프로젝트 삭제
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: (_, id) => {
      // 해당 프로젝트 상세 캐시 제거
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
      // 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
