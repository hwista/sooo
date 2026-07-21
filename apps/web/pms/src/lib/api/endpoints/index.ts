/**
 * API Endpoints
 *
 * 도메인별 API 함수 모음
 */

// Codes
export { codesApi } from './codes';
export type {
  CodeGroup,
  CodeItem,
  CreateCodeRequest,
  UpdateCodeRequest,
} from './codes';

// Customers
export { customersApi } from './customers';
export type {
  CustomerItem,
  CustomerFilters,
} from './customers';

// PMS Master
export { pmsMasterApi } from './master';
export type {
  CreatePmsMasterImportProfileRequest,
  ImportProfileFilters,
  MasterFilters,
  UpdatePmsMasterImportProfileRequest,
} from './master';

// PMS Templates
export { pmsTemplatesApi } from './templates';
export type {
  CloseConditionTemplateGroup,
  DeliverableTemplateGroup,
  TemplateGroupApprovalStatusCode,
  TemplateGroupHistory,
  UpsertCloseConditionTemplateGroupRequest,
  UpsertDeliverableTemplateGroupRequest,
} from './templates';

// CRM Handoff
export { crmHandoffApi } from './crmHandoff';
export type {
  CrmContractHandoffCandidateFilters,
  CrmContractPmsHandoffCandidate,
} from './crmHandoff';

// Menus
export { menusApi } from './menus';
export type {
  MenuItem,
  FavoriteMenu,
  MyMenuResponse,
  MenuType,
  AccessType,
} from './menus';

// Menu Admin
export { menusAdminApi } from './menusAdmin';
export type {
  MenuAdminItem,
  CreateMenuAdminRequest,
  UpdateMenuAdminRequest,
} from './menusAdmin';

// Projects
export { projectsApi } from './projects';
export type {
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
} from './projects';

// Roles
export { rolesApi } from './roles';
export type {
  RoleItem,
  RoleMenuPermission,
  UpdateRolePermissionsRequest,
} from './roles';
