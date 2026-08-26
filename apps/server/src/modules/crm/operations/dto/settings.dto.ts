import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CrmAccountingProviderMode, CrmSettingsUpdateRequest } from '@ssoo/types/crm';
import {
  IsBoolean,
  Equals,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateCrmSettingsDto implements CrmSettingsUpdateRequest {
  @ApiProperty({ minimum: 1, description: '마지막으로 조회한 설정 revision' })
  @IsInt()
  @Min(1)
  expectedRevision!: number;

  @ApiProperty({ description: 'DMS 견적 DOCX 템플릿 key', example: 'crm-quote-v1' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  quoteTemplateKey!: string;

  @ApiProperty({ description: 'DMS 계약 DOCX 템플릿 key', example: 'crm-contract-v1' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  contractTemplateKey!: string;

  @ApiProperty()
  @IsBoolean()
  @Equals(true, { message: 'DMS 문서 인계는 CRM 런칭 필수 경계이므로 비활성화할 수 없습니다.' })
  dmsHandoffEnabled!: boolean;

  @ApiProperty()
  @IsBoolean()
  pmsHandoffEnabled!: boolean;

  @ApiProperty()
  @IsBoolean()
  accountingHandoffEnabled!: boolean;

  @ApiProperty({ enum: ['disabled', 'external-api'] })
  @IsIn(['disabled', 'external-api'])
  accountingProviderMode!: CrmAccountingProviderMode;

  @ApiProperty({ minimum: 5, maximum: 1440 })
  @IsInt()
  @Min(5)
  @Max(1440)
  stalledAfterMinutes!: number;

  @ApiProperty({ minimum: 7, maximum: 3650 })
  @IsInt()
  @Min(7)
  @Max(3650)
  attemptRetentionDays!: number;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  memo?: string;
}
