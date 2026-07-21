import { Module } from '@nestjs/common';
import { AccessFoundationModule } from '../../common/access/access-foundation.module.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { MasterController } from './master.controller.js';
import { MasterService } from './master.service.js';

@Module({
  imports: [AccessFoundationModule, DatabaseModule],
  controllers: [MasterController],
  providers: [MasterService],
  exports: [MasterService],
})
export class MasterModule {}
