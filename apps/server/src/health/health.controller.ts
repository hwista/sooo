import { Controller, Get } from '@nestjs/common';
import type { ApiResponse } from '@ssoo/types';

interface HealthStatus {
  status: string;
  timestamp: string;
  service: string;
  version: string;
}

@Controller('health')
export class HealthController {
  @Get()
  check(): ApiResponse<HealthStatus> {
    return {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'ssoo-server',
        version: '0.0.1',
      },
    };
  }
}
