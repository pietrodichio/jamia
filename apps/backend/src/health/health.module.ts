import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller';
import { KeepaliveScheduler } from './keepalive.scheduler';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [HealthController],
  providers: [KeepaliveScheduler],
})
export class HealthModule {}
