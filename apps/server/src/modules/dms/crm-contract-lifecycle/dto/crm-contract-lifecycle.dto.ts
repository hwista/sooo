import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type {
  DmsCrmContractLifecycleAttachment,
  DmsCrmContractLifecycleExecutionRequest,
  DmsCrmContractLifecycleStep,
  DmsCrmContractLifecycleVariable,
} from '@ssoo/types/dms';

const DMS_CRM_CONTRACT_LIFECYCLE_STEP_KEYS = [
  'markdown-draft',
  'template-review',
  'attachment-confirmation',
  'word-export',
  'pdf-export',
  'approval',
] as const;

const DMS_CRM_CONTRACT_LIFECYCLE_OWNERS = ['crm', 'dms'] as const;
const DMS_CRM_CONTRACT_LIFECYCLE_STATUSES = ['ready', 'pending', 'blocked', 'completed'] as const;

export class DmsCrmContractLifecycleVariableDto implements DmsCrmContractLifecycleVariable {
  @ApiProperty({ description: 'DMS 템플릿 변수 key' })
  @IsString()
  @MaxLength(120)
  key!: string;

  @ApiProperty({ description: '변수 표시명' })
  @IsString()
  @MaxLength(200)
  label!: string;

  @ApiProperty({ description: '변수 값' })
  @IsString()
  @MaxLength(2000)
  value!: string;

  @ApiProperty({ description: '필수 변수 여부' })
  @IsBoolean()
  required!: boolean;

  @ApiProperty({ description: '변수 출처' })
  @IsString()
  @MaxLength(80)
  source!: string;
}

export class DmsCrmContractLifecycleAttachmentDto implements DmsCrmContractLifecycleAttachment {
  @ApiProperty({ description: '첨부 key' })
  @IsString()
  @MaxLength(120)
  key!: string;

  @ApiProperty({ description: '첨부 표시명' })
  @IsString()
  @MaxLength(200)
  label!: string;

  @ApiProperty({ description: 'CRM handoff attachment 상태' })
  @IsString()
  @MaxLength(40)
  status!: string;

  @ApiPropertyOptional({ description: '첨부 evidence label' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  evidenceLabel?: string;

  @ApiPropertyOptional({ description: '첨부 evidence path' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  evidencePath?: string;

  @ApiProperty({ description: '첨부 메모' })
  @IsString()
  @MaxLength(2000)
  note!: string;
}

export class DmsCrmContractLifecycleStepDto implements DmsCrmContractLifecycleStep {
  @ApiProperty({ description: 'Lifecycle step key', enum: DMS_CRM_CONTRACT_LIFECYCLE_STEP_KEYS })
  @IsIn(DMS_CRM_CONTRACT_LIFECYCLE_STEP_KEYS)
  key!: DmsCrmContractLifecycleStep['key'];

  @ApiProperty({ description: 'Lifecycle step label' })
  @IsString()
  @MaxLength(200)
  label!: string;

  @ApiProperty({ description: 'Lifecycle owner', enum: DMS_CRM_CONTRACT_LIFECYCLE_OWNERS })
  @IsIn(DMS_CRM_CONTRACT_LIFECYCLE_OWNERS)
  owner!: DmsCrmContractLifecycleStep['owner'];

  @ApiProperty({ description: 'Lifecycle status', enum: DMS_CRM_CONTRACT_LIFECYCLE_STATUSES })
  @IsIn(DMS_CRM_CONTRACT_LIFECYCLE_STATUSES)
  status!: DmsCrmContractLifecycleStep['status'];

  @ApiProperty({ description: 'Evidence label' })
  @IsString()
  @MaxLength(200)
  evidenceLabel!: string;

  @ApiPropertyOptional({ description: 'Evidence path' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  evidencePath?: string;

  @ApiProperty({ description: 'Lifecycle note' })
  @IsString()
  @MaxLength(2000)
  note!: string;

  @ApiPropertyOptional({ description: 'Blocking reasons', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockingReasons?: string[];
}

export class DmsCrmContractLifecycleExecutionDto implements DmsCrmContractLifecycleExecutionRequest {
  @ApiProperty({ description: 'CRM 계약 ID' })
  @IsString()
  @MaxLength(80)
  contractId!: string;

  @ApiProperty({ description: 'CRM 계약 코드' })
  @IsString()
  @MaxLength(120)
  contractCode!: string;

  @ApiProperty({ description: '문서 제목' })
  @IsString()
  @MaxLength(240)
  documentTitle!: string;

  @ApiProperty({ description: 'DMS 템플릿 key' })
  @IsString()
  @MaxLength(120)
  templateKey!: string;

  @ApiProperty({ description: 'DMS markdown 초안 경로' })
  @IsString()
  @MaxLength(1000)
  draftPath!: string;

  @ApiProperty({ description: '문서 변수 snapshot', type: [DmsCrmContractLifecycleVariableDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DmsCrmContractLifecycleVariableDto)
  variables!: DmsCrmContractLifecycleVariableDto[];

  @ApiProperty({ description: '첨부 snapshot', type: [DmsCrmContractLifecycleAttachmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DmsCrmContractLifecycleAttachmentDto)
  attachments!: DmsCrmContractLifecycleAttachmentDto[];

  @ApiProperty({ description: 'CRM handoff lifecycle snapshot', type: [DmsCrmContractLifecycleStepDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DmsCrmContractLifecycleStepDto)
  lifecycle!: DmsCrmContractLifecycleStepDto[];

  @ApiPropertyOptional({ description: '실행 메모' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  memo?: string;
}
