import { Module } from '@nestjs/common';
import { JamsController } from './jams.controller';
import { PublicJamsController } from './public-jams.controller';
import { JamsService } from './jams.service';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [AuditModule, EmailModule, EventsModule],
  controllers: [JamsController, PublicJamsController],
  providers: [JamsService],
  exports: [JamsService],
})
export class JamsModule {}
