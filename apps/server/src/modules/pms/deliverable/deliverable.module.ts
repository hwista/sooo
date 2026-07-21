import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { DeliverableController } from './deliverable.controller.js';
import { DeliverableService } from './deliverable.service.js';
import { CloseConditionController } from './close-condition.controller.js';
import { CloseConditionService } from './close-condition.service.js';
import { CloseoutApprovalService } from './closeout-approval.service.js';
import { TemplateAdminController } from './template-admin.controller.js';
import { ProjectModule } from '../project/project.module.js';

@Module({
  imports: [DatabaseModule, ProjectModule],
  controllers: [DeliverableController, CloseConditionController, TemplateAdminController],
  providers: [DeliverableService, CloseConditionService, CloseoutApprovalService],
  exports: [DeliverableService, CloseConditionService, CloseoutApprovalService],
})
export class DeliverableModule {}
