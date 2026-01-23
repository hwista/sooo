import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './modules/common/health/health.controller';
import { ProjectModule } from './modules/pms/project/project.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/common/auth/auth.module';
import { UserModule } from './modules/common/user/user.module';
import { MenuModule } from './modules/pms/menu/menu.module';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { configValidationSchema } from './config/config.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: configValidationSchema,
    }),
    DatabaseModule,
    AuthModule,
    UserModule,
    MenuModule,
    ProjectModule,
  ],
  controllers: [HealthController],
  providers: [
    // 전역 인터셉터: 요청 컨텍스트 설정 (히스토리 관리용)
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
  ],
})
export class AppModule {}
