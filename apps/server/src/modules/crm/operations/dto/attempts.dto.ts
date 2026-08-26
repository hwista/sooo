import { ApiPropertyOptional } from '@nestjs/swagger';
import type {
  CrmOperationAttemptListQuery,
  CrmOperationAttemptStatus,
  CrmOperationAttemptTarget,
} from '@ssoo/types/crm';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CrmOperationAttemptListQueryDto implements CrmOperationAttemptListQuery {
  @ApiPropertyOptional({ enum: ['dms', 'pms', 'accounting'] })
  @IsOptional()
  @IsIn(['dms', 'pms', 'accounting'])
  target?: CrmOperationAttemptTarget;

  @ApiPropertyOptional({ enum: ['queued', 'running', 'succeeded', 'failed', 'cancelled'] })
  @IsOptional()
  @IsIn(['queued', 'running', 'succeeded', 'failed', 'cancelled'])
  status?: CrmOperationAttemptStatus;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceEntityId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
