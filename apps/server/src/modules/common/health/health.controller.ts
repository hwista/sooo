import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import {
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { ApiResponse } from "@ssoo/types";
import { HealthReadinessDto, HealthStatusDto } from '../../../common/swagger/health.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { ApiOkEnvelopeResponse } from '../../../common/swagger/api-response.decorator.js';
import { Public } from '../../common/auth/decorators/public.decorator.js';
import { DatabaseService } from '../../../database/database.service.js';
import { SettingsService } from '../../dms/settings/settings.service.js';

@ApiTags("health")
@Controller("health")
@Public()
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly dmsSettings: SettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "헬스 체크" })
  @ApiOkEnvelopeResponse(HealthStatusDto)
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  check(): ApiResponse<HealthStatusDto> {
    return {
      success: true,
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "ssoo-server",
        version: "0.0.1",
        releaseSha: process.env.SSOO_RELEASE_SHA || 'local-development',
      },
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: "플랫폼 readiness 체크" })
  @ApiOkEnvelopeResponse(HealthReadinessDto)
  @ApiServiceUnavailableResponse({ type: ApiError, description: "플랫폼 readiness 실패" })
  async checkReadiness(): Promise<ApiResponse<HealthReadinessDto>> {
    try {
      await this.db.client.$queryRawUnsafe('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({
        code: 'PLATFORM_NOT_READY',
        message: 'Database readiness check failed.',
      });
    }

    try {
      const readiness = await this.dmsSettings.getReadiness();
      if (readiness.status !== 'ready') {
        throw new Error(`DMS readiness status: ${readiness.status}`);
      }
    } catch {
      throw new ServiceUnavailableException({
        code: 'DMS_RUNTIME_NOT_READY',
        message: 'DMS runtime readiness check failed.',
      });
    }

    return {
      success: true,
      data: {
        status: 'ready',
        timestamp: new Date().toISOString(),
        service: 'ssoo-server',
        database: 'ready',
        dms: 'ready',
        releaseSha: process.env.SSOO_RELEASE_SHA || 'local-development',
      },
    };
  }
}
