import { EventOrganizersService } from './event-organizers.service';
import { createSupabaseMock } from '../test-utils/supabase-mock';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('EventOrganizersService', () => {
  const auditService = { log: jest.fn() };

  beforeEach(() => {
    auditService.log = jest.fn().mockResolvedValue(undefined);
  });

  describe('addCoOrganizer', () => {
    it('allows owner to add co-organizer', async () => {
      const organizerInsertPayloads: unknown[] = [];

      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
              },
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: { id: 'user-2', first_name: 'John' },
              error: null,
            },
          },
        ],
        event_organizers: [
          {
            selectResponse: {
              data: null, // No existing co-organizer
              error: null,
            },
          },
          {
            response: {
              data: {
                id: 'org-123',
                event_id: 'event-123',
                user_id: 'user-2',
                added_by: 'user-1',
              },
              error: null,
            },
            onInsert: (payload) => organizerInsertPayloads.push(payload),
          },
        ],
      });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      await service.addCoOrganizer('event-123', 'user-1', 'user-2', false);

      expect(organizerInsertPayloads).toHaveLength(1);
      expect(organizerInsertPayloads[0]).toMatchObject({
        event_id: 'event-123',
        user_id: 'user-2',
        added_by: 'user-1',
      });
      expect(auditService.log).toHaveBeenCalledWith(
        'event-123',
        'user-1',
        'organizer_added',
        { co_organizer_user_id: 'user-2' },
      );
    });

    it('allows super admin to add co-organizer', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
              },
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: { is_super_admin: true },
              error: null,
            },
          },
          {
            response: {
              data: { id: 'user-2', first_name: 'John' },
              error: null,
            },
          },
        ],
        event_organizers: [
          {
            selectResponse: {
              data: null,
              error: null,
            },
          },
          {
            response: {
              data: {
                id: 'org-123',
                event_id: 'event-123',
                user_id: 'user-2',
              },
              error: null,
            },
          },
        ],
      });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      await service.addCoOrganizer('event-123', 'admin-user', 'user-2', true);

      // Should succeed without checking ownership
      expect(auditService.log).toHaveBeenCalled();
    });

    it('throws ForbiddenException when non-owner tries to add co-organizer', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
              },
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: { is_super_admin: false },
              error: null,
            },
          },
        ],
      });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.addCoOrganizer('event-123', 'user-3', 'user-2', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
              },
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: null, // User doesn't exist
              error: null,
            },
          },
        ],
      });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.addCoOrganizer('event-123', 'user-1', 'nonexistent', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when owner tries to add themselves', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
              },
              error: null,
            },
          },
        ],
      });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.addCoOrganizer('event-123', 'user-1', 'user-1', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when co-organizer already exists', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
              },
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: { id: 'user-2', first_name: 'John' },
              error: null,
            },
          },
        ],
        event_organizers: [
          {
            selectResponse: {
              data: {
                id: 'existing-org',
                event_id: 'event-123',
                user_id: 'user-2',
              },
              error: null,
            },
          },
        ],
      });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.addCoOrganizer('event-123', 'user-1', 'user-2', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when event does not exist', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: null,
              error: null,
            },
          },
        ],
      });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.addCoOrganizer('nonexistent', 'user-1', 'user-2', false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCoOrganizers', () => {
    it('allows owner to view co-organizers', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
              },
              error: null,
            },
          },
        ],
        event_organizers: [
          {
            selectResponse: {
              data: null, // Authorization check - owner doesn't need to be in event_organizers
              error: null,
            },
          },
          {
            response: {
              data: [
                {
                  id: 'org-1',
                  event_id: 'event-123',
                  user_id: 'user-2',
                  added_by: 'user-1',
                  created_at: '2025-01-01T10:00:00.000Z',
                },
              ],
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: [
                {
                  id: 'user-2',
                  first_name: 'John',
                  last_name: 'Doe',
                  email: 'john@example.com',
                  photo_url: null,
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.getCoOrganizers('event-123', 'user-1', false);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'org-1',
        user_id: 'user-2',
      });
    });

    it('allows co-organizer to view co-organizers', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
              },
              error: null,
            },
          },
        ],
        event_organizers: [
          {
            selectResponse: {
              data: { user_id: 'user-2' }, // Authorization check - user-2 is a co-organizer
              error: null,
            },
          },
          {
            response: {
              data: [],
              error: null,
            },
          },
        ],
      });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      await service.getCoOrganizers('event-123', 'user-2', false);

      // Should succeed because user-2 is a co-organizer
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when user has no access', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
              },
              error: null,
            },
          },
        ],
        event_organizers: [
          {
            selectResponse: {
              data: null, // Authorization check - user-3 is NOT a co-organizer
              error: null,
            },
          },
        ],
      });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.getCoOrganizers('event-123', 'user-3', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeCoOrganizer', () => {
    it('allows owner to remove co-organizer', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
              },
              error: null,
            },
          },
        ],
        event_organizers: [
          {
            selectResponse: {
              data: {
                id: 'org-123',
                event_id: 'event-123',
                user_id: 'user-2',
              },
              error: null,
            },
          },
          {
            response: { data: null, error: null },
          },
        ],
      });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      await service.removeCoOrganizer('event-123', 'org-123', 'user-1', false);

      expect(auditService.log).toHaveBeenCalledWith(
        'event-123',
        'user-1',
        'organizer_removed',
        { organizer_id: 'org-123' },
      );
    });

    it('allows super admin to remove co-organizer', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
              },
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: { is_super_admin: true },
              error: null,
            },
          },
        ],
        event_organizers: [
          {
            selectResponse: {
              data: {
                id: 'org-123',
                event_id: 'event-123',
                user_id: 'user-2',
              },
              error: null,
            },
          },
          {
            response: { data: null, error: null },
          },
        ],
      });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      await service.removeCoOrganizer('event-123', 'org-123', 'admin-user', true);

      expect(auditService.log).toHaveBeenCalled();
    });

    it('throws ForbiddenException when non-owner tries to remove co-organizer', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
              },
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: { is_super_admin: false },
              error: null,
            },
          },
        ],
      });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.removeCoOrganizer('event-123', 'org-123', 'user-3', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('succeeds even when co-organizer does not exist (idempotent delete)', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
              },
              error: null,
            },
          },
        ],
        event_organizers: [
          {
            response: {
              data: null, // DELETE returns null (no rows deleted)
              error: null,
            },
          },
        ],
      });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.removeCoOrganizer(
        'event-123',
        'nonexistent',
        'user-1',
        false,
      );

      expect(result).toEqual({ message: 'Co-organizer removed successfully' });
      expect(auditService.log).toHaveBeenCalledWith(
        'event-123',
        'user-1',
        'organizer_removed',
        { organizer_id: 'nonexistent' },
      );
    });
  });
});
