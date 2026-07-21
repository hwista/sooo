/**
 * API Module
 *
 * 중앙화된 API 클라이언트 및 엔드포인트 관리
 */

// Core
export { apiClient } from './client';
export type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  SortParams,
  ListParams,
} from './types';
export { ApiError } from './types';

// Auth (기존)
export { authApi } from './auth';

// Endpoints
export {
  codesApi,
  crmHandoffApi,
  customersApi,
  menusApi,
  pmsMasterApi,
  pmsTemplatesApi,
  projectsApi,
  rolesApi,
} from './endpoints';
export type {
  CodeGroup,
  CodeItem,
  CreateCodeRequest,
  UpdateCodeRequest,
  CrmContractHandoffCandidateFilters,
  CrmContractPmsHandoffCandidate,
  CustomerItem,
  CustomerFilters,
  CloseConditionTemplateGroup,
  MasterFilters,
  MenuItem,
  FavoriteMenu,
  MyMenuResponse,
  MenuType,
  AccessType,
  DeliverableTemplateGroup,
  Project,
  ProjectFilters,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectStatusCode,
  ProjectStageCode,
  ProjectPhase,
  ProjectLifecycleStatus,
  ProjectLifecycle,
  ProjectDoneResultCode,
  RoleItem,
  RoleMenuPermission,
  TemplateGroupApprovalStatusCode,
  TemplateGroupHistory,
  UpdateRolePermissionsRequest,
  UpsertCloseConditionTemplateGroupRequest,
  UpsertDeliverableTemplateGroupRequest,
} from './endpoints';

// 편의를 위한 통합 객체
import { authApi } from './auth';
import {
  codesApi,
  crmHandoffApi,
  customersApi,
  menusApi,
  pmsMasterApi,
  pmsTemplatesApi,
  projectsApi,
  rolesApi,
} from './endpoints';

export const api = {
  auth: authApi,
  codes: codesApi,
  crmHandoff: crmHandoffApi,
  customers: customersApi,
  pmsMaster: pmsMasterApi,
  pmsTemplates: pmsTemplatesApi,
  menus: menusApi,
  projects: projectsApi,
  roles: rolesApi,
} as const;
