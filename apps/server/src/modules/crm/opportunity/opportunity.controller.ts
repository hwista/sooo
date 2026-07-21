import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { CrmOpportunityListQuery, CrmOpportunityOwnerLookupQuery } from '@ssoo/types/crm';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmAccessService } from '../access/access.service.js';
import { CrmOpportunityFeatureGuard } from '../access/crm-opportunity-feature.guard.js';
import { RequireCrmOpportunityFeature } from '../access/require-crm-opportunity-feature.decorator.js';
import {
  CrmOpportunityContractConversionDto,
  CrmOpportunityQuoteWorkflowDto,
  CrmOpportunityUpsertDto,
  CrmQuoteDmsDocumentDraftDto,
  CrmQuoteDmsDocumentExecutionEvidenceDto,
  CrmQuoteDmsDocumentLifecycleExecutionDto,
} from './dto/opportunity.dto.js';
import { OpportunityService } from './opportunity.service.js';

@ApiTags('crm-opportunities')
@ApiBearerAuth()
@Controller('crm/opportunities')
@UseGuards(RolesGuard, CrmOpportunityFeatureGuard)
export class OpportunityController {
  constructor(
    private readonly opportunityService: OpportunityService,
    private readonly accessService: CrmAccessService,
  ) {}

  @Get()
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 영업기회 현황 데모 목록' })
  @ApiOkResponse({ description: 'CRM 영업기회 목록과 요약' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 영업기회 조회 권한 없음' })
  async list(@Query() query: CrmOpportunityListQuery) {
    return success(await this.opportunityService.listResponse(query));
  }

  @Get('access/me')
  @ApiOperation({ summary: 'CRM 영업기회 전역 접근 스냅샷' })
  @ApiOkResponse({ description: 'CRM 영업기회 전역 접근 스냅샷' })
  async myAccess(@CurrentUser() currentUser: TokenPayload) {
    return success(await this.accessService.getGlobalOpportunityAccess(currentUser));
  }

  @Get('owners/lookup')
  @RequireCrmOpportunityFeature('canCreateOpportunity')
  @ApiOperation({ summary: 'CRM 영업기회 담당자 공용 사용자 조회' })
  @ApiOkResponse({ description: 'CRM 영업기회 담당자 후보 사용자 목록' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 영업기회 생성 권한 없음' })
  async ownerLookup(@Query() query: CrmOpportunityOwnerLookupQuery) {
    return success(await this.opportunityService.findOwnerLookup(query));
  }

  @Get(':id/access')
  @RequireCrmOpportunityFeature('canViewOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 접근 스냅샷' })
  @ApiOkResponse({ description: 'CRM 영업기회 접근 스냅샷' })
  async access(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.accessService.getOpportunityAccess(id, currentUser));
  }

  @Get(':id/quote-preview')
  @RequireCrmOpportunityFeature('canViewOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 견적 후보 미리보기' })
  @ApiOkResponse({ description: '영업기회 원장 기반 읽기 전용 견적 후보' })
  async quotePreview(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.opportunityService.getQuotePreview(id, currentUser));
  }

