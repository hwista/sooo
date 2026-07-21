import { Module } from '@nestjs/common';
import { AuthModule } from '../../common/auth/auth.module.js';
import { AccessModule } from '../access/access.module.js';
import { DmsEventsGateway } from './dms-events.gateway.js';

@Module({
  imports: [AuthModule, AccessModule],
  providers: [DmsEventsGateway],
  exports: [DmsEventsGateway],
})
export class EventsModule {}
