import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './modules/common/common.module';
import { PmsModule } from './modules/pms/pms.module';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { configValidationSchema } from './config/config.validation';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: configValidationSchema,
    }),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
    DatabaseModule,
    CommonModule,
    PmsModule,
  ],
  controllers: [],
  providers: [
    // 전역 인터셉터: 요청 컨텍스트 설정 (히스토리 관리용)
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalHttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
