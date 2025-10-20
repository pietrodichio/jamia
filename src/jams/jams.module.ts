import { Module } from '@nestjs/common';
import { JamsController } from './jams.controller';
import { JamsService } from './jams.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [JamsController],
  providers: [JamsService],
  exports: [JamsService],
})
export class JamsModule {}

