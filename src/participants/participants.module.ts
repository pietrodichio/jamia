import { Module } from '@nestjs/common';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [AuditModule, EmailModule, TelegramModule],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
  exports: [ParticipantsService],
})
export class ParticipantsModule { }

