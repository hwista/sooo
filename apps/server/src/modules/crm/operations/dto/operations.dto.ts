import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';
import type { CrmOperationsPreviewQuery } from '@ssoo/types/crm';

export class CrmOperationsPreviewQueryDto implements CrmOperationsPreviewQuery {
  @ApiPropertyOptional({ description: '운영 기준 preview 기준 사업년도', default: new Date().getFullYear() })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @IsOptional()
  year?: number;
}
