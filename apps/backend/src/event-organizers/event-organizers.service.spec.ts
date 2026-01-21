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

      await service.addCoOrganizer('event-123', 'user-1', { user_id: 'user-2' });

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
        { organizer_id: 'user-2' },
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

      await service.addCoOrganizer('event-123', 'admin-user', {
        user_id: 'user-2',
      });

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
        service.addCoOrganizer('event-123', 'user-3', { user_id: 'user-2' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when user does not exist', async () => {
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
        service.addCoOrganizer('event-123', 'user-1', {
          user_id: 'nonexistent',
        }),
      ).rejects.toThrow(BadRequestException);
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
        service.addCoOrganizer('event-123', 'user-1', { user_id: 'user-1' }),
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
        service.addCoOrganizer('event-123', 'user-1', { user_id: 'user-2' }),
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
        service.addCoOrganizer('nonexistent', 'user-1', { user_id: 'user-2' }),
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
            response: {
              data: [
                {
                  id: 'org-1',
                  event_id: 'event-123',
                  user_id: 'user-2',
                  profiles: {
                    id: 'user-2',
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john@example.com',
                  },
                },
              ],
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: true, error: null });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.getCoOrganizers('event-123', 'user-1');

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
            response: {
              data: [],
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: true, error: null });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      await service.getCoOrganizers('event-123', 'user-2');

      expect(supabase.client.rpc).toHaveBeenCalledWith(
        'is_event_owner_or_organizer',
        { event_id: 'event-123', user_id: 'user-2' },
      );
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
        profiles: [
          {
            response: {
              data: { is_super_admin: false },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: false, error: null });

      const service = new EventOrganizersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.getCoOrganizers('event-123', 'user-3'),
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

      await service.removeCoOrganizer('event-123', 'org-123', 'user-1');

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

      await service.removeCoOrganizer('event-123', 'org-123', 'admin-user');

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
        service.removeCoOrganizer('event-123', 'org-123', 'user-3'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when co-organizer does not exist', async () => {
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
        service.removeCoOrganizer('event-123', 'nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
