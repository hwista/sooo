import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DeliverableService } from './deliverable.service.js';
import { CloseoutApprovalService } from './closeout-approval.service.js';
import { ProjectFeatureGuard } from '../project/project-feature.guard.js';
import { RequireProjectFeature } from '../project/require-project-feature.decorator.js';
import { success, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import {
  ApplyDeliverableTemplateDto,
  DeliverableTemplateGroupDto,
  DeliverableTemplateApplyResultDto,
  ProjectDeliverableDto,
  ProjectCloseoutApprovalStepDto,
  UpsertCloseoutApprovalRouteDto,
  UpsertDeliverableTemplateGroupDto,
  UpsertDeliverableDto,
  UpdateSubmissionDto,
  DecideCloseoutApprovalStepDto,
} from './dto/deliverable.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags('project-deliverables')
@ApiBearerAuth()
@Controller('projects/:projectId/deliverables')
@UseGuards(RolesGuard, ProjectFeatureGuard)
export class DeliverableController {
  constructor(
    private readonly deliverableService: DeliverableService,
    private readonly closeoutApprovalService: CloseoutApprovalService,
  ) {}

  @Get()
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 산출물 목록' })
  @ApiOkResponse({ type: [ProjectDeliverableDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('statusCode') statusCode?: string,
  ) {
    const data = await this.deliverableService.findByProject(BigInt(projectId), statusCode);
    return success(data.map((d) => serializeBigInt(d)));
  }

  @Post('template')
  @RequireProjectFeature('canManageDeliverables')
  @ApiOperation({ summary: '프로젝트 산출물 기본 템플릿 적용' })
  @ApiOkResponse({ type: DeliverableTemplateApplyResultDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async applyTemplate(
    @Param('projectId') projectId: string,
    @Body() dto: ApplyDeliverableTemplateDto,
  ) {
    const result = await this.deliverableService.applyTemplate(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Get('templates')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '산출물 템플릿 그룹 목록' })
  @ApiOkResponse({ type: [DeliverableTemplateGroupDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findTemplateGroups() {
    const data = await this.deliverableService.findTemplateGroups();
    return success(serializeBigInt(data));
  }

  @Post('templates')
  @RequireProjectFeature('canManageDeliverables')
  @ApiOperation({ summary: '산출물 템플릿 그룹 저장' })
  @ApiOkResponse({ type: DeliverableTemplateGroupDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async upsertTemplateGroup(@Body() dto: UpsertDeliverableTemplateGroupDto) {
    const result = await this.deliverableService.upsertTemplateGroup(dto);
    return success(serializeBigInt(result));
  }

  @Post()
  @RequireProjectFeature('canManageDeliverables')
  @ApiOperation({ summary: '프로젝트 산출물 등록/수정' })
  @ApiOkResponse({ type: ProjectDeliverableDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async upsert(@Param('projectId') projectId: string, @Body() dto: UpsertDeliverableDto) {
    const result = await this.deliverableService.upsert(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Patch(':statusCode/:deliverableCode/submission')
  @RequireProjectFeature('canManageDeliverables')
  @ApiOperation({ summary: '산출물 제출 상태 변경' })
  @ApiOkResponse({ type: ProjectDeliverableDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async updateSubmission(
    @Param('projectId') projectId: string,
    @Param('statusCode') statusCode: string,
    @Param('deliverableCode') deliverableCode: string,
    @Body() dto: UpdateSubmissionDto,
  ) {
    const result = await this.deliverableService.updateSubmission(
      BigInt(projectId),
      statusCode,
      deliverableCode,
      dto,
    );
    return success(serializeBigInt(result));
  }

  @Put(':statusCode/:deliverableCode/approval-steps')
  @RequireProjectFeature('canManageDeliverables')
  @ApiOperation({ summary: '산출물 승인선 저장' })
  @ApiOkResponse({ type: [ProjectCloseoutApprovalStepDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async replaceApprovalRoute(
    @Param('projectId') projectId: string,
    @Param('statusCode') statusCode: string,
    @Param('deliverableCode') deliverableCode: string,
    @Body() dto: UpsertCloseoutApprovalRouteDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const result = await this.closeoutApprovalService.replaceRoute(
      {
        projectId: BigInt(projectId),
        statusCode,
        targetTypeCode: 'deliverable',
        targetCode: deliverableCode,
      },
      dto,
      BigInt(currentUser.userId),
    );
    return success(serializeBigInt(result));
  }

  @Patch(':statusCode/:deliverableCode/approval-steps/:approvalStepId/decision')
  @RequireProjectFeature('canManageDeliverables')
  @ApiOperation({ summary: '산출물 승인 단계 승인/반려' })
  @ApiOkResponse({ type: [ProjectCloseoutApprovalStepDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async decideApprovalStep(
    @Param('projectId') projectId: string,
    @Param('statusCode') statusCode: string,
    @Param('deliverableCode') deliverableCode: string,
    @Param('approvalStepId') approvalStepId: string,
    @Body() dto: DecideCloseoutApprovalStepDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const result = await this.closeoutApprovalService.decideStep(
      {
        projectId: BigInt(projectId),
        statusCode,
        targetTypeCode: 'deliverable',
        targetCode: deliverableCode,
      },
      BigInt(approvalStepId),
      dto,
      BigInt(currentUser.userId),
    );
    return success(serializeBigInt(result));
  }

  @Delete(':statusCode/:deliverableCode')
  @RequireProjectFeature('canManageDeliverables')
  @ApiOperation({ summary: '프로젝트 산출물 삭제' })
  @ApiOkResponse({ description: '산출물 삭제 완료' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('statusCode') statusCode: string,
    @Param('deliverableCode') deliverableCode: string,
  ) {
    await this.deliverableService.delete(BigInt(projectId), statusCode, deliverableCode);
    return deleted(true);
  }
}
