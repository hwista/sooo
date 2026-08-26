import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDetail {
  @ApiProperty({ example: 'INTERNAL_ERROR' })
  code!: string;

  @ApiProperty({ example: 'Internal server error' })
  message!: string;

  @ApiPropertyOptional({ example: '/api/example' })
  path?: string;
}

export class ApiError {
  @ApiProperty({ enum: [false], example: false })
  success = false as const;

  @ApiProperty({ type: ApiErrorDetail })
  error!: ApiErrorDetail;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  timestamp?: string;

  static example: ApiError = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      path: '/api/example',
    },
    timestamp: new Date().toISOString(),
  };
}

export class ApiSuccess<T = Record<string, unknown>> {
  @ApiProperty({ enum: [true], example: true })
  success = true as const;

  @ApiProperty({ type: 'object', additionalProperties: true })
  data!: T;

  @ApiPropertyOptional()
  message?: string;
}

export class ApiPaginationMeta {
  @ApiProperty({ minimum: 1, example: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, example: 20 })
  limit!: number;

  @ApiProperty({ minimum: 0, example: 100 })
  total!: number;
}
