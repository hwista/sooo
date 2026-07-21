import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { CrmContractListQuery } from '@ssoo/types/crm';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmOpportunityFeatureGuard } from '../access/crm-opportunity-feature.guard.js';
import { RequireCrmOpportunityFeature } from '../access/require-crm-opportunity-feature.decorator.js';
import { ContractService } from './contract.service.js';
import {
  CrmBillingSplitPreviewDto,
  CrmContractBillingActualUpsertDto,
  CrmContractDmsDocumentDraftDto,
  CrmContractDmsDocumentExecutionEvidenceDto,
  CrmContractDmsDocumentLifecycleExecutionDto,
  CrmContractPerformanceQueryDto,
  CrmContractUpsertDto,
} from './dto/contract.dto.js';

@ApiTags('crm-contracts')
@ApiBearerAuth()
@Controller('crm/contracts')
@UseGuards(RolesGuard, CrmOpportunityFeatureGuard)
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Get()
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 계약 현황 목록' })
  @ApiOkResponse({ description: 'CRM 계약 목록과 요약' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 계약 조회 권한 없음' })
  async list(@Query() query: CrmContractListQuery) {
    return success(await this.contractService.listResponse(query));
  }

  @Post('billing-split-preview')
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 계약 청구계획 자동 분할 미리보기' })
  @ApiBody({ type: CrmBillingSplitPreviewDto })
  @ApiOkResponse({ description: '계약 기간과 총액 기준 청구계획 분할 후보' })
  async billingSplitPreview(@Body() body: CrmBillingSplitPreviewDto) {
    return success(this.contractService.previewBillingSplit(body));
  }

  @Post()
  @RequireCrmOpportunityFeature('canCreateOpportunity')
  @ApiOperation({ summary: 'CRM 계약 생성' })
  @ApiBody({ type: CrmContractUpsertDto })
  @ApiOkResponse({ description: '생성된 CRM 계약' })
  async create(@Body() body: CrmContractUpsertDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.contractService.createContract(body, BigInt(currentUser.userId)));
  }

  @Get('monthly-performance')
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 계약대비실적 월별 조회' })
  @ApiOkResponse({ description: '확정 계약 기준 월별 청구계획/실적/차이' })
  async monthlyPerformance(@Query() query: CrmContractPerformanceQueryDto) {
    return success(await this.contractService.getMonthlyPerformance(query));
  }

  @Get(':id/billing-actual')
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 계약 청구실적 조회' })
  @ApiOkResponse({ description: '계약 청구계획 대비 실적' })
  async billingActual(@Param('id') id: string) {
    return success(await this.contractService.getBillingActual(id));
  }

  @Put(':id/billing-actual')
  @RequireCrmOpportunityFeature('canEditOpportunity')
  @ApiOperation({ summary: 'CRM 계약 청구실적 저장' })
  @ApiBody({ type: CrmContractBillingActualUpsertDto })
  @ApiOkResponse({ description: '저장된 계약 청구실적' })
  async updateBillingActual(
    @Param('id') id: string,
    @Body() body: CrmContractBillingActualUpsertDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.contractService.replaceBillingActual(id, body, BigInt(currentUser.userId)));
  }

  @Get(':id/pms-handoff-preview')
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 계약 기반 PMS 인계 후보 미리보기' })
  @ApiOkResponse({ description: 'PMS 실행 프로젝트 생성을 수행하지 않는 읽기용 계약 스냅샷' })
  async pmsHandoffPreview(@Param('id') id: string) {
    return success(await this.contractService.getPmsHandoffPreview(id));
  }

  @Get(':id/dms-document-preview')
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 계약 기반 DMS 계약서 문서 패킷 미리보기' })
  @ApiOkResponse({ description: 'DMS 저장 전 계약서 입력 패킷' })
  async dmsDocumentPreview(@Param('id') id: string) {
    return success(await this.contractService.getDmsDocumentPreview(id));
  }

  @Post(':id/dms-document-draft')
  @RequireCrmOpportunityFeature('canEditOpportunity')
  @ApiOperation({ summary: 'CRM 계약 DMS markdown 초안 저장' })
  @ApiBody({ type: CrmContractDmsDocumentDraftDto })
  @ApiOkResponse({ description: 'DMS markdown 초안 저장 결과' })
  async createDmsDocumentDraft(
    @Param('id') id: string,
    @Body() body: CrmContractDmsDocumentDraftDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.contractService.createDmsDocumentDraft(id, body, currentUser));
  }

  @Post(':id/dms-document-execution-evidence')
  @RequireCrmOpportunityFeature('canEditOpportunity')
  @ApiOperation({ summary: 'CRM 계약 DMS lifecycle 실행 evidence 기록' })
  @ApiBody({ type: CrmContractDmsDocumentExecutionEvidenceDto })
  @ApiOkResponse({ description: 'DMS 실행 evidence가 반영된 계약 문서 handoff snapshot' })
  async recordDmsDocumentExecutionEvidence(
    @Param('id') id: string,
    @Body() body: CrmContractDmsDocumentExecutionEvidenceDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.contractService.recordDmsDocumentExecutionEvidence(id, body, currentUser));
  }

  @Post(':id/dms-document-lifecycle-execution')
  @RequireCrmOpportunityFeature('canEditOpportunity')
  @ApiOperation({ summary: 'CRM 계약 handoff 기반 DMS lifecycle artifact 실행' })
  @ApiBody({ type: CrmContractDmsDocumentLifecycleExecutionDto })
  @ApiOkResponse({ description: 'DMS artifact 생성과 CRM evidence snapshot 반영 결과' })
  async executeDmsDocumentLifecycle(
    @Param('id') id: string,
    @Body() body: CrmContractDmsDocumentLifecycleExecutionDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.contractService.executeDmsDocumentLifecycle(id, body, currentUser));
  }

  @Get(':id')
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 계약 상세' })
  @ApiOkResponse({ description: 'CRM 계약 상세' })
  async detail(@Param('id') id: string) {
    return success(await this.contractService.getContract(id));
  }

  @Put(':id')
  @RequireCrmOpportunityFeature('canEditOpportunity')
  @ApiOperation({ summary: 'CRM 계약 수정' })
  @ApiBody({ type: CrmContractUpsertDto })
  @ApiOkResponse({ description: '수정된 CRM 계약' })
  async update(
    @Param('id') id: string,
    @Body() body: CrmContractUpsertDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.contractService.updateContract(id, body, BigInt(currentUser.userId)));
  }

  @Post(':id/confirm')
  @RequireCrmOpportunityFeature('canConfirmOpportunity')
  @ApiOperation({ summary: 'CRM 계약 확정' })
  @ApiOkResponse({ description: '확정된 CRM 계약' })
  async confirm(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.contractService.confirmContract(id, BigInt(currentUser.userId)));
  }

  @Post(':id/reopen')
  @RequireCrmOpportunityFeature('canConfirmOpportunity')
  @ApiOperation({ summary: 'CRM 계약 확정 해제' })
  @ApiOkResponse({ description: '확정 해제된 CRM 계약' })
  async reopen(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.contractService.reopenContract(id, BigInt(currentUser.userId)));
  }

  @Delete(':id')
  @RequireCrmOpportunityFeature('canEditOpportunity')
  @ApiOperation({ summary: 'CRM 계약 삭제' })
  @ApiOkResponse({ description: '삭제된 CRM 계약' })
  async delete(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.contractService.deleteContract(id, BigInt(currentUser.userId)));
  }
}
