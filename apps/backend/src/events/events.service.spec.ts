import { EventsService } from './events.service';
import { createSupabaseMock } from '../test-utils/supabase-mock';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('EventsService', () => {
  const auditService = { log: jest.fn() };

  beforeEach(() => {
    auditService.log = jest.fn().mockResolvedValue(undefined);
  });

  describe('createEvent', () => {
    it('creates event with all required fields', async () => {
      const eventInsertPayloads: unknown[] = [];

      const supabase = createSupabaseMock({
        events: [
          {
            response: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
                type: 'class',
                title: 'Beginner Class',
                location_text: 'Studio A',
                starts_at: '2026-02-01T10:00:00Z',
                ends_at: '2026-02-01T12:00:00Z',
                status: 'draft',
              },
              error: null,
            },
            onInsert: (payload) => eventInsertPayloads.push(payload),
          },
        ],
      });

      const service = new EventsService(supabase.client, auditService as any);

      const result = await service.createEvent('user-1', {
        type: 'class',
        title: 'Beginner Class',
        location_text: 'Studio A',
        starts_at: '2026-02-01T10:00:00Z',
        ends_at: '2026-02-01T12:00:00Z',
      });

      expect(eventInsertPayloads).toHaveLength(1);
      expect(eventInsertPayloads[0]).toMatchObject({
        owner_id: 'user-1',
        type: 'class',
        title: 'Beginner Class',
        location_text: 'Studio A',
        status: 'draft',
      });
      expect(result.id).toBe('event-123');
      expect(auditService.log).toHaveBeenCalledWith(
        'event-123',
        'user-1',
        'event_created',
        {
          event_title: 'Beginner Class',
          event_type: 'class',
        },
      );
    });

    it('creates event with all optional fields', async () => {
      const eventInsertPayloads: unknown[] = [];

      const supabase = createSupabaseMock({
        events: [
          {
            response: {
              data: {
                id: 'event-456',
                owner_id: 'user-1',
                type: 'workshop',
                title: 'Advanced Workshop',
                location_text: 'Community Center',
                starts_at: '2026-03-15T14:00:00Z',
                ends_at: '2026-03-15T18:00:00Z',
                description: 'Deep dive into washing machines',
                price: '$75',
                external_link: 'https://example.com/workshop',
                organizer_contact: 'organizer@example.com',
                status: 'draft',
              },
              error: null,
            },
            onInsert: (payload) => eventInsertPayloads.push(payload),
          },
        ],
      });

      const service = new EventsService(supabase.client, auditService as any);

      await service.createEvent('user-1', {
        type: 'workshop',
        title: 'Advanced Workshop',
        location_text: 'Community Center',
        starts_at: '2026-03-15T14:00:00Z',
        ends_at: '2026-03-15T18:00:00Z',
        description: 'Deep dive into washing machines',
        price: '$75',
        external_link: 'https://example.com/workshop',
        organizer_contact: 'organizer@example.com',
      });

      expect(eventInsertPayloads[0]).toMatchObject({
        description: 'Deep dive into washing machines',
        price: '$75',
        external_link: 'https://example.com/workshop',
        organizer_contact: 'organizer@example.com',
      });
    });

    it('supports all four event types', async () => {
      const eventTypes = ['jam', 'class', 'workshop', 'convention'];

      for (const type of eventTypes) {
        const eventInsertPayloads: unknown[] = [];
        const supabase = createSupabaseMock({
          events: [
            {
              response: {
                data: { id: `event-${type}`, type, owner_id: 'user-1' },
                error: null,
              },
              onInsert: (payload) => eventInsertPayloads.push(payload),
            },
          ],
        });

        const service = new EventsService(supabase.client, auditService as any);

        await service.createEvent('user-1', {
          type: type as any,
          title: `Test ${type}`,
          location_text: 'Test Location',
          starts_at: '2026-02-01T10:00:00Z',
          ends_at: '2026-02-01T12:00:00Z',
        });

        expect(eventInsertPayloads[0]).toMatchObject({ type });
      }
    });

    it('validates that ends_at is after starts_at', async () => {
      const supabase = createSupabaseMock({});
      const service = new EventsService(supabase.client, auditService as any);

      await expect(
        service.createEvent('user-1', {
          type: 'class',
          title: 'Invalid Event',
          location_text: 'Studio',
          starts_at: '2026-02-01T12:00:00Z',
          ends_at: '2026-02-01T10:00:00Z', // Before starts_at
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateEvent', () => {
    it('allows owner to update their own event', async () => {
      const updatePayloads: unknown[] = [];

      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
                type: 'class',
                title: 'Old Title',
              },
              error: null,
            },
          },
          {
            updateResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
                type: 'class',
                title: 'New Title',
              },
              error: null,
            },
            onUpdate: (payload) => updatePayloads.push(payload),
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: true, error: null });

      const service = new EventsService(supabase.client, auditService as any);

      await service.updateEvent('event-123', 'user-1', {
        title: 'New Title',
      });

      expect(updatePayloads).toHaveLength(1);
      expect(updatePayloads[0]).toMatchObject({ title: 'New Title' });
      expect(auditService.log).toHaveBeenCalledWith(
        'event-123',
        'user-1',
        'event_updated',
        expect.any(Object),
      );
    });

    it('allows co-organizer to update event', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1', // Owner is different
                type: 'class',
              },
              error: null,
            },
          },
          {
            updateResponse: {
              data: { id: 'event-123' },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: true, error: null }); // Co-organizer check passes

      const service = new EventsService(supabase.client, auditService as any);

      await service.updateEvent('event-123', 'user-2', {
        title: 'Updated by co-organizer',
      });

      expect(supabase.client.rpc).toHaveBeenCalledWith(
        'is_event_owner_or_organizer',
        { event_id: 'event-123', user_id: 'user-2' },
      );
    });

    it('allows super admin to update any event', async () => {
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
          {
            updateResponse: {
              data: { id: 'event-123' },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest.fn();

      const service = new EventsService(supabase.client, auditService as any);

      await service.updateEvent('event-123', 'admin-user', {
        title: 'Updated by admin',
      }, true); // Pass isSuperAdmin flag

      // Should not call RPC check since isSuperAdmin is true
      expect(supabase.client.rpc).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when user is not owner or co-organizer', async () => {
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

      const service = new EventsService(supabase.client, auditService as any);

      await expect(
        service.updateEvent('event-123', 'user-3', { title: 'Unauthorized' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when event does not exist (RPC returns false)', async () => {
      const supabase = createSupabaseMock({});
      // Mock RPC to return false since event doesn't exist
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: false, error: null });

      const service = new EventsService(supabase.client, auditService as any);

      // Note: Authorization check happens first, so non-existent events
      // result in ForbiddenException rather than NotFoundException
      await expect(
        service.updateEvent('nonexistent', 'user-1', { title: 'Nope' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteEvent', () => {
    it('allows owner to delete their own event', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
                status: 'published',
                title: 'Test Event',
              },
              error: null,
            },
          },
          {
            response: { data: null, error: null },
          },
        ],
      });

      const service = new EventsService(supabase.client, auditService as any);

      await service.deleteEvent('event-123', 'user-1', false);

      expect(auditService.log).toHaveBeenCalledWith(
        'event-123',
        'user-1',
        'event_deleted',
        expect.any(Object),
      );
    });

    it('allows super admin to delete any event', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
                status: 'published',
                title: 'Test Event',
              },
              error: null,
            },
          },
          {
            response: { data: null, error: null },
          },
        ],
      });

      const service = new EventsService(supabase.client, auditService as any);

      await service.deleteEvent('event-123', 'admin-user', true);

      expect(auditService.log).toHaveBeenCalledWith(
        'event-123',
        'admin-user',
        'event_deleted',
        expect.any(Object),
      );
    });

    it('throws ForbiddenException when non-owner tries to delete', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            selectResponse: {
              data: {
                id: 'event-123',
                owner_id: 'user-1',
                status: 'published',
              },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: false, error: null });

      const service = new EventsService(supabase.client, auditService as any);

      await expect(
        service.deleteEvent('event-123', 'user-2', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('publishEvent', () => {
    it('publishes draft event', async () => {
      const supabase = createSupabaseMock({
        events: [
          {
            response: {
              data: {
                id: 'event-123',
                status: 'published',
              },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: true, error: null });

      const service = new EventsService(supabase.client, auditService as any);

      const result = await service.publishEvent('event-123', 'user-1', false);

      expect(result.status).toBe('published');
      expect(auditService.log).toHaveBeenCalledWith(
        'event-123',
        'user-1',
        'event_published',
      );
    });
  });

  describe('authorization checks', () => {
    it('bypasses RPC call when isSuperAdmin flag is true', async () => {
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
          {
            updateResponse: {
              data: { id: 'event-123' },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest.fn();

      const service = new EventsService(supabase.client, auditService as any);

      await service.updateEvent('event-123', 'admin-user', { title: 'Test' }, true);

      // RPC should not be called since isSuperAdmin is true
      expect(supabase.client.rpc).not.toHaveBeenCalled();
    });
  });
});
