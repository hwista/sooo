import { apiClient } from '../client';
import { ApiResponse, PaginatedResponse, ListParams } from '../types';

/**
 * 프로젝트 상태 코드
 */
export type ProjectStatusCode = 'opportunity' | 'execution';

/**
 * 프로젝트 단계 코드
 */
export type ProjectStageCode = 'waiting' | 'in_progress' | 'done';

/**
 * 프로젝트 소스 코드
 */
export type ProjectSourceCode = 'request' | 'referral' | 'direct' | 'tender' | 'etc';

/**
 * 프로젝트 완료 결과 코드
 */
export type ProjectDoneResultCode = 'won' | 'lost' | 'hold';

/**
 * 프로젝트 DTO
 */
export interface Project {
  projectId: number;
  projectName: string;
  projectCode?: string;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  projectSourceCode?: ProjectSourceCode;
  doneResultCode?: ProjectDoneResultCode;
  customerId?: number;
  customerName?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  contractAmount?: number;
  ownerId?: number;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 프로젝트 생성 요청
 */
export interface CreateProjectRequest {
  projectName: string;
  statusCode?: ProjectStatusCode;
  stageCode?: ProjectStageCode;
  projectSourceCode?: ProjectSourceCode;
  customerId?: number;
  description?: string;
  startDate?: string;
  endDate?: string;
  contractAmount?: number;
}

/**
 * 프로젝트 수정 요청
 */
export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  doneResultCode?: ProjectDoneResultCode;
}

/**
 * 프로젝트 필터
 */
export interface ProjectFilters extends ListParams {
  statusCode?: ProjectStatusCode;
  stageCode?: ProjectStageCode;
  projectSourceCode?: ProjectSourceCode;
  customerId?: number;
}

/**
 * 프로젝트 API
 */
export const projectsApi = {
  /**
   * 프로젝트 목록 조회
   */
  list: async (params?: ProjectFilters): Promise<ApiResponse<PaginatedResponse<Project>>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Project>>>('/projects', {
      params,
    });
    return response.data;
  },

  /**
   * 프로젝트 상세 조회
   */
  getById: async (id: number): Promise<ApiResponse<Project>> => {
    const response = await apiClient.get<ApiResponse<Project>>(`/projects/${id}`);
    return response.data;
  },

  /**
   * 프로젝트 생성
   */
  create: async (data: CreateProjectRequest): Promise<ApiResponse<Project>> => {
    const response = await apiClient.post<ApiResponse<Project>>('/projects', data);
    return response.data;
  },

  /**
   * 프로젝트 수정
   */
  update: async (id: number, data: UpdateProjectRequest): Promise<ApiResponse<Project>> => {
    const response = await apiClient.put<ApiResponse<Project>>(`/projects/${id}`, data);
    return response.data;
  },

  /**
   * 프로젝트 삭제
   */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${id}`);
    return response.data;
  },
};
