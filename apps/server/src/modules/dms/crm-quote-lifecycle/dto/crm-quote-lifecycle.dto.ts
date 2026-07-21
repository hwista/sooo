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
  DmsCrmQuoteLifecycleExecutionRequest,
  DmsCrmQuoteLifecycleStep,
  DmsCrmQuoteLifecycleVariable,
} from '@ssoo/types/dms';

const DMS_CRM_QUOTE_LIFECYCLE_STEP_KEYS = [
  'markdown-draft',
  'template-review',
  'word-export',
  'pdf-export',
] as const;

const DMS_CRM_QUOTE_LIFECYCLE_OWNERS = ['crm', 'dms'] as const;
const DMS_CRM_QUOTE_LIFECYCLE_STATUSES = ['ready', 'pending', 'blocked', 'completed'] as const;

export class DmsCrmQuoteLifecycleVariableDto implements DmsCrmQuoteLifecycleVariable {
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

export class DmsCrmQuoteLifecycleStepDto implements DmsCrmQuoteLifecycleStep {
  @ApiProperty({ description: 'Lifecycle step key', enum: DMS_CRM_QUOTE_LIFECYCLE_STEP_KEYS })
  @IsIn(DMS_CRM_QUOTE_LIFECYCLE_STEP_KEYS)
  key!: DmsCrmQuoteLifecycleStep['key'];

  @ApiProperty({ description: 'Lifecycle step label' })
  @IsString()
  @MaxLength(200)
  label!: string;

  @ApiProperty({ description: 'Lifecycle owner', enum: DMS_CRM_QUOTE_LIFECYCLE_OWNERS })
  @IsIn(DMS_CRM_QUOTE_LIFECYCLE_OWNERS)
  owner!: DmsCrmQuoteLifecycleStep['owner'];

  @ApiProperty({ description: 'Lifecycle status', enum: DMS_CRM_QUOTE_LIFECYCLE_STATUSES })
  @IsIn(DMS_CRM_QUOTE_LIFECYCLE_STATUSES)
  status!: DmsCrmQuoteLifecycleStep['status'];

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

export class DmsCrmQuoteLifecycleExecutionDto implements DmsCrmQuoteLifecycleExecutionRequest {
  @ApiProperty({ description: 'CRM 영업기회 ID' })
  @IsString()
  @MaxLength(80)
  opportunityId!: string;

  @ApiProperty({ description: 'CRM 영업기회 코드' })
  @IsString()
  @MaxLength(120)
  opportunityCode!: string;

  @ApiProperty({ description: 'CRM 견적번호' })
  @IsString()
  @MaxLength(120)
  quoteNumber!: string;

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

  @ApiProperty({ description: '문서 변수 snapshot', type: [DmsCrmQuoteLifecycleVariableDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DmsCrmQuoteLifecycleVariableDto)
  variables!: DmsCrmQuoteLifecycleVariableDto[];

  @ApiProperty({ description: 'CRM handoff lifecycle snapshot', type: [DmsCrmQuoteLifecycleStepDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DmsCrmQuoteLifecycleStepDto)
  lifecycle!: DmsCrmQuoteLifecycleStepDto[];

  @ApiPropertyOptional({ description: '실행 메모' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  memo?: string;
}
