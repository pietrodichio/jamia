import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DigestService } from './digest.service.js';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [DigestService],
  exports: [DigestService],
})
export class DigestModule {}
