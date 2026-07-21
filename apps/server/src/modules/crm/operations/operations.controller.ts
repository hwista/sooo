import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CrmOpportunityFeatureGuard } from '../access/crm-opportunity-feature.guard.js';
import { RequireCrmOpportunityFeature } from '../access/require-crm-opportunity-feature.decorator.js';
import { CrmOperationsPreviewQueryDto } from './dto/operations.dto.js';
import { OperationsService } from './operations.service.js';

@ApiTags('crm-operations')
@ApiBearerAuth()
@Controller('crm/operations')
@UseGuards(RolesGuard, CrmOpportunityFeatureGuard)
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('preview')
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 운영 기준 preview' })
  @ApiOkResponse({ description: '원천 데모 시스템 관리 항목을 SSOO 공용 Admin/Auth/DMS 경계로 재해석한 읽기용 preview' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 운영 기준 preview 조회 권한 없음' })
  async preview(@Query() query: CrmOperationsPreviewQueryDto) {
    return success(await this.operationsService.getPreview(query));
  }
}
