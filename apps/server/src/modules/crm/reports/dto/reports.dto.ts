import { ApiPropertyOptional } from '@nestjs/swagger';
import type {
  CrmReportsConfirmRequest,
  CrmReportsPreviewQuery,
  CrmReportsPreviewRegion,
} from '@ssoo/types/crm';

export class CrmReportsPreviewQueryDto implements CrmReportsPreviewQuery {
  @ApiPropertyOptional({ description: '조회 사업년도', example: 2026 })
  year?: number;

  @ApiPropertyOptional({ description: '사업구분 필터', maxLength: 120 })
  businessType?: string;

  @ApiPropertyOptional({ description: '계열/산업 필터', maxLength: 120 })
  industryLine?: string;

  @ApiPropertyOptional({ description: '국내/해외 필터', enum: ['all', 'domestic', 'overseas'], default: 'all' })
  region?: CrmReportsPreviewRegion;

  @ApiPropertyOptional({ description: '고객/건명/담당자/WBS 검색어', maxLength: 200 })
  search?: string;
}

export class CrmReportsConfirmDto extends CrmReportsPreviewQueryDto implements CrmReportsConfirmRequest {
  @ApiPropertyOptional({ description: '보고 확정 메모', maxLength: 1000 })
  memo?: string;
}
