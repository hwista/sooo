import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CloseConditionService } from './close-condition.service.js';
import { CloseoutApprovalService } from './closeout-approval.service.js';
import { ProjectFeatureGuard } from '../project/project-feature.guard.js';
import { RequireProjectFeature } from '../project/require-project-feature.decorator.js';
import { success, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import {
  ApplyCloseConditionTemplateDto,
  CloseConditionTemplateGroupDto,
  CloseConditionTemplateApplyResultDto,
  ProjectCloseConditionDto,
  ProjectCloseoutApprovalStepDto,
  UpsertCloseoutApprovalRouteDto,
  UpsertCloseConditionTemplateGroupDto,
  UpsertCloseConditionDto,
  ToggleCheckDto,
  DecideCloseoutApprovalStepDto,
} from './dto/deliverable.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags('project-close-conditions')
@ApiBearerAuth()
@Controller('projects/:projectId/close-conditions')
@UseGuards(RolesGuard, ProjectFeatureGuard)
export class CloseConditionController {
  constructor(
    private readonly closeConditionService: CloseConditionService,
    private readonly closeoutApprovalService: CloseoutApprovalService,
  ) {}

  @Get()
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 종료 조건 목록' })
  @ApiOkResponse({ type: [ProjectCloseConditionDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('statusCode') statusCode?: string,
  ) {
    const data = await this.closeConditionService.findByProject(BigInt(projectId), statusCode);
    return success(data.map((c) => serializeBigInt(c)));
  }

  @Post('template')
  @RequireProjectFeature('canManageCloseConditions')
  @ApiOperation({ summary: '프로젝트 종료조건 기본 템플릿 적용' })
  @ApiOkResponse({ type: CloseConditionTemplateApplyResultDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async applyTemplate(
    @Param('projectId') projectId: string,
    @Body() dto: ApplyCloseConditionTemplateDto,
  ) {
    const result = await this.closeConditionService.applyTemplate(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Get('templates')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '종료조건 템플릿 그룹 목록' })
  @ApiOkResponse({ type: [CloseConditionTemplateGroupDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findTemplateGroups() {
    const data = await this.closeConditionService.findTemplateGroups();
    return success(serializeBigInt(data));
  }

  @Post('templates')
  @RequireProjectFeature('canManageCloseConditions')
  @ApiOperation({ summary: '종료조건 템플릿 그룹 저장' })
  @ApiOkResponse({ type: CloseConditionTemplateGroupDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async upsertTemplateGroup(@Body() dto: UpsertCloseConditionTemplateGroupDto) {
    const result = await this.closeConditionService.upsertTemplateGroup(dto);
    return success(serializeBigInt(result));
  }

  @Post()
  @RequireProjectFeature('canManageCloseConditions')
  @ApiOperation({ summary: '프로젝트 종료 조건 등록/수정' })
  @ApiOkResponse({ type: ProjectCloseConditionDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async upsert(@Param('projectId') projectId: string, @Body() dto: UpsertCloseConditionDto) {
    const result = await this.closeConditionService.upsert(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Patch(':statusCode/:conditionCode/check')
  @RequireProjectFeature('canManageCloseConditions')
  @ApiOperation({ summary: '종료 조건 체크/해제' })
  @ApiOkResponse({ type: ProjectCloseConditionDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async toggleCheck(
    @Param('projectId') projectId: string,
    @Param('statusCode') statusCode: string,
    @Param('conditionCode') conditionCode: string,
    @Body() dto: ToggleCheckDto,
  ) {
    const result = await this.closeConditionService.toggleCheck(
      BigInt(projectId),
      statusCode,
      conditionCode,
      dto,
    );
    return success(serializeBigInt(result));
  }

  @Put(':statusCode/:conditionCode/approval-steps')
  @RequireProjectFeature('canManageCloseConditions')
  @ApiOperation({ summary: '종료조건 승인선 저장' })
  @ApiOkResponse({ type: [ProjectCloseoutApprovalStepDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async replaceApprovalRoute(
    @Param('projectId') projectId: string,
    @Param('statusCode') statusCode: string,
    @Param('conditionCode') conditionCode: string,
    @Body() dto: UpsertCloseoutApprovalRouteDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const result = await this.closeoutApprovalService.replaceRoute(
      {
        projectId: BigInt(projectId),
        statusCode,
        targetTypeCode: 'close_condition',
        targetCode: conditionCode,
      },
      dto,
      BigInt(currentUser.userId),
    );
    return success(serializeBigInt(result));
  }

  @Patch(':statusCode/:conditionCode/approval-steps/:approvalStepId/decision')
  @RequireProjectFeature('canManageCloseConditions')
  @ApiOperation({ summary: '종료조건 승인 단계 승인/반려' })
  @ApiOkResponse({ type: [ProjectCloseoutApprovalStepDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async decideApprovalStep(
    @Param('projectId') projectId: string,
    @Param('statusCode') statusCode: string,
    @Param('conditionCode') conditionCode: string,
    @Param('approvalStepId') approvalStepId: string,
    @Body() dto: DecideCloseoutApprovalStepDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const result = await this.closeoutApprovalService.decideStep(
      {
        projectId: BigInt(projectId),
        statusCode,
        targetTypeCode: 'close_condition',
        targetCode: conditionCode,
      },
      BigInt(approvalStepId),
      dto,
      BigInt(currentUser.userId),
    );
    return success(serializeBigInt(result));
  }

  @Delete(':statusCode/:conditionCode')
  @RequireProjectFeature('canManageCloseConditions')
  @ApiOperation({ summary: '프로젝트 종료 조건 삭제' })
  @ApiOkResponse({ description: '종료 조건 삭제 완료' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('statusCode') statusCode: string,
    @Param('conditionCode') conditionCode: string,
  ) {
    await this.closeConditionService.delete(BigInt(projectId), statusCode, conditionCode);
    return deleted(true);
  }
}
