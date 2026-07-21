// Task — WBS/태스크 관리

export interface Task {
  id: string;
  projectId: string;
  wbsId: string | null;
  parentTaskId: string | null;
  taskCode: string;
  taskName: string;
  description: string | null;
  taskTypeCode: string | null;
  statusCode: string;
  priorityCode: string;
  assigneeUserId: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  progressRate: number;
  estimatedHours: number | null;
  actualHours: number | null;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  // joined fields
  assigneeName?: string;
  childTasks?: Task[];
}

export interface CreateTaskDto {
  wbsId?: string | null;
  parentTaskId?: string | null;
  taskCode: string;
  taskName: string;
  description?: string;
  taskTypeCode?: string;
  priorityCode?: string;
  assigneeUserId?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  estimatedHours?: number;
  depth?: number;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateTaskDto {
  wbsId?: string | null;
  taskName?: string;
  description?: string;
  taskTypeCode?: string;
  statusCode?: string;
  priorityCode?: string;
  assigneeUserId?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  progressRate?: number;
  estimatedHours?: number | null;
  actualHours?: number | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string;
}

export interface TaskEffortLogTask {
  id: string;
  taskCode: string;
  taskName: string;
}

export interface TaskEffortLogUser {
  id: string;
  userName: string;
  displayName: string | null;
}

export interface TaskEffortLog {
  effortLogId: string;
  projectId: string;
  taskId: string;
  userId: string | null;
  workDate: string;
  actualHours: number;
  workTypeCode: string;
  summary: string | null;
  isActive: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  task?: TaskEffortLogTask | null;
  user?: TaskEffortLogUser | null;
}

export interface CreateTaskEffortLogDto {
  taskId: string;
  userId?: string | null;
  workDate: string;
  actualHours: number;
  workTypeCode?: string;
  summary?: string | null;
  memo?: string | null;
}

export interface UpdateTaskEffortLogDto {
  taskId?: string;
  userId?: string | null;
  workDate?: string;
  actualHours?: number;
  workTypeCode?: string;
  summary?: string | null;
  isActive?: boolean;
  memo?: string | null;
}

export interface TaskAiIndexBackfillRequest {
  taskIds?: string[];
  limit?: number;
  includeInactive?: boolean;
  reasonCode?: string;
}

export interface TaskAiIndexBackfillItem {
  taskId: string;
  status: 'queued' | 'failed';
  errorMessage?: string;
}

export interface TaskAiIndexBackfillResponse {
  sourceApp: 'pms';
  entityType: 'task';
  jobType: 'backfill';
  projectId: string;
  requestedCount: number;
  selectedCount: number;
  queuedCount: number;
  failedCount: number;
  limit: number;
  includeInactive: boolean;
  reasonCode: string;
  items: TaskAiIndexBackfillItem[];
}
