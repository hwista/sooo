import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmOpportunityFeatureGuard } from '../access/crm-opportunity-feature.guard.js';
import { RequireCrmOpportunityFeature } from '../access/require-crm-opportunity-feature.decorator.js';
import { BusinessPlanService } from './business-plan.service.js';
import {
  CrmBusinessPlanCarryForwardDto,
  CrmBusinessPlanListQueryDto,
  CrmBusinessPlanMonthlyPlanInputDto,
  CrmBusinessPlanPerformanceActualInputDto,
  CrmBusinessPlanPerformanceQueryDto,
  CrmBusinessPlanPreviewQueryDto,
  CrmBusinessPlanSnapshotDto,
} from './dto/business-plan.dto.js';

@ApiTags('crm-business-plan')
@ApiBearerAuth()
@Controller('crm/business-plan')
@UseGuards(RolesGuard, CrmOpportunityFeatureGuard)
export class BusinessPlanController {
  constructor(private readonly businessPlanService: BusinessPlanService) {}

  @Get('plans')
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 사업계획 차수 원장 목록' })
  @ApiOkResponse({ description: '저장된 사업계획 차수와 확정 상태' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 사업계획 조회 권한 없음' })
  async plans(@Query() query: CrmBusinessPlanListQueryDto) {
    return success(await this.businessPlanService.listPlans(query));
  }

  @Post('plans/snapshot')
  @RequireCrmOpportunityFeature('canEditOpportunity')
  @ApiOperation({ summary: 'CRM 사업계획 preview를 차수 원장으로 저장' })
  @ApiBody({ type: CrmBusinessPlanSnapshotDto })
  @ApiOkResponse({ description: '저장된 사업계획 draft 차수' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 사업계획 저장 권한 없음' })
  async snapshot(@Body() body: CrmBusinessPlanSnapshotDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.createPlanSnapshot(body, BigInt(currentUser.userId)));
  }

  @Post('plans/carry-forward')
  @RequireCrmOpportunityFeature('canEditOpportunity')
  @ApiOperation({ summary: '전년도 확정 사업계획을 새 기준년도 draft 차수로 이월' })
  @ApiBody({ type: CrmBusinessPlanCarryForwardDto })
  @ApiOkResponse({ description: '전년 이월로 저장된 사업계획 draft 차수' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 사업계획 저장 권한 없음' })
  async carryForward(@Body() body: CrmBusinessPlanCarryForwardDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.createCarryForwardSnapshot(body, BigInt(currentUser.userId)));
  }

  @Post('plans/:id/lines/:lineId/monthly-plan')
  @RequireCrmOpportunityFeature('canEditOpportunity')
  @ApiOperation({ summary: 'CRM 사업계획 draft line 월별 계획 매출 직접 입력' })
  @ApiBody({ type: CrmBusinessPlanMonthlyPlanInputDto })
  @ApiOkResponse({ description: '월별 계획 입력이 반영된 사업계획 차수' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 사업계획 저장 권한 없음' })
  async updateMonthlyPlan(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() body: CrmBusinessPlanMonthlyPlanInputDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.businessPlanService.updateMonthlyPlanLine(
      id,
      lineId,
      body,
      BigInt(currentUser.userId),
    ));
  }

  @Post('performance-actual/monthly')
  @RequireCrmOpportunityFeature('canEditOpportunity')
  @ApiOperation({ summary: 'CRM 사업계획대비실적 월별 실적 직접 입력' })
  @ApiBody({ type: CrmBusinessPlanPerformanceActualInputDto })
  @ApiOkResponse({ description: '월별 실적 직접 입력이 반영된 조정 원장' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 사업계획대비실적 직접 입력 권한 없음' })
  async savePerformanceActual(
    @Body() body: CrmBusinessPlanPerformanceActualInputDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.businessPlanService.savePerformanceActualInput(
      body,
      BigInt(currentUser.userId),
    ));
  }

  @Post('plans/:id/confirm')
  @RequireCrmOpportunityFeature('canConfirmOpportunity')
  @ApiOperation({ summary: 'CRM 사업계획 차수 확정' })
  @ApiOkResponse({ description: '확정된 사업계획 차수' })
  async confirm(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.confirmPlan(id, BigInt(currentUser.userId)));
  }

  @Post('plans/:id/reopen')
  @RequireCrmOpportunityFeature('canConfirmOpportunity')
  @ApiOperation({ summary: 'CRM 사업계획 차수 확정 해제' })
  @ApiOkResponse({ description: '확정 해제된 사업계획 차수' })
  async reopen(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.reopenPlan(id, BigInt(currentUser.userId)));
  }

  @Get('preview')
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 사업계획 3개년 preview' })
  @ApiOkResponse({ description: '영업기회 pipeline과 확정 계약 청구계획/실적 기반 읽기용 사업계획 후보' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 사업계획 preview 조회 권한 없음' })
  async preview(@Query() query: CrmBusinessPlanPreviewQueryDto) {
    return success(await this.businessPlanService.getPreview(query));
  }

  @Get('performance-preview')
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 사업계획대비실적 월별 preview' })
  @ApiOkResponse({ description: '영업기회 pipeline 후보와 확정 계약 월별 계획/실적 기반 읽기용 사업계획대비실적 후보' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 사업계획대비실적 preview 조회 권한 없음' })
  async performancePreview(@Query() query: CrmBusinessPlanPerformanceQueryDto) {
    return success(await this.businessPlanService.getPerformancePreview(query));
  }
}
