import {
  Injectable,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { UpdateEmailPreferencesDto } from './dto/update-email-preferences.dto';

@Injectable()
export class EmailPreferencesService {
  private readonly logger = new Logger(EmailPreferencesService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getPreferences(userId: string) {
    const { data, error } = await this.supabase
      .from('email_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      this.logger.error(`Supabase error: ${error.message}`);
      throw new NotFoundException(`Email preferences not found: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Email preferences not found: No data returned');
    }

    return data;
  }

  async updatePreferences(userId: string, dto: UpdateEmailPreferencesDto) {
    const { data, error } = await this.supabase
      .from('email_preferences')
      .update({ ...dto, has_seen_digest_prompt: true })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update email preferences: ${error.message}`);
    }

    return data;
  }

  async unsubscribeByToken(token: string) {
    const { data, error } = await this.supabase
      .from('email_preferences')
      .update({ digest_enabled: false })
      .eq('unsubscribe_token', token)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Invalid unsubscribe token');
    }

    this.logger.log(`[EmailPreferencesService] Unsubscribed user via token: ${token}`);
    return data;
  }
}
