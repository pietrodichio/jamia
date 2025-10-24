import { Module } from '@nestjs/common';
import { ManagersService } from './managers.service';
import { ManagersController } from './managers.controller';
import { SupabaseModule } from '../config/supabase.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [SupabaseModule, AuditModule],
  controllers: [ManagersController],
  providers: [ManagersService],
  exports: [ManagersService],
})
export class ManagersModule {}
