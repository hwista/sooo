import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { MasterService } from './master.service.js';
import { deleted, paginated, success } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import {
  CreatePmsMasterImportProfileDto,
  CreatePlantSiteDto,
  CreateSystemCatalogDto,
  CreateSystemInstanceDto,
  CreateSystemIntegrationDto,
  FindMasterItemsDto,
  FindPmsMasterImportProfilesDto,
  MasterSummaryDto,
  PmsMasterImportDto,
  PmsMasterImportProfileHistoryDto,
  PmsMasterImportProfileDto,
  PlantSiteDto,
  RestorePmsMasterImportProfileDto,
  SystemCatalogDto,
  SystemInstanceDto,
  SystemIntegrationDto,
  UpdatePmsMasterImportProfileDto,
  UpdatePlantSiteDto,
  UpdateSystemCatalogDto,
  UpdateSystemInstanceDto,
  UpdateSystemIntegrationDto,
} from './dto/master.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags('master')
@ApiBearerAuth()
@Controller('master')
@UseGuards(RolesGuard)
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  @Get('summary')
  @ApiOperation({ summary: 'PMS 기준정보 요약' })
  @ApiOkResponse({ type: MasterSummaryDto })
  async getSummary() {
    const data = await this.masterService.getSummary();
    return success(data);
  }

  @Post('import')
  @Roles('admin')
  @ApiOperation({ summary: 'PMS 기준정보 대량 반입 미리보기/적용' })
  @ApiOkResponse({ description: '기준정보 반입 검증 또는 적용 결과' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async importMaster(@Body() dto: PmsMasterImportDto) {
    const result = await this.masterService.importMaster(dto);
    return success(result);
  }

  @Get('import-profiles')
  @ApiOperation({ summary: 'PMS 기준정보 반입 공유 매핑 프로필 목록' })
  @ApiOkResponse({ type: [PmsMasterImportProfileDto] })
  async findImportProfiles(@Query() params: FindPmsMasterImportProfilesDto) {
    const data = await this.masterService.findImportProfiles(params);
    return success(data);
  }

  @Get('import-profiles/:profileId/history')
  @ApiOperation({ summary: 'PMS 기준정보 반입 공유 매핑 프로필 이력 목록' })
  @ApiOkResponse({ type: [PmsMasterImportProfileHistoryDto] })
  @ApiNotFoundResponse({ type: ApiError })
  async findImportProfileHistory(@Param('profileId') profileId: string) {
    const data = await this.masterService.findImportProfileHistory(BigInt(profileId));
    return success(data);
  }

  @Post('import-profiles')
  @Roles('admin')
  @ApiOperation({ summary: 'PMS 기준정보 반입 공유 매핑 프로필 생성' })
  @ApiOkResponse({ type: PmsMasterImportProfileDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async createImportProfile(@Body() dto: CreatePmsMasterImportProfileDto) {
    const result = await this.masterService.createImportProfile(dto);
    return success(result);
  }

  @Put('import-profiles/:profileId')
  @Roles('admin')
  @ApiOperation({ summary: 'PMS 기준정보 반입 공유 매핑 프로필 수정' })
  @ApiOkResponse({ type: PmsMasterImportProfileDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async updateImportProfile(
    @Param('profileId') profileId: string,
    @Body() dto: UpdatePmsMasterImportProfileDto,
  ) {
    const result = await this.masterService.updateImportProfile(BigInt(profileId), dto);
    return success(result);
  }

  @Post('import-profiles/:profileId/restore')
  @Roles('admin')
  @ApiOperation({ summary: 'PMS 기준정보 반입 공유 매핑 프로필 이력 복구' })
  @ApiOkResponse({ type: PmsMasterImportProfileDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async restoreImportProfile(
    @Param('profileId') profileId: string,
    @Body() dto: RestorePmsMasterImportProfileDto,
  ) {
    const result = await this.masterService.restoreImportProfileHistory(
      BigInt(profileId),
      BigInt(dto.historySeq),
    );
    return success(result);
  }

  @Delete('import-profiles/:profileId')
  @Roles('admin')
  @ApiOperation({ summary: 'PMS 기준정보 반입 공유 매핑 프로필 비활성화' })
  @ApiOkResponse({ description: '반입 공유 매핑 프로필 비활성화 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async deactivateImportProfile(@Param('profileId') profileId: string) {
    await this.masterService.deactivateImportProfile(BigInt(profileId));
    return deleted(true);
  }

  @Get('sites')
  @ApiOperation({ summary: '플랜트/사이트 목록' })
  @ApiOkResponse({ type: [PlantSiteDto] })
  async findSites(@Query() params: FindMasterItemsDto) {
    const { data, total, page, limit } = await this.masterService.findSites(params);
    const serialized = data.map((item) => serializeBigInt(item));
    return paginated(serialized as Record<string, unknown>[], page, limit, total);
  }

  @Post('sites')
  @Roles('admin')
  @ApiOperation({ summary: '플랜트/사이트 생성' })
  @ApiOkResponse({ type: PlantSiteDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async createSite(@Body() dto: CreatePlantSiteDto) {
    const result = await this.masterService.createSite(dto);
    return success(serializeBigInt(result));
  }

  @Put('sites/:siteId')
  @Roles('admin')
  @ApiOperation({ summary: '플랜트/사이트 수정' })
  @ApiOkResponse({ type: PlantSiteDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async updateSite(@Param('siteId') siteId: string, @Body() dto: UpdatePlantSiteDto) {
    const result = await this.masterService.updateSite(BigInt(siteId), dto);
    return success(serializeBigInt(result));
  }

  @Delete('sites/:siteId')
  @Roles('admin')
  @ApiOperation({ summary: '플랜트/사이트 비활성화' })
  @ApiOkResponse({ description: '플랜트/사이트 비활성화 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async deactivateSite(@Param('siteId') siteId: string) {
    const result = await this.masterService.deactivateSite(BigInt(siteId));
    return deleted(!!result);
  }

  @Get('system-catalogs')
  @ApiOperation({ summary: '시스템 카탈로그 목록' })
  @ApiOkResponse({ type: [SystemCatalogDto] })
  async findSystemCatalogs(@Query() params: FindMasterItemsDto) {
    const { data, total, page, limit } = await this.masterService.findSystemCatalogs(params);
    const serialized = data.map((item) => serializeBigInt(item));
    return paginated(serialized as Record<string, unknown>[], page, limit, total);
  }

  @Post('system-catalogs')
  @Roles('admin')
  @ApiOperation({ summary: '시스템 종류 생성' })
  @ApiOkResponse({ type: SystemCatalogDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async createSystemCatalog(@Body() dto: CreateSystemCatalogDto) {
    const result = await this.masterService.createSystemCatalog(dto);
    return success(serializeBigInt(result));
  }

  @Put('system-catalogs/:systemCatalogId')
  @Roles('admin')
  @ApiOperation({ summary: '시스템 종류 수정' })
  @ApiOkResponse({ type: SystemCatalogDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async updateSystemCatalog(
    @Param('systemCatalogId') systemCatalogId: string,
    @Body() dto: UpdateSystemCatalogDto,
  ) {
    const result = await this.masterService.updateSystemCatalog(BigInt(systemCatalogId), dto);
    return success(serializeBigInt(result));
  }

  @Delete('system-catalogs/:systemCatalogId')
  @Roles('admin')
  @ApiOperation({ summary: '시스템 종류 비활성화' })
  @ApiOkResponse({ description: '시스템 종류 비활성화 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async deactivateSystemCatalog(@Param('systemCatalogId') systemCatalogId: string) {
    const result = await this.masterService.deactivateSystemCatalog(BigInt(systemCatalogId));
    return deleted(!!result);
  }

  @Get('system-instances')
  @ApiOperation({ summary: '시스템 인스턴스 목록' })
  @ApiOkResponse({ type: [SystemInstanceDto] })
  async findSystemInstances(@Query() params: FindMasterItemsDto) {
    const { data, total, page, limit } = await this.masterService.findSystemInstances(params);
    const serialized = data.map((item) => serializeBigInt(item));
    return paginated(serialized as Record<string, unknown>[], page, limit, total);
  }

  @Post('system-instances')
  @Roles('admin')
  @ApiOperation({ summary: '시스템 인스턴스 생성' })
  @ApiOkResponse({ type: SystemInstanceDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async createSystemInstance(@Body() dto: CreateSystemInstanceDto) {
    const result = await this.masterService.createSystemInstance(dto);
    return success(serializeBigInt(result));
  }

  @Put('system-instances/:systemInstanceId')
  @Roles('admin')
  @ApiOperation({ summary: '시스템 인스턴스 수정' })
  @ApiOkResponse({ type: SystemInstanceDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async updateSystemInstance(
    @Param('systemInstanceId') systemInstanceId: string,
    @Body() dto: UpdateSystemInstanceDto,
  ) {
    const result = await this.masterService.updateSystemInstance(BigInt(systemInstanceId), dto);
    return success(serializeBigInt(result));
  }

  @Delete('system-instances/:systemInstanceId')
  @Roles('admin')
  @ApiOperation({ summary: '시스템 인스턴스 비활성화' })
  @ApiOkResponse({ description: '시스템 인스턴스 비활성화 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async deactivateSystemInstance(@Param('systemInstanceId') systemInstanceId: string) {
    const result = await this.masterService.deactivateSystemInstance(BigInt(systemInstanceId));
    return deleted(!!result);
  }

  @Get('integrations')
  @ApiOperation({ summary: '시스템 인터페이스 목록' })
  @ApiOkResponse({ type: [SystemIntegrationDto] })
  async findIntegrations(@Query() params: FindMasterItemsDto) {
    const { data, total, page, limit } = await this.masterService.findIntegrations(params);
    const serialized = data.map((item) => serializeBigInt(item));
    return paginated(serialized as Record<string, unknown>[], page, limit, total);
  }

  @Post('integrations')
  @Roles('admin')
  @ApiOperation({ summary: '시스템 인터페이스 생성' })
  @ApiOkResponse({ type: SystemIntegrationDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async createIntegration(@Body() dto: CreateSystemIntegrationDto) {
    const result = await this.masterService.createIntegration(dto);
    return success(serializeBigInt(result));
  }

  @Put('integrations/:integrationId')
  @Roles('admin')
  @ApiOperation({ summary: '시스템 인터페이스 수정' })
  @ApiOkResponse({ type: SystemIntegrationDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async updateIntegration(
    @Param('integrationId') integrationId: string,
    @Body() dto: UpdateSystemIntegrationDto,
  ) {
    const result = await this.masterService.updateIntegration(BigInt(integrationId), dto);
    return success(serializeBigInt(result));
  }

  @Delete('integrations/:integrationId')
  @Roles('admin')
  @ApiOperation({ summary: '시스템 인터페이스 비활성화' })
  @ApiOkResponse({ description: '시스템 인터페이스 비활성화 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async deactivateIntegration(@Param('integrationId') integrationId: string) {
    const result = await this.masterService.deactivateIntegration(BigInt(integrationId));
    return deleted(!!result);
  }
}
