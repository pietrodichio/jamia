import { Module } from '@nestjs/common';
import { JamsController } from './jams.controller';
import { PublicJamsController } from './public-jams.controller';
import { JamsService } from './jams.service';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [AuditModule, EmailModule],
  controllers: [JamsController, PublicJamsController],
  providers: [JamsService],
  exports: [JamsService],
})
export class JamsModule {}
