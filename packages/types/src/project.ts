/**
 * 프로젝트 상태 코드
 * - opportunity: 계약 전 기회
 * - execution: 계약 후 실행
 */
export type ProjectStatusCode = 'opportunity' | 'execution';

/**
 * 프로젝트 단계 코드
 * - waiting: 대기
 * - in_progress: 진행 중
 * - done: 완료
 */
export type ProjectStageCode = 'waiting' | 'in_progress' | 'done';

/**
 * 기회 종료 결과 코드 (opportunity + done 일 때만 사용)
 * - won: 수주
 * - lost: 실주
 * - hold: 보류
 */
export type DoneResultCode = 'won' | 'lost' | 'hold';

/**
 * 프로젝트 소스 코드
 * - request: 고객 요청
 * - proposal: 제안
 */
export type ProjectSourceCode = 'request' | 'proposal';

/**
 * 프로젝트 엔티티
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  customerId?: string;
  projectSourceCode: ProjectSourceCode;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  doneResultCode?: DoneResultCode;
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 프로젝트 생성 DTO
 */
export interface CreateProjectDto {
  name: string;
  description?: string;
  customerId?: string;
  projectSourceCode?: ProjectSourceCode;
  statusCode?: ProjectStatusCode;
  stageCode?: ProjectStageCode;
  ownerId?: string;
}

/**
 * 프로젝트 수정 DTO
 */
export interface UpdateProjectDto {
  name?: string;
  description?: string;
  statusCode?: ProjectStatusCode;
  stageCode?: ProjectStageCode;
  doneResultCode?: DoneResultCode;
  ownerId?: string;
}
