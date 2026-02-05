/**
 * API Endpoints
 *
 * 도메인별 API 함수 모음
 */

// Projects
export { projectsApi } from './projects';
export type {
  Project,
  ProjectFilters,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectStatusCode,
  ProjectStageCode,
  ProjectDoneResultCode,
} from './projects';

// Menus
export { menusApi } from './menus';
export type {
  MenuItem,
  FavoriteMenu,
  MyMenuResponse,
  MenuType,
  AccessType,
} from './menus';

// 추후 추가
// export { customersApi } from './customers';
// export { usersApi } from './users';
// export { codesApi } from './codes';