  @Post(':id/quote-dms-document-draft')
  @RequireCrmOpportunityFeature('canEditOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 견적 DMS markdown 초안 저장' })
  @ApiBody({ type: CrmQuoteDmsDocumentDraftDto })
  @ApiOkResponse({ description: '견적 DMS draft handoff snapshot' })
  async createQuoteDmsDocumentDraft(
    @Param('id') id: string,
    @Body() body: CrmQuoteDmsDocumentDraftDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.opportunityService.createQuoteDmsDocumentDraft(id, body, currentUser));
  }

  @Post(':id/quote-dms-document-execution-evidence')
  @RequireCrmOpportunityFeature('canEditOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 견적 DMS execution evidence 수신' })
  @ApiBody({ type: CrmQuoteDmsDocumentExecutionEvidenceDto })
  @ApiOkResponse({ description: '견적 DMS lifecycle evidence가 반영된 handoff snapshot' })
  async recordQuoteDmsDocumentExecutionEvidence(
    @Param('id') id: string,
    @Body() body: CrmQuoteDmsDocumentExecutionEvidenceDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.opportunityService.recordQuoteDmsDocumentExecutionEvidence(id, body, currentUser));
  }

  @Post(':id/quote-dms-document-lifecycle-execution')
  @RequireCrmOpportunityFeature('canEditOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 견적 handoff 기반 DMS lifecycle artifact 실행' })
  @ApiBody({ type: CrmQuoteDmsDocumentLifecycleExecutionDto })
  @ApiOkResponse({ description: 'DMS 견적 artifact 생성과 CRM evidence snapshot 반영 결과' })
  async executeQuoteDmsDocumentLifecycle(
    @Param('id') id: string,
    @Body() body: CrmQuoteDmsDocumentLifecycleExecutionDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.opportunityService.executeQuoteDmsDocumentLifecycle(id, body, currentUser));
  }

  @Put(':id/quote-workflow')
  @RequireCrmOpportunityFeature('canEditOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 견적 상태 저장' })
  @ApiBody({ type: CrmOpportunityQuoteWorkflowDto })
  @ApiOkResponse({ description: '견적 상태가 반영된 영업기회 견적 후보' })
  async updateQuoteWorkflow(
    @Param('id') id: string,
    @Body() body: CrmOpportunityQuoteWorkflowDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.opportunityService.updateQuoteWorkflow(id, body, BigInt(currentUser.userId), currentUser));
  }

  @Get(':id')
  @RequireCrmOpportunityFeature('canViewOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 상세' })
  @ApiOkResponse({ description: 'CRM 영업기회 상세' })
  async detail(@Param('id') id: string) {
    return success(await this.opportunityService.getOpportunity(id));
  }

  @Post()
  @RequireCrmOpportunityFeature('canCreateOpportunity')
  @ApiOperation({ summary: 'CRM 영업기회 생성' })
  @ApiBody({ type: CrmOpportunityUpsertDto })
  @ApiOkResponse({ description: '생성된 CRM 영업기회' })
  async create(@Body() body: CrmOpportunityUpsertDto) {
    return success(await this.opportunityService.createOpportunity(body));
  }

  @Put(':id')
  @RequireCrmOpportunityFeature('canEditOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 수정' })
  @ApiBody({ type: CrmOpportunityUpsertDto })
  @ApiOkResponse({ description: '수정된 CRM 영업기회' })
  async update(@Param('id') id: string, @Body() body: CrmOpportunityUpsertDto) {
    return success(await this.opportunityService.updateOpportunity(id, body));
  }

  @Post(':id/confirm')
  @RequireCrmOpportunityFeature('canConfirmOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 확정' })
  @ApiOkResponse({ description: '확정된 CRM 영업기회' })
  async confirm(@Param('id') id: string) {
    return success(await this.opportunityService.confirmOpportunity(id));
  }

  @Post(':id/reopen')
  @RequireCrmOpportunityFeature('canConfirmOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 확정 해제' })
  @ApiOkResponse({ description: '확정 해제된 CRM 영업기회' })
  async reopen(@Param('id') id: string) {
    return success(await this.opportunityService.reopenOpportunity(id));
  }

  @Post(':id/convert-contract')
  @RequireCrmOpportunityFeature('canConfirmOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 계약 전환' })
  @ApiBody({ type: CrmOpportunityContractConversionDto })
  @ApiOkResponse({ description: '계약으로 전환된 영업기회와 생성된 CRM 계약' })
  async convertContract(
    @Param('id') id: string,
    @Body() body: CrmOpportunityContractConversionDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.opportunityService.convertOpportunityToContract(id, body, BigInt(currentUser.userId)));
  }

  @Get(':id/versions')
  @RequireCrmOpportunityFeature('canViewOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 차수 목록' })
  @ApiOkResponse({ description: '영업기회 차수 목록' })
  async versions(@Param('id') id: string) {
    return success(await this.opportunityService.listOpportunityVersions(id));
  }

  @Get(':id/history')
  @RequireCrmOpportunityFeature('canViewOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 변경 이력' })
  @ApiOkResponse({ description: '영업기회 변경 이력' })
  async history(@Param('id') id: string) {
    return success(await this.opportunityService.listOpportunityHistory(id));
  }

  @Post(':id/versions')
  @RequireCrmOpportunityFeature('canAddVersion', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 차수 추가' })
  @ApiOkResponse({ description: '추가된 CRM 영업기회 차수' })
  async addVersion(@Param('id') id: string) {
    return success(await this.opportunityService.addOpportunityVersion(id));
  }
}
