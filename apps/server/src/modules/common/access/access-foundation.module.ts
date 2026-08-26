import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { AccessOperationsController } from './access-operations.controller.js';
import { AccessOperationsService } from './access-operations.service.js';
import { AccessFoundationService } from './access-foundation.service.js';
import { OrganizationOperationsController } from './organization-operations.controller.js';
import { OrganizationOperationsService } from './organization-operations.service.js';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [AccessOperationsController, OrganizationOperationsController],
  providers: [AccessFoundationService, AccessOperationsService, OrganizationOperationsService],
  exports: [AccessFoundationService],
})
export class AccessFoundationModule {}
