import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [AuthModule, UserModule],
  controllers: [HealthController],
  exports: [AuthModule, UserModule],
})
export class CommonModule {}
