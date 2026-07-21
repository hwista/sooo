import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CloseConditionService } from './close-condition.service.js';
import { DeliverableService } from './deliverable.service.js';
import {
  CloseConditionTemplateGroupDto,
  DeliverableTemplateGroupDto,
  TemplateGroupHistoryDto,
  UpdateTemplateGroupApprovalDto,
  UpsertCloseConditionTemplateGroupDto,
  UpsertDeliverableTemplateGroupDto,
} from './dto/deliverable.dto.js';

@ApiTags('pms-template-groups')
@ApiBearerAuth()
@Controller('pms/template-groups')
@UseGuards(RolesGuard)
@Roles('admin')
export class TemplateAdminController {
  constructor(
    private readonly deliverableService: DeliverableService,
    private readonly closeConditionService: CloseConditionService,
  ) {}

  @Get('deliverables')
  @ApiOperation({ summary: '관리자 산출물 템플릿 그룹 목록' })
  @ApiOkResponse({ type: [DeliverableTemplateGroupDto] })
  async findDeliverableGroups() {
    return success(serializeBigInt(await this.deliverableService.findTemplateGroups({ includeInactive: true })));
  }

  @Post('deliverables')
  @ApiOperation({ summary: '관리자 산출물 템플릿 그룹 저장' })
  @ApiOkResponse({ type: DeliverableTemplateGroupDto })
  async upsertDeliverableGroup(@Body() dto: UpsertDeliverableTemplateGroupDto) {
    return success(serializeBigInt(await this.deliverableService.upsertTemplateGroup(dto)));
  }

  @Get('deliverables/:groupCode/history')
  @ApiOperation({ summary: '산출물 템플릿 그룹 이력 조회' })
  @ApiOkResponse({ type: [TemplateGroupHistoryDto] })
  async findDeliverableGroupHistory(@Param('groupCode') groupCode: string) {
    return success(serializeBigInt(await this.deliverableService.findTemplateGroupHistory(groupCode)));
  }

  @Patch('deliverables/:groupCode/approval')
  @ApiOperation({ summary: '산출물 템플릿 그룹 승인 상태 변경' })
  @ApiOkResponse({ type: DeliverableTemplateGroupDto })
  async updateDeliverableGroupApproval(
    @Param('groupCode') groupCode: string,
    @Body() dto: UpdateTemplateGroupApprovalDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    await this.deliverableService.updateTemplateGroupApproval(
      groupCode,
      dto.approvalStatusCode,
      BigInt(currentUser.userId),
    );
    return success(serializeBigInt(await this.deliverableService.findTemplateGroup(groupCode, { includeInactive: true })));
  }

  @Post('deliverables/:groupCode/restore/:historySeq')
  @ApiOperation({ summary: '산출물 템플릿 그룹 이력 복구' })
  @ApiOkResponse({ type: DeliverableTemplateGroupDto })
  async restoreDeliverableGroup(
    @Param('groupCode') groupCode: string,
    @Param('historySeq') historySeq: string,
  ) {
    return success(serializeBigInt(await this.deliverableService.restoreTemplateGroup(groupCode, historySeq)));
  }

  @Delete('deliverables/:groupCode')
  @ApiOperation({ summary: '산출물 템플릿 그룹 비활성화' })
  @ApiOkResponse({ type: DeliverableTemplateGroupDto })
  async deactivateDeliverableGroup(@Param('groupCode') groupCode: string) {
    await this.deliverableService.deactivateTemplateGroup(groupCode);
    return success(serializeBigInt(await this.deliverableService.findTemplateGroup(groupCode, { includeInactive: true })));
  }

  @Get('close-conditions')
  @ApiOperation({ summary: '관리자 종료조건 템플릿 그룹 목록' })
  @ApiOkResponse({ type: [CloseConditionTemplateGroupDto] })
  async findCloseConditionGroups() {
    return success(serializeBigInt(await this.closeConditionService.findTemplateGroups({ includeInactive: true })));
  }

  @Post('close-conditions')
  @ApiOperation({ summary: '관리자 종료조건 템플릿 그룹 저장' })
  @ApiOkResponse({ type: CloseConditionTemplateGroupDto })
  async upsertCloseConditionGroup(@Body() dto: UpsertCloseConditionTemplateGroupDto) {
    return success(serializeBigInt(await this.closeConditionService.upsertTemplateGroup(dto)));
  }

  @Get('close-conditions/:groupCode/history')
  @ApiOperation({ summary: '종료조건 템플릿 그룹 이력 조회' })
  @ApiOkResponse({ type: [TemplateGroupHistoryDto] })
  async findCloseConditionGroupHistory(@Param('groupCode') groupCode: string) {
    return success(serializeBigInt(await this.closeConditionService.findTemplateGroupHistory(groupCode)));
  }

  @Patch('close-conditions/:groupCode/approval')
  @ApiOperation({ summary: '종료조건 템플릿 그룹 승인 상태 변경' })
  @ApiOkResponse({ type: CloseConditionTemplateGroupDto })
  async updateCloseConditionGroupApproval(
    @Param('groupCode') groupCode: string,
    @Body() dto: UpdateTemplateGroupApprovalDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    await this.closeConditionService.updateTemplateGroupApproval(
      groupCode,
      dto.approvalStatusCode,
      BigInt(currentUser.userId),
    );
    return success(serializeBigInt(await this.closeConditionService.findTemplateGroup(groupCode, { includeInactive: true })));
  }

  @Post('close-conditions/:groupCode/restore/:historySeq')
  @ApiOperation({ summary: '종료조건 템플릿 그룹 이력 복구' })
  @ApiOkResponse({ type: CloseConditionTemplateGroupDto })
  async restoreCloseConditionGroup(
    @Param('groupCode') groupCode: string,
    @Param('historySeq') historySeq: string,
  ) {
    return success(serializeBigInt(await this.closeConditionService.restoreTemplateGroup(groupCode, historySeq)));
  }

  @Delete('close-conditions/:groupCode')
  @ApiOperation({ summary: '종료조건 템플릿 그룹 비활성화' })
  @ApiOkResponse({ type: CloseConditionTemplateGroupDto })
  async deactivateCloseConditionGroup(@Param('groupCode') groupCode: string) {
    await this.closeConditionService.deactivateTemplateGroup(groupCode);
    return success(serializeBigInt(await this.closeConditionService.findTemplateGroup(groupCode, { includeInactive: true })));
  }
}
