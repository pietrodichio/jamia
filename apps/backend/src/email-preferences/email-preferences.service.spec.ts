import { NotFoundException } from '@nestjs/common';
import { EmailPreferencesService } from './email-preferences.service';
import { createSupabaseMock } from '../test-utils/supabase-mock';

describe('EmailPreferencesService', () => {
  describe('getPreferences', () => {
    it('returns preferences for a user', async () => {
      const mockPreferences = {
        user_id: 'user-1',
        digest_enabled: true,
        digest_frequency: 'weekly',
        unsubscribe_token: 'token-123',
        last_digest_sent_at: null,
        has_seen_digest_prompt: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      const { client } = createSupabaseMock({
        email_preferences: [
          {
            response: { data: mockPreferences, error: null },
          },
        ],
      });

      const service = new EmailPreferencesService(client);
      const result = await service.getPreferences('user-1');

      expect(result).toEqual(mockPreferences);
    });

    it('throws NotFoundException when user has no preferences', async () => {
      const { client } = createSupabaseMock({
        email_preferences: [
          {
            response: {
              data: null,
              error: { message: 'No rows found', details: null, hint: null, code: 'PGRST116' },
            },
          },
        ],
      });

      const service = new EmailPreferencesService(client);

      await expect(service.getPreferences('user-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePreferences', () => {
    it('updates and returns preferences', async () => {
      const updatedPreferences = {
        user_id: 'user-1',
        digest_enabled: true,
        digest_frequency: 'weekly',
        unsubscribe_token: 'token-123',
        last_digest_sent_at: null,
        has_seen_digest_prompt: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-10T00:00:00Z',
      };

      const { client } = createSupabaseMock({
        email_preferences: [
          {
            updateResponse: { data: updatedPreferences, error: null },
          },
        ],
      });

      const service = new EmailPreferencesService(client);
      const result = await service.updatePreferences('user-1', {
        digest_enabled: true,
        digest_frequency: 'weekly',
      });

      expect(result).toEqual(updatedPreferences);
      expect(result.digest_enabled).toBe(true);
      expect(result.digest_frequency).toBe('weekly');
    });

    it('throws on update failure', async () => {
      const { client } = createSupabaseMock({
        email_preferences: [
          {
            updateResponse: {
              data: null,
              error: { message: 'Update failed', details: null, hint: null, code: 'PGRST000' },
            },
          },
        ],
      });

      const service = new EmailPreferencesService(client);

      await expect(
        service.updatePreferences('user-1', { digest_enabled: false }),
      ).rejects.toThrow('Failed to update email preferences');
    });
  });

  describe('unsubscribeByToken', () => {
    it('disables digest for valid token', async () => {
      const unsubscribedPreferences = {
        user_id: 'user-1',
        digest_enabled: false,
        digest_frequency: 'weekly',
        unsubscribe_token: 'valid-token',
        last_digest_sent_at: null,
        has_seen_digest_prompt: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-10T00:00:00Z',
      };

      const { client } = createSupabaseMock({
        email_preferences: [
          {
            updateResponse: { data: unsubscribedPreferences, error: null },
          },
        ],
      });

      const service = new EmailPreferencesService(client);
      const result = await service.unsubscribeByToken('valid-token');

      expect(result.digest_enabled).toBe(false);
      expect(result.unsubscribe_token).toBe('valid-token');
    });

    it('throws NotFoundException for invalid token', async () => {
      const { client } = createSupabaseMock({
        email_preferences: [
          {
            updateResponse: {
              data: null,
              error: { message: 'No rows found', details: null, hint: null, code: 'PGRST116' },
            },
          },
        ],
      });

      const service = new EmailPreferencesService(client);

      await expect(service.unsubscribeByToken('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
