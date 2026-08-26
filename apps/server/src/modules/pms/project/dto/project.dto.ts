import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectLifecycleDto {
  @ApiProperty()
  phase!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  terminalReason!: string | null;
}

export class ProjectDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  projectCode!: string;

  @ApiProperty()
  projectName!: string;

  @ApiPropertyOptional({ nullable: true })
  statusCode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  stageCode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  doneResultCode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerOrganizationId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerOrganizationCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerOrganizationName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerOrganizationType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerOrganizationScope?: string | null;

  @ApiPropertyOptional({ nullable: true })
  plantId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  plantSiteCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  plantSiteName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  plantSiteTypeCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  plantSiteRegionCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  plantSiteOperationOwnerName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  systemInstanceId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  systemInstanceCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  systemInstanceName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  systemInstanceEnvironmentCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  systemInstanceOperationOwnerTypeCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  systemInstanceOperationOwnerName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  systemInstanceLifecycleStatusCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  ownerOrganizationId?: string | null;

  @ApiProperty({ type: ProjectLifecycleDto })
  lifecycle!: ProjectLifecycleDto;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  updatedAt!: Date | null;
}

export class TransitionResultDto {
  @ApiProperty()
  previousStatusCode!: string;

  @ApiProperty()
  previousStageCode!: string;

  @ApiProperty()
  currentStatusCode!: string;

  @ApiProperty()
  currentStageCode!: string;

  @ApiPropertyOptional({ nullable: true })
  doneResultCode!: string | null;

  @ApiProperty()
  advancedToNextStatus!: boolean;

  @ApiProperty({ type: ProjectLifecycleDto })
  previousLifecycle!: ProjectLifecycleDto;

  @ApiProperty({ type: ProjectLifecycleDto })
  currentLifecycle!: ProjectLifecycleDto;
}
