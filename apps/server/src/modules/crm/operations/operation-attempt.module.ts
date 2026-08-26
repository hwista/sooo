import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CrmOperationAttemptService } from './operation-attempt.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [CrmOperationAttemptService],
  exports: [CrmOperationAttemptService],
})
export class CrmOperationAttemptModule {}
