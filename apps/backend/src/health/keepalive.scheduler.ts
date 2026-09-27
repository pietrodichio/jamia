import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';

@Injectable()
export class KeepaliveScheduler {
  private readonly logger = new Logger(KeepaliveScheduler.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  /**
   * Supabase keep-alive cron job
   * Runs a lightweight read query every day at 04:00 AM Europe/Rome time
   * so the free-tier project is never flagged as inactive and paused
   * (Supabase pauses free projects after 7 days without activity).
   */
  @Cron('0 4 * * *', {
    name: 'supabase-keepalive',
    timeZone: 'Europe/Rome',
  })
  async pingDatabase() {
    const { error } = await this.supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      this.logger.error(
        `[KeepaliveScheduler] Supabase keep-alive query failed: ${error.message}`,
      );
      return;
    }

    this.logger.log('[KeepaliveScheduler] Supabase keep-alive query succeeded');
  }
}
