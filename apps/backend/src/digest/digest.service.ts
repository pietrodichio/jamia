import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import { SupabaseClient } from '@supabase/supabase-js';
import * as React from 'react';
import { Resend } from 'resend';
import { SUPABASE_CLIENT } from '../config/supabase.config.js';
import {
  CuratedEvents,
  DigestEvent,
  GroupedEvents,
  SubscribedUser,
} from './dto/curated-events.dto.js';
import { DigestEmail } from './templates/DigestEmail.js';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);
  private readonly frontendBaseUrl: string;
  private readonly apiBaseUrl: string;
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly enabled: boolean;

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
    private readonly configService: ConfigService,
  ) {
    this.frontendBaseUrl = this.configService.get<string>(
      'FRONTEND_BASE_URL',
      'https://jamia.app',
    );
    this.apiBaseUrl = this.configService.get<string>(
      'API_BASE_URL',
      this.configService.get<string>('BACKEND_URL', 'https://api.jamia.app'),
    );

    // Initialize Resend for direct email sending
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const rawFromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') || '';
    this.fromEmail = this.normalizeFromEmail(rawFromEmail);

    if (!apiKey) {
      this.logger.warn(
        '[DigestService] RESEND_API_KEY is not configured. Digest delivery is disabled.',
      );
      this.resend = null;
      this.enabled = false;
    } else if (!this.fromEmail) {
      this.logger.warn(
        '[DigestService] RESEND_FROM_EMAIL is not configured. Digest delivery is disabled.',
      );
      this.resend = null;
      this.enabled = false;
    } else {
      this.resend = new Resend(apiKey);
      this.enabled = true;
    }
  }

  /**
   * Get users subscribed to digest emails for a given frequency
   */
  async getSubscribedUsers(
    frequency: 'weekly' | 'monthly',
  ): Promise<SubscribedUser[]> {
    this.logger.log(
      `[DigestService] Fetching subscribed users for frequency: ${frequency}`,
    );

    const { data, error } = await this.supabase
      .from('email_preferences')
      .select(
        `
        user_id,
        unsubscribe_token,
        last_digest_sent_at,
        digest_frequency,
        profiles!inner(email, first_name)
      `,
      )
      .eq('digest_enabled', true)
      .eq('digest_frequency', frequency);

    if (error) {
      this.logger.error(
        `[DigestService] Error fetching subscribed users: ${error.message}`,
      );
      throw error;
    }

    // Transform nested profiles structure to flat structure
    const users: SubscribedUser[] = (data || []).map((row: any) => ({
      user_id: row.user_id,
      email: row.profiles.email,
      first_name: row.profiles.first_name,
      unsubscribe_token: row.unsubscribe_token,
      last_digest_sent_at: row.last_digest_sent_at,
      digest_frequency: row.digest_frequency,
    }));

    this.logger.log(
      `[DigestService] Found ${users.length} subscribed users for ${frequency}`,
    );

    return users;
  }

  /**
   * Curate events for a user's digest email
   */
  async curateEventsForUser(
    lastDigestSentAt: string | null,
  ): Promise<CuratedEvents> {
    this.logger.log('[DigestService] Curating events for user');

    // Query upcoming events (starts_at >= now)
    const { data: upcomingEvents, error: upcomingError } = await this.supabase
      .from('events')
      .select('id, type, title, starts_at, ends_at, location_city, image_url, created_at')
      .eq('status', 'published')
      .in('type', ['convention', 'workshop', 'jam'])
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(9);

    if (upcomingError) {
      this.logger.error(
        `[DigestService] Error fetching upcoming events: ${upcomingError.message}`,
      );
      throw upcomingError;
    }

    // Query new events (created_at >= lastDigestSentAt) if lastDigestSentAt exists
    let newEvents: DigestEvent[] = [];
    if (lastDigestSentAt) {
      const { data, error: newError } = await this.supabase
        .from('events')
        .select('id, type, title, starts_at, ends_at, location_city, image_url, created_at')
        .eq('status', 'published')
        .in('type', ['convention', 'workshop', 'jam'])
        .gte('created_at', lastDigestSentAt)
        .order('created_at', { ascending: false })
        .limit(9);

      if (newError) {
        this.logger.error(
          `[DigestService] Error fetching new events: ${newError.message}`,
        );
        throw newError;
      }

      newEvents = data || [];
    }

    // Deduplicate: remove events from new section that appear in upcoming
    const upcomingIds = new Set((upcomingEvents || []).map((e) => e.id));
    const deduplicatedNewEvents = newEvents.filter(
      (e) => !upcomingIds.has(e.id),
    );

    // Group events by type with max 3 per type
    const upcoming = this.groupByType(upcomingEvents || [], 3);
    const newSection = this.groupByType(deduplicatedNewEvents, 3);

    this.logger.log(
      `[DigestService] Curated events - Upcoming: ${(upcomingEvents || []).length}, New: ${deduplicatedNewEvents.length}`,
    );

    return {
      upcoming,
      new: newSection,
    };
  }

  /**
   * Group events by type and limit per type
   */
  private groupByType(
    events: DigestEvent[],
    maxPerType: number,
  ): GroupedEvents {
    const conventions = events
      .filter((e) => e.type === 'convention')
      .slice(0, maxPerType);
    const workshops = events
      .filter((e) => e.type === 'workshop')
      .slice(0, maxPerType);
    const jams = events.filter((e) => e.type === 'jam').slice(0, maxPerType);

    return {
      conventions,
      workshops,
      jams,
    };
  }

  /**
   * Check if curated events contain any events
   */
  hasEvents(curated: CuratedEvents): boolean {
    const upcomingCount =
      curated.upcoming.conventions.length +
      curated.upcoming.workshops.length +
      curated.upcoming.jams.length;
    const newCount =
      curated.new.conventions.length +
      curated.new.workshops.length +
      curated.new.jams.length;

    return upcomingCount > 0 || newCount > 0;
  }

  /**
   * Update the last digest sent timestamp for a user
   */
  async updateLastDigestSentAt(userId: string): Promise<void> {
    this.logger.log(`[DigestService] Updating last_digest_sent_at for user ${userId}`);

    const { error } = await this.supabase
      .from('email_preferences')
      .update({ last_digest_sent_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      this.logger.error(
        `[DigestService] Error updating last_digest_sent_at: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Render digest email to HTML and plain text
   */
  async renderDigest(
    curated: CuratedEvents,
    user: SubscribedUser,
    frequency: 'weekly' | 'monthly',
  ): Promise<{ html: string; text: string; subject: string }> {
    this.logger.log('[DigestService] Rendering digest email');

    // Determine subject line
    const subject =
      frequency === 'weekly'
        ? 'I tuoi eventi della settimana su Jamia'
        : 'I tuoi eventi del mese su Jamia';

    // Create React element
    const emailElement = React.createElement(DigestEmail, {
      curated,
      userName: user.first_name,
      unsubscribeToken: user.unsubscribe_token,
      frequency,
      frontendBaseUrl: this.frontendBaseUrl,
    });

    // Render to HTML
    const html = await render(emailElement);

    // Render to plain text
    const text = await render(emailElement, { plainText: true });

    // Log HTML size for monitoring
    const htmlSizeBytes = Buffer.byteLength(html, 'utf8');
    this.logger.log(
      `[DigestService] Rendered digest HTML: ${htmlSizeBytes} bytes`,
    );

    if (htmlSizeBytes > 80000) {
      this.logger.warn(
        '[DigestService] Digest HTML exceeds 80KB, risk of Gmail clipping',
      );
    }

    return { html, text, subject };
  }

  /**
   * Send digest email to a single user
   * Returns true if sent, false if skipped (no events)
   */
  async sendDigestToUser(
    user: SubscribedUser,
    frequency: 'weekly' | 'monthly',
  ): Promise<boolean> {
    if (!this.enabled || !this.resend) {
      this.logger.warn(
        `[DigestService] Skipping digest for user ${user.user_id} - Resend not configured`,
      );
      return false;
    }

    // Curate events for this user
    const curated = await this.curateEventsForUser(user.last_digest_sent_at);

    // Check if there are any events
    if (!this.hasEvents(curated)) {
      this.logger.log(
        `[DigestService] Skipping digest for user ${user.user_id} - no events to send`,
      );
      return false;
    }

    // Render digest template
    const { html, text, subject } = await this.renderDigest(
      curated,
      user,
      frequency,
    );

    // Send email via Resend with RFC 8058 headers
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: user.email,
        subject,
        html,
        text,
        headers: {
          'List-Unsubscribe': `<${this.apiBaseUrl}/email-preferences/unsubscribe/${user.unsubscribe_token}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });

      this.logger.log(
        `[DigestService] Sent digest to user ${user.user_id} (${user.email})`,
      );

      // Update last_digest_sent_at timestamp
      await this.updateLastDigestSentAt(user.user_id);

      return true;
    } catch (error) {
      this.logger.error(
        `[DigestService] Failed to send digest to user ${user.user_id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /**
   * Send digests to a batch of users with error isolation
   * Returns count of sent, skipped, and failed emails
   */
  async sendBatchDigests(
    users: SubscribedUser[],
    frequency: 'weekly' | 'monthly',
  ): Promise<{ sent: number; skipped: number; failed: number }> {
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const result = await this.sendDigestToUser(user, frequency);
        if (result) {
          sent++;
        } else {
          skipped++;
        }

        // Rate limiting delay (200ms between sends)
        await this.sleep(200);
      } catch (error) {
        this.logger.error(
          `[DigestService] Error sending digest to user ${user.user_id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        failed++;
        // Continue processing other users despite this failure
      }
    }

    this.logger.log(
      `[DigestService] Digest batch complete: ${sent} sent, ${skipped} skipped (empty), ${failed} failed out of ${users.length} users`,
    );

    return { sent, skipped, failed };
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Normalizes the configured "from" email
   * Strips surrounding quotes if present
   */
  private normalizeFromEmail(value: string): string {
    if (!value) {
      return '';
    }

    let normalized = value.trim();

    // Strip one level of surrounding single or double quotes, if present
    if (
      (normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))
    ) {
      normalized = normalized.slice(1, -1).trim();
    }

    return normalized;
  }
}
