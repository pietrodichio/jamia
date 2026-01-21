import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { AuditModule } from '../audit/audit.module';
import { EventOrganizersModule } from '../event-organizers/event-organizers.module';

@Module({
  imports: [AuditModule, EventOrganizersModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
