import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DigestService } from './digest.service.js';

@Injectable()
export class DigestScheduler {
  private readonly logger = new Logger(DigestScheduler.name);

  constructor(private readonly digestService: DigestService) {}

  /**
   * Weekly digest cron job
   * Runs every Monday at 10:00 AM Europe/Rome time
   */
  @Cron('0 10 * * 1', {
    name: 'weekly-digest',
    timeZone: 'Europe/Rome',
  })
  async sendWeeklyDigests() {
    this.logger.log('[DigestScheduler] Starting weekly digest send');

    const users = await this.digestService.getSubscribedUsers('weekly');
    this.logger.log(
      `[DigestScheduler] Found ${users.length} weekly subscribers`,
    );

    if (users.length === 0) {
      this.logger.log('[DigestScheduler] No weekly subscribers, skipping');
      return;
    }

    const result = await this.digestService.sendBatchDigests(users, 'weekly');
    this.logger.log(
      `[DigestScheduler] Weekly digest complete: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed`,
    );
  }

  /**
   * Monthly digest cron job
   * Runs on the 1st of every month at 10:00 AM Europe/Rome time
   */
  @Cron('0 10 1 * *', {
    name: 'monthly-digest',
    timeZone: 'Europe/Rome',
  })
  async sendMonthlyDigests() {
    this.logger.log('[DigestScheduler] Starting monthly digest send');

    const users = await this.digestService.getSubscribedUsers('monthly');
    this.logger.log(
      `[DigestScheduler] Found ${users.length} monthly subscribers`,
    );

    if (users.length === 0) {
      this.logger.log('[DigestScheduler] No monthly subscribers, skipping');
      return;
    }

    const result = await this.digestService.sendBatchDigests(users, 'monthly');
    this.logger.log(
      `[DigestScheduler] Monthly digest complete: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed`,
    );
  }
}
