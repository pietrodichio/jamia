export interface EmailPreferencesResponse {
  user_id: string;
  digest_enabled: boolean;
  digest_frequency: 'weekly' | 'monthly';
  unsubscribe_token: string;
  last_digest_sent_at: string | null;
  has_seen_digest_prompt: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateEmailPreferencesDto {
  digest_enabled?: boolean;
  digest_frequency?: 'weekly' | 'monthly';
}
