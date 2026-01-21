import { Injectable, Inject } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';

type AuditAction =
  | 'created'
  | 'updated'
  | 'published'
  | 'unpublished'
  | 'deleted'
  | 'joined'
  | 'cancelled'
  | 'promoted'
  | 'removed'
  | 'manager_added'
  | 'manager_removed'
  | 'cloned'
  | 'email_sent'
  | 'email_test_sent'
  | 'role_updated'
  | 'event_created'
  | 'event_updated'
  | 'event_published'
  | 'event_deleted'
  | 'organizer_added'
  | 'organizer_removed'
  | 'cancel_occurrence'
  | 'update_occurrence'
  | 'split_recurring_series';

@Injectable()
export class AuditService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async log(
    jamId: string,
    actorUserId: string,
    action: AuditAction,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.supabase.from('audit_log').insert({
        jam_id: jamId,
        actor_user_id: actorUserId,
        action,
        metadata: metadata || null,
      });
    } catch (error) {
      // Log the error but don't fail the main operation
      console.error('Failed to create audit log:', error);
    }
  }

  async getJamAuditLog(jamId: string) {
    const { data, error } = await this.supabase
      .from('audit_log')
      .select('*')
      .eq('jam_id', jamId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch audit log: ${error.message}`);
    }

    return data;
  }
}
