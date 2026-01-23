/**
 * 프로젝트 상태 코드
 * - request: 요청
 * - proposal: 제안
 * - execution: 실행
 * - transition: 전환
 */
export type ProjectStatusCode = 'request' | 'proposal' | 'execution' | 'transition';

/**
 * 프로젝트 단계 코드
 * - waiting: 대기
 * - in_progress: 진행 중
 * - done: 완료
 */
export type ProjectStageCode = 'waiting' | 'in_progress' | 'done';

/**
 * 완료 결과 코드 (done 상태에서만 사용)
 * - accepted: 수용
 * - rejected: 거부
 * - won: 수주
 * - lost: 실주
 * - completed: 완료
 * - cancelled: 취소
 * - transferred: 전환완료
 * - hold: 보류
 */
export type DoneResultCode =
  | 'accepted'
  | 'rejected'
  | 'won'
  | 'lost'
  | 'completed'
  | 'cancelled'
  | 'transferred'
  | 'hold';

/**
 * 프로젝트 엔티티
 */
export interface Project {
  id: string;
  projectName: string;
  memo?: string | null;
  customerId?: string | null;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  doneResultCode?: DoneResultCode;
  currentOwnerUserId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 프로젝트 생성 DTO
 */
export interface CreateProjectDto {
  projectName: string;
  description?: string;
  customerId?: string;
  statusCode?: ProjectStatusCode;
  stageCode?: ProjectStageCode;
  ownerId?: string;
}

/**
 * 프로젝트 수정 DTO
 */
export interface UpdateProjectDto {
  projectName?: string;
  description?: string;
  statusCode?: ProjectStatusCode;
  stageCode?: ProjectStageCode;
  doneResultCode?: DoneResultCode;
  ownerId?: string;
}
