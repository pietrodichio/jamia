import { Module } from '@nestjs/common';
import { EventOrganizersController } from './event-organizers.controller';
import { EventOrganizersService } from './event-organizers.service';
import { SupabaseModule } from '../config/supabase.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [SupabaseModule, AuditModule],
  controllers: [EventOrganizersController],
  providers: [EventOrganizersService],
  exports: [EventOrganizersService],
})
export class EventOrganizersModule {}
