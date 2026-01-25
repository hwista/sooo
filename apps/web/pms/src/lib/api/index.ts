/**
 * API Module
 *
 * 중앙화된 API 클라이언트 및 엔드포인트 관리
 */

// Core
export { apiClient } from './client';
export * from './types';

// Auth (기존)
export { authApi } from './auth';

// Endpoints
export * from './endpoints';

// 편의를 위한 통합 객체
import { authApi } from './auth';
import { projectsApi, menusApi } from './endpoints';

export const api = {
  auth: authApi,
  projects: projectsApi,
  menus: menusApi,
} as const;
