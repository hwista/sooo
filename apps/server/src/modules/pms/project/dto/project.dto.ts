export class ProjectLifecycleDto {
  phase!: string;
  status!: string;
  terminalReason!: string | null;
}

export class ProjectDto {
  id!: string;
  projectCode!: string;
  projectName!: string;
  statusCode!: string | null;
  stageCode!: string | null;
  doneResultCode!: string | null;
  customerId?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  customerOrganizationId?: string | null;
  customerOrganizationCode?: string | null;
  customerOrganizationName?: string | null;
  customerOrganizationType?: string | null;
  customerOrganizationScope?: string | null;
  plantId?: string | null;
  plantSiteCode?: string | null;
  plantSiteName?: string | null;
  plantSiteTypeCode?: string | null;
  plantSiteRegionCode?: string | null;
  plantSiteOperationOwnerName?: string | null;
  systemInstanceId?: string | null;
  systemInstanceCode?: string | null;
  systemInstanceName?: string | null;
  systemInstanceEnvironmentCode?: string | null;
  systemInstanceOperationOwnerTypeCode?: string | null;
  systemInstanceOperationOwnerName?: string | null;
  systemInstanceLifecycleStatusCode?: string | null;
  ownerOrganizationId?: string | null;
  lifecycle!: ProjectLifecycleDto;
  createdAt!: Date;
  updatedAt!: Date | null;
}

export class ProjectListDto {
  data!: ProjectDto[];
  meta!: { page: number; limit: number; total: number };
}

export class TransitionResultDto {
  previousStatusCode!: string;
  previousStageCode!: string;
  currentStatusCode!: string;
  currentStageCode!: string;
  doneResultCode!: string | null;
  advancedToNextStatus!: boolean;
  previousLifecycle!: ProjectLifecycleDto;
  currentLifecycle!: ProjectLifecycleDto;
}
