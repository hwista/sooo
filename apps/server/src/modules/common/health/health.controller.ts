import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { ApiResponse } from "@ssoo/types";
import { HealthStatusDto } from "../../../common/swagger/health.dto";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "헬스 체크" })
  @ApiOkResponse({ type: HealthStatusDto })
  check(): ApiResponse<HealthStatusDto> {
    return {
      success: true,
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "ssoo-server",
        version: "0.0.1",
      },
    };
  }
}