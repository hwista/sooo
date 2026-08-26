import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization-operations.dto.js';
import { OrganizationOperationsService } from './organization-operations.service.js';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(RolesGuard)
@Roles('admin')
export class OrganizationOperationsController {
  constructor(private readonly organizations: OrganizationOperationsService) {}

  @Get()
  @ApiOperation({ summary: '실제 공용 조직 계층 조회' })
  async list(@Query('includeInactive') includeInactive?: string) {
    return success(await this.organizations.list(includeInactive === 'true' || includeInactive === '1'));
  }

  @Post()
  @ApiOperation({ summary: '공용 조직 생성' })
  async create(@Body() dto: CreateOrganizationDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.organizations.create(dto, BigInt(currentUser.userId)));
  }

  @Put(':id')
  @ApiOperation({ summary: '공용 조직/계층 수정' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.organizations.update(BigInt(id), dto, BigInt(currentUser.userId)));
  }

  @Delete(':id')
  @ApiOperation({ summary: '공용 조직 안전 비활성화' })
  async deactivate(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.organizations.deactivate(BigInt(id), BigInt(currentUser.userId)));
  }
}
