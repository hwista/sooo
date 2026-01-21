/**
 * 프로젝트 상태 코드
 * - opportunity: 기회 (계약 전)
 * - execution: 실행 (계약 후)
 * - done: 완료 (종료)
 */
export type ProjectStatusCode = 'opportunity' | 'execution' | 'done';

/**
 * 프로젝트 단계 코드
 * - waiting: 대기
 * - in_progress: 진행 중
 * - done: 완료
 */
export type ProjectStageCode = 'waiting' | 'in_progress' | 'done';

/**
 * 완료 결과 코드 (done 상태에서만 사용)
 * - complete: 정상 완료
 * - cancel: 취소
 */
export type DoneResultCode = 'complete' | 'cancel';

/**
 * 프로젝트 소스 코드
 * - direct: 직접 생성 (내부 발굴)
 * - opportunity: 기회 (영업 기회)
 */
export type ProjectSourceCode = 'direct' | 'opportunity';

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
