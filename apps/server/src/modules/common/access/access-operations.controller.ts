import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AccessOperationsService } from './access-operations.service.js';
import { InspectAccessQueryDto } from './dto/inspect-access.query.dto.js';
import { ListPermissionExceptionsQueryDto } from './dto/list-permission-exceptions.query.dto.js';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';

@ApiTags('Access Ops')
@ApiBearerAuth()
@Controller('access/ops')
@UseGuards(RolesGuard)
@Roles('admin')
export class AccessOperationsController {
  constructor(private readonly accessOperationsService: AccessOperationsService) {}

  @Get('catalog')
  @ApiOperation({
    summary: '플랫폼/앱별 권한 기능 명세 조회 (관리자)',
    description:
      'permission vocabulary를 Admin/platform, DMS, PMS, CRM, SNS 등 책임 소유자별로 분류하고 각 메뉴/운영 surface를 반환합니다.' })
  @ApiOkResponse({ description: '권한 기능 명세 조회 성공' })
  @ApiUnauthorizedResponse({ description: '인증되지 않은 요청' })
  @ApiForbiddenResponse({ description: '관리자만 접근 가능' })
  async listPermissionCatalog() {
    const result = await this.accessOperationsService.listPermissionCatalog();
    return success(result, '권한 기능 명세 조회 성공');
  }

  @Get('inspect')
  @ApiOperation({
    summary: '권한 해석 inspect (관리자)',
    description:
      '특정 사용자의 foundation action policy 와 optional object policy, active permission exception을 함께 조회합니다.' })
  @ApiOkResponse({ description: '권한 해석 조회 성공' })
  @ApiUnauthorizedResponse({ description: '인증되지 않은 요청' })
  @ApiForbiddenResponse({ description: '관리자만 접근 가능' })
  async inspectAccess(@Query() query: InspectAccessQueryDto) {
    const result = await this.accessOperationsService.inspectAccess(query);
    return success(result, '권한 해석 조회 성공');
  }

  @Get('exceptions')
  @ApiOperation({
    summary: 'permission exception 목록 조회 (관리자)',
    description:
      'user/loginId, axis, object target, permission code 로 필터링된 permission exception 목록을 반환합니다.' })
  @ApiOkResponse({ description: '권한 예외 목록 조회 성공' })
  @ApiUnauthorizedResponse({ description: '인증되지 않은 요청' })
  @ApiForbiddenResponse({ description: '관리자만 접근 가능' })
  async listPermissionExceptions(@Query() query: ListPermissionExceptionsQueryDto) {
    const result = await this.accessOperationsService.listPermissionExceptions(query);
    return success(result, '권한 예외 목록 조회 성공');
  }

  @Get('roles')
  @ApiOperation({ summary: '역할별 활성 permission grant 조회' })
  async listRoles() {
    return success(await this.accessOperationsService.listRolesWithPermissions());
  }

  @Put('roles/:roleCode/permissions')
  @ApiOperation({ summary: '역할의 전체 permission grant 집합 갱신' })
  async updateRolePermissions(
    @Param('roleCode') roleCode: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.accessOperationsService.updateRolePermissions(
      roleCode,
      dto,
      BigInt(currentUser.userId),
    ));
  }

  @Get('audit')
  @ApiOperation({ summary: '플랫폼 사용자/인증/세션/조직/역할권한 감사 이벤트 조회' })
  async listAudit(@Query('limit') limit?: string) {
    return success(await this.accessOperationsService.listAuditEvents(limit ? Number(limit) : 100));
  }
}
