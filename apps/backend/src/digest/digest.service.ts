import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import { SupabaseClient } from '@supabase/supabase-js';
import * as React from 'react';
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

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
    private readonly configService: ConfigService,
  ) {
    this.frontendBaseUrl = this.configService.get<string>(
      'FRONTEND_BASE_URL',
      'https://jamia.app',
    );
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
}
