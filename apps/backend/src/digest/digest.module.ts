import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DigestScheduler } from './digest.scheduler.js';
import { DigestService } from './digest.service.js';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [DigestService, DigestScheduler],
  exports: [DigestService],
})
export class DigestModule {}
