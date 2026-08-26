import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { AccessModule } from '../access/access.module.js';
import { CollaborationModule } from '../collaboration/collaboration.module.js';
import { IngestModule } from '../ingest/ingest.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { DmsHomeController } from './home.controller.js';
import { HomeService } from './home.service.js';

@Module({
  imports: [DatabaseModule, AccessModule, CollaborationModule, IngestModule, SettingsModule],
  controllers: [DmsHomeController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {}
