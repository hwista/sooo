import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { ApiResponse } from "@ssoo/types";

interface HealthStatus {
  status: string;
  timestamp: string;
  service: string;
  version: string;
}

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "헬스 체크" })
  check(): ApiResponse<HealthStatus> {
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