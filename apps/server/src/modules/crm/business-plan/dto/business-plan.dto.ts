import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type {
  CrmBusinessPlanCarryForwardRequest,
  CrmBusinessPlanListQuery,
  CrmBusinessPlanMonthlyPlanInputRequest,
  CrmBusinessPlanPerformanceActualInputRequest,
  CrmBusinessPlanPerformanceQuery,
  CrmBusinessPlanPreviewQuery,
  CrmBusinessPlanPreviewRegion,
  CrmBusinessPlanSnapshotRequest,
  CrmBusinessPlanStatus,
} from '@ssoo/types/crm';

const CRM_BUSINESS_PLAN_PREVIEW_REGIONS = ['all', 'domestic', 'overseas'] as const;
const CRM_BUSINESS_PLAN_INPUT_REGIONS = ['domestic', 'overseas'] as const;
const CRM_BUSINESS_PLAN_STATUSES = ['all', 'draft', 'confirmed'] as const;

export class CrmBusinessPlanPreviewQueryDto implements CrmBusinessPlanPreviewQuery {
  @ApiPropertyOptional({ description: '3개년 preview 시작 사업년도', default: new Date().getFullYear() })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @IsOptional()
  baseYear?: number;

  @ApiPropertyOptional({ description: '사업구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  businessType?: string;

  @ApiPropertyOptional({ description: '계열/산업 구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  industryLine?: string;

  @ApiPropertyOptional({ description: '국내/해외', enum: CRM_BUSINESS_PLAN_PREVIEW_REGIONS, default: 'all' })
  @IsString()
  @IsIn(CRM_BUSINESS_PLAN_PREVIEW_REGIONS)
  @IsOptional()
  region?: CrmBusinessPlanPreviewRegion;

  @ApiPropertyOptional({ description: '고객/건명/담당자/WBS 검색어', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;
}

export class CrmBusinessPlanPerformanceQueryDto implements CrmBusinessPlanPerformanceQuery {
  @ApiPropertyOptional({ description: '사업계획대비실적 preview 기준 사업년도', default: new Date().getFullYear() })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ description: '사업구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  businessType?: string;

  @ApiPropertyOptional({ description: '계열/산업 구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  industryLine?: string;

  @ApiPropertyOptional({ description: '국내/해외', enum: CRM_BUSINESS_PLAN_PREVIEW_REGIONS, default: 'all' })
  @IsString()
  @IsIn(CRM_BUSINESS_PLAN_PREVIEW_REGIONS)
  @IsOptional()
  region?: CrmBusinessPlanPreviewRegion;

  @ApiPropertyOptional({ description: '고객/건명/담당자/WBS 검색어', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;
}

export class CrmBusinessPlanListQueryDto implements CrmBusinessPlanListQuery {
  @ApiPropertyOptional({ description: '사업계획 기준년도. 생략하면 전체 연도', default: new Date().getFullYear() })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @IsOptional()
  baseYear?: number;

  @ApiPropertyOptional({ description: '사업계획 상태', enum: CRM_BUSINESS_PLAN_STATUSES, default: 'all' })
  @IsString()
  @IsIn(CRM_BUSINESS_PLAN_STATUSES)
  @IsOptional()
  status?: CrmBusinessPlanStatus | 'all';

  @ApiPropertyOptional({ description: '차수명/코드/필터 검색어', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;
}

export class CrmBusinessPlanSnapshotDto extends CrmBusinessPlanPreviewQueryDto implements CrmBusinessPlanSnapshotRequest {
  @ApiPropertyOptional({ description: '저장할 사업계획 차수명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  planName?: string;

  @ApiPropertyOptional({ description: '차수 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmBusinessPlanCarryForwardDto extends CrmBusinessPlanSnapshotDto implements CrmBusinessPlanCarryForwardRequest {
  @ApiPropertyOptional({ description: '이월 원천 사업계획 기준년도. 생략하면 baseYear - 1', default: new Date().getFullYear() - 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @IsOptional()
  sourceBaseYear?: number;
}

export class CrmBusinessPlanMonthlyPlanInputDto implements CrmBusinessPlanMonthlyPlanInputRequest {
  @ApiPropertyOptional({ description: '1월부터 12월까지의 직접 입력 계획 매출', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  monthlyRevenueAmounts!: number[];

  @ApiPropertyOptional({ description: '월별 입력 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmBusinessPlanPerformanceActualInputDto implements CrmBusinessPlanPerformanceActualInputRequest {
  @ApiPropertyOptional({ description: '사업계획대비실적 직접 입력 기준년도', default: new Date().getFullYear() })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  year!: number;

  @ApiPropertyOptional({ description: '사업구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  businessType!: string;

  @ApiPropertyOptional({ description: '계열/산업 구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  industryLine!: string;

  @ApiPropertyOptional({ description: '담당자', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  ownerName!: string;

  @ApiPropertyOptional({ description: '국내/해외', enum: CRM_BUSINESS_PLAN_INPUT_REGIONS, default: 'domestic' })
  @IsString()
  @IsIn(CRM_BUSINESS_PLAN_INPUT_REGIONS)
  region!: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;

  @ApiPropertyOptional({ description: 'WBS 코드', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  wbsCode?: string;

  @ApiPropertyOptional({ description: '1월부터 12월까지의 직접 입력 실적 매출', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  monthlyRevenueAmounts!: number[];

  @ApiPropertyOptional({ description: '1월부터 12월까지의 직접 입력 실적 원가', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  monthlyCostAmounts!: number[];

  @ApiPropertyOptional({ description: '직접 실적 입력 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}
