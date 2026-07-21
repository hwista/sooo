import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonAiIndexModule } from '../../common/ai-index/ai-index.module.js';
import { CrmAccessModule } from '../access/access.module.js';
import { CustomerController } from './customer.controller.js';
import { CustomerService } from './customer.service.js';

@Module({
  imports: [DatabaseModule, CommonAiIndexModule, CrmAccessModule],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
