import { JamsService } from './jams.service';
import { createSupabaseMock } from '../test-utils/supabase-mock';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('JamsService', () => {
  const auditService = { log: jest.fn() };
  const emailService = { sendCustomEmail: jest.fn() };

  beforeEach(() => {
    auditService.log = jest.fn().mockResolvedValue(undefined);
    emailService.sendCustomEmail = jest.fn().mockResolvedValue(undefined);
  });

  it('enrols the owner as participant when creating a jam', async () => {
    const jamInsertPayloads: unknown[] = [];
    const participantInsertPayloads: unknown[] = [];

    const supabase = createSupabaseMock({
      jams: [
        {
          response: {
            data: {
              id: 'jam-create',
              owner_id: 'owner-1',
              status: 'draft',
            },
            error: null,
          },
          onInsert: (payload) => jamInsertPayloads.push(payload),
        },
      ],
      jam_participants: [
        {
          response: { data: null, error: null },
          selectResponse: { data: null, error: null },
        },
        {
          response: { data: null, error: null },
          onInsert: (payload) => participantInsertPayloads.push(payload),
        },
      ],
      profiles: [
        {
          response: {
            data: { main_role: 'flyer' },
            error: null,
          },
        },
      ],
    });
    (supabase.client as any).rpc = jest
      .fn()
      .mockResolvedValue({ data: true, error: null });

    const service = new JamsService(
      supabase.client,
      auditService as any,
      emailService as any,
    );

    await service.createJam('owner-1', {
      name: 'Morning Jam',
      location: {
        description: 'Park',
        latitude: 45.1,
        longitude: 9.1,
        google_maps_url: 'https://maps.google.com/?q=park',
      },
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 3600000).toISOString(),
    });

    expect(jamInsertPayloads).toHaveLength(1);
    expect(jamInsertPayloads[0]).toMatchObject({
      owner_id: 'owner-1',
      location_text: 'Park',
      location_lat: 45.1,
      location_lng: 9.1,
      location: {
        description: 'Park',
        latitude: 45.1,
        longitude: 9.1,
        google_maps_url: 'https://maps.google.com/?q=park',
      },
    });
    expect(participantInsertPayloads).toHaveLength(1);
    expect(participantInsertPayloads[0]).toMatchObject({
      jam_id: 'jam-create',
      user_id: 'owner-1',
      role: 'flyer',
      state: 'participant',
      source: 'owner',
    });
  });

  it('does not duplicate owner participation when already enrolled before publish', async () => {
    const supabase = createSupabaseMock({
      jams: [
        {
          response: {
            data: {
              id: 'jam-publish',
              owner_id: 'owner-2',
              status: 'draft',
            },
            error: null,
          },
        },
        {
          response: {
            data: {
              id: 'jam-publish',
              owner_id: 'owner-2',
              status: 'published',
            },
            error: null,
          },
        },
      ],
      jam_participants: [
        {
          response: {
            data: {
              id: 'existing',
            },
            error: null,
          },
        },
      ],
    });
    (supabase.client as any).rpc = jest
      .fn()
      .mockResolvedValue({ data: true, error: null });

    const service = new JamsService(
      supabase.client,
      auditService as any,
      emailService as any,
    );

    await service.publishJam('jam-publish', 'owner-2');

    expect(supabase.from).toHaveBeenCalledWith('jam_participants');
    expect(auditService.log).toHaveBeenCalledWith(
      'jam-publish',
      'owner-2',
      'published',
    );
  });

  describe('getPublishedJams', () => {
    it('returns published jams with participant counts', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: [
                {
                  id: 'jam-1',
                  name: 'Morning Jam',
                  status: 'published',
                  starts_at: '2024-01-01T10:00:00Z',
                  jam_participants: [
                    { id: 'p1', state: 'participant' },
                    { id: 'p2', state: 'participant' },
                    { id: 'w1', state: 'waiting' },
                  ],
                },
                {
                  id: 'jam-2',
                  name: 'Evening Jam',
                  status: 'published',
                  starts_at: '2024-01-02T18:00:00Z',
                  jam_participants: [
                    { id: 'p3', state: 'participant' },
                  ],
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getPublishedJams();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('jam-1');
      expect(result[0].participant_count).toBe(2);
      expect(result[0].waiting_count).toBe(1);
      expect(result[1].id).toBe('jam-2');
      expect(result[1].participant_count).toBe(1);
      expect(result[1].waiting_count).toBe(0);
    });

    it('returns empty array when no published jams exist', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: [],
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getPublishedJams();

      expect(result).toEqual([]);
    });

    it('throws error when database query fails', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: null,
              error: { message: 'Database error' },
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      await expect(service.getPublishedJams()).rejects.toThrow(
        'Failed to fetch jams',
      );
    });

    it('handles jams with no participants', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: [
                {
                  id: 'jam-1',
                  name: 'Empty Jam',
                  status: 'published',
                  starts_at: '2024-01-01T10:00:00Z',
                  jam_participants: [],
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getPublishedJams();

      expect(result).toHaveLength(1);
      expect(result[0].participant_count).toBe(0);
      expect(result[0].waiting_count).toBe(0);
    });
  });

  describe('getMyJams', () => {
    it('returns owned jams with participant counts', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: [
                {
                  id: 'jam-1',
                  name: 'My Jam',
                  owner_id: 'user-1',
                  starts_at: '2024-01-01T10:00:00Z',
                  jam_participants: [
                    { id: 'p1', state: 'participant' },
                    { id: 'p2', state: 'participant' },
                  ],
                },
              ],
              error: null,
            },
          },
        ],
        jam_managers: [
          {
            response: {
              data: [],
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getMyJams('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('jam-1');
      expect(result[0].participant_count).toBe(2);
    });

    it('returns managed jams with participant counts', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: [],
              error: null,
            },
          },
          {
            response: {
              data: [
                {
                  id: 'jam-2',
                  name: 'Managed Jam',
                  owner_id: 'owner-1',
                  starts_at: '2024-01-02T10:00:00Z',
                  jam_participants: [
                    { id: 'p1', state: 'participant' },
                    { id: 'w1', state: 'waiting' },
                  ],
                },
              ],
              error: null,
            },
          },
        ],
        jam_managers: [
          {
            response: {
              data: [{ jam_id: 'jam-2' }],
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getMyJams('manager-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('jam-2');
      expect(result[0].participant_count).toBe(1);
      expect(result[0].waiting_count).toBe(1);
    });

    it('returns both owned and managed jams without duplicates', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: [
                {
                  id: 'jam-1',
                  name: 'Owned Jam',
                  owner_id: 'user-1',
                  starts_at: '2024-01-01T10:00:00Z',
                  jam_participants: [],
                },
              ],
              error: null,
            },
          },
          {
            response: {
              data: [
                {
                  id: 'jam-2',
                  name: 'Managed Jam',
                  owner_id: 'owner-1',
                  starts_at: '2024-01-02T10:00:00Z',
                  jam_participants: [],
                },
              ],
              error: null,
            },
          },
        ],
        jam_managers: [
          {
            response: {
              data: [{ jam_id: 'jam-2' }],
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getMyJams('user-1');

      expect(result).toHaveLength(2);
      expect(result.map((j) => j.id)).toContain('jam-1');
      expect(result.map((j) => j.id)).toContain('jam-2');
    });

    it('returns empty array when user has no jams', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: [],
              error: null,
            },
          },
        ],
        jam_managers: [
          {
            response: {
              data: [],
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getMyJams('user-1');

      expect(result).toEqual([]);
    });

    it('sorts jams by starts_at ascending', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: [
                {
                  id: 'jam-2',
                  name: 'Later Jam',
                  owner_id: 'user-1',
                  starts_at: '2024-01-02T10:00:00Z',
                  jam_participants: [],
                },
                {
                  id: 'jam-1',
                  name: 'Earlier Jam',
                  owner_id: 'user-1',
                  starts_at: '2024-01-01T10:00:00Z',
                  jam_participants: [],
                },
              ],
              error: null,
            },
          },
        ],
        jam_managers: [
          {
            response: {
              data: [],
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getMyJams('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('jam-1');
      expect(result[1].id).toBe('jam-2');
    });
  });

  describe('getJamById', () => {
    it('returns jam with participant counts for published jam', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Test Jam',
                status: 'published',
                owner_id: 'owner-1',
                jam_participants: [
                  { id: 'p1', state: 'participant' },
                  { id: 'p2', state: 'participant' },
                  { id: 'w1', state: 'waiting' },
                ],
              },
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getJamById('jam-1');

      expect(result.id).toBe('jam-1');
      expect(result.participant_count).toBe(2);
      expect(result.waiting_count).toBe(1);
    });

    it('allows owner to view draft jam', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Draft Jam',
                status: 'draft',
                owner_id: 'owner-1',
                jam_participants: [],
              },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: true, error: null });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getJamById('jam-1', 'owner-1');

      expect(result.id).toBe('jam-1');
      expect(result.status).toBe('draft');
    });

    it('allows manager to view draft jam', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Draft Jam',
                status: 'draft',
                owner_id: 'owner-1',
                jam_participants: [],
              },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: true, error: null });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getJamById('jam-1', 'manager-1');

      expect(result.id).toBe('jam-1');
    });

    it('throws NotFoundException when jam does not exist', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: null,
              error: { message: 'Not found' },
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      await expect(service.getJamById('non-existent')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user cannot view draft jam', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Draft Jam',
                status: 'draft',
                owner_id: 'owner-1',
                jam_participants: [],
              },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: false, error: null });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      await expect(
        service.getJamById('jam-1', 'unauthorized-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows super admin to view any jam', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Draft Jam',
                status: 'draft',
                owner_id: 'owner-1',
                jam_participants: [],
              },
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getJamById('jam-1', 'admin', true);

      expect(result.id).toBe('jam-1');
    });
  });

  describe('getPublicJamParticipants', () => {
    it('returns participants for published jam with public_participants enabled', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                status: 'published',
                public_participants: true,
              },
              error: null,
            },
          },
        ],
        jam_participants: [
          {
            response: {
              data: [
                {
                  id: 'p1',
                  user_id: 'user-1',
                  role: 'base',
                  state: 'participant',
                  joined_at: '2024-01-01T10:00:00Z',
                },
                {
                  id: 'p2',
                  user_id: 'user-2',
                  role: 'flyer',
                  state: 'participant',
                  joined_at: '2024-01-01T11:00:00Z',
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
                  id: 'user-1',
                  first_name: 'John',
                  last_name: 'Doe',
                  photo_url: 'https://example.com/photo1.jpg',
                },
                {
                  id: 'user-2',
                  first_name: 'Jane',
                  last_name: 'Smith',
                  photo_url: null,
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getPublicJamParticipants('jam-1');

      expect(result.participants).toHaveLength(2);
      expect(result.participants[0].profiles?.first_name).toBe('John');
      expect(result.participants[0].profiles?.last_name).toBe('D.');
      expect(result.participants[1].profiles?.first_name).toBe('Jane');
      expect(result.participants[1].profiles?.last_name).toBe('S.');
    });

    it('throws NotFoundException when jam does not exist', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: null,
              error: { message: 'Not found' },
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      await expect(
        service.getPublicJamParticipants('non-existent'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when jam is not published', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                status: 'draft',
                public_participants: true,
              },
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      await expect(
        service.getPublicJamParticipants('jam-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException when public_participants is false', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                status: 'published',
                public_participants: false,
              },
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      await expect(
        service.getPublicJamParticipants('jam-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns empty array when jam has no participants', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                status: 'published',
                public_participants: true,
              },
              error: null,
            },
          },
        ],
        jam_participants: [
          {
            response: {
              data: [],
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getPublicJamParticipants('jam-1');

      expect(result.participants).toEqual([]);
    });
  });

  describe('updateJam', () => {
    it('successfully updates jam when user is owner', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Original Name',
                owner_id: 'owner-1',
                status: 'draft',
                starts_at: '2024-01-01T10:00:00Z',
                ends_at: '2024-01-01T12:00:00Z',
                jam_participants: [],
              },
              error: null,
            },
          },
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Updated Name',
                owner_id: 'owner-1',
                status: 'draft',
                starts_at: '2024-01-01T10:00:00Z',
                ends_at: '2024-01-01T12:00:00Z',
                jam_participants: [],
              },
              error: null,
            },
            updateResponse: {
              data: {
                id: 'jam-1',
                name: 'Updated Name',
                owner_id: 'owner-1',
                status: 'draft',
                starts_at: '2024-01-01T10:00:00Z',
                ends_at: '2024-01-01T12:00:00Z',
                jam_participants: [],
              },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: true, error: null });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.updateJam('jam-1', 'owner-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(auditService.log).toHaveBeenCalledWith(
        'jam-1',
        'owner-1',
        'updated',
        expect.objectContaining({ name: 'Updated Name' }),
      );
    });

    it('throws ForbiddenException when user is not owner or manager', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Test Jam',
                owner_id: 'owner-1',
                status: 'draft',
                starts_at: '2024-01-01T10:00:00Z',
                ends_at: '2024-01-01T12:00:00Z',
                jam_participants: [],
              },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: false, error: null });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      await expect(
        service.updateJam('jam-1', 'unauthorized-user', { name: 'Hacked' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws BadRequestException when end date is before start date', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Test Jam',
                owner_id: 'owner-1',
                status: 'draft',
                starts_at: '2024-01-01T10:00:00Z',
                ends_at: '2024-01-01T12:00:00Z',
                jam_participants: [],
              },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: true, error: null });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      await expect(
        service.updateJam('jam-1', 'owner-1', {
          starts_at: '2024-01-01T12:00:00Z',
          ends_at: '2024-01-01T10:00:00Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows super admin to update any jam', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Test Jam',
                owner_id: 'owner-1',
                status: 'draft',
                starts_at: '2024-01-01T10:00:00Z',
                ends_at: '2024-01-01T12:00:00Z',
                jam_participants: [],
              },
              error: null,
            },
          },
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Updated by Admin',
                owner_id: 'owner-1',
                status: 'draft',
                starts_at: '2024-01-01T10:00:00Z',
                ends_at: '2024-01-01T12:00:00Z',
                jam_participants: [],
              },
              error: null,
            },
            updateResponse: {
              data: {
                id: 'jam-1',
                name: 'Updated by Admin',
                owner_id: 'owner-1',
                status: 'draft',
                starts_at: '2024-01-01T10:00:00Z',
                ends_at: '2024-01-01T12:00:00Z',
                jam_participants: [],
              },
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.updateJam(
        'jam-1',
        'admin',
        { name: 'Updated by Admin' },
        true,
      );

      expect(result.name).toBe('Updated by Admin');
    });
  });

  describe('deleteJam', () => {
    it('successfully deletes jam when user is owner', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Test Jam',
                owner_id: 'owner-1',
                status: 'draft',
                jam_participants: [],
              },
              error: null,
            },
          },
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Test Jam',
                owner_id: 'owner-1',
                status: 'draft',
                jam_participants: [],
              },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: true, error: null });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.deleteJam('jam-1', 'owner-1');

      expect(result.message).toBe('Jam deleted successfully');
    });

    it('throws ForbiddenException when user is not owner or manager', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Test Jam',
                owner_id: 'owner-1',
                status: 'draft',
                jam_participants: [],
              },
              error: null,
            },
          },
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Test Jam',
                owner_id: 'owner-1',
                status: 'draft',
                jam_participants: [],
              },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: false, error: null });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      await expect(
        service.deleteJam('jam-1', 'unauthorized-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows super admin to delete any jam', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Test Jam',
                owner_id: 'owner-1',
                status: 'draft',
                jam_participants: [],
              },
              error: null,
            },
          },
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Test Jam',
                owner_id: 'owner-1',
                status: 'draft',
                jam_participants: [],
              },
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.deleteJam('jam-1', 'admin', true);

      expect(result.message).toBe('Jam deleted successfully');
    });

    it('throws error when delete fails', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Test Jam',
                owner_id: 'owner-1',
                status: 'draft',
                jam_participants: [],
              },
              error: null,
            },
          },
          {
            response: {
              data: null,
              error: { message: 'Delete failed' },
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: true, error: null });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      await expect(service.deleteJam('jam-1', 'owner-1')).rejects.toThrow(
        'Failed to delete jam',
      );
    });
  });

  describe('getJamsUserParticipatesIn', () => {
    it('returns jams user participates in', async () => {
      const supabase = createSupabaseMock({
        jam_participants: [
          {
            response: {
              data: [
                { jam_id: 'jam-1' },
                { jam_id: 'jam-2' },
              ],
              error: null,
            },
          },
        ],
        jams: [
          {
            response: {
              data: [
                {
                  id: 'jam-1',
                  name: 'Jam 1',
                  status: 'published',
                  starts_at: '2024-01-01T10:00:00Z',
                  jam_participants: [
                    { id: 'p1', state: 'participant' },
                  ],
                },
                {
                  id: 'jam-2',
                  name: 'Jam 2',
                  status: 'published',
                  starts_at: '2024-01-02T10:00:00Z',
                  jam_participants: [
                    { id: 'p2', state: 'participant' },
                    { id: 'w1', state: 'waiting' },
                  ],
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getJamsUserParticipatesIn('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('jam-1');
      expect(result[0].participant_count).toBe(1);
      expect(result[1].id).toBe('jam-2');
      expect(result[1].participant_count).toBe(1);
      expect(result[1].waiting_count).toBe(1);
    });

    it('returns empty array when user has no participations', async () => {
      const supabase = createSupabaseMock({
        jam_participants: [
          {
            response: {
              data: [],
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getJamsUserParticipatesIn('user-1');

      expect(result).toEqual([]);
    });

    it('only returns published or draft jams', async () => {
      const supabase = createSupabaseMock({
        jam_participants: [
          {
            response: {
              data: [{ jam_id: 'jam-1' }],
              error: null,
            },
          },
        ],
        jams: [
          {
            response: {
              data: [
                {
                  id: 'jam-1',
                  name: 'Published Jam',
                  status: 'published',
                  starts_at: '2024-01-01T10:00:00Z',
                  jam_participants: [],
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.getJamsUserParticipatesIn('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('published');
    });
  });

  describe('cloneJam', () => {
    it('successfully clones a jam', async () => {
      const jamInsertPayloads: unknown[] = [];
      const participantInsertPayloads: unknown[] = [];
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Original Jam',
                owner_id: 'owner-1',
                status: 'published',
                location: {
                  description: 'Park',
                  latitude: 45.1,
                  longitude: 9.1,
                },
                location_text: 'Park',
                location_lat: 45.1,
                location_lng: 9.1,
                description: 'Original description',
                capacity: 10,
                desired_bases_max: 5,
                desired_flyers_max: 5,
                auto_promote: true,
                jam_participants: [],
              },
              error: null,
            },
          },
          {
            response: {
              data: {
                id: 'jam-clone',
                name: 'Original Jam (Copia)',
                owner_id: 'owner-1',
                status: 'draft',
                location: {
                  description: 'Park',
                  latitude: 45.1,
                  longitude: 9.1,
                },
                location_text: 'Park',
                location_lat: 45.1,
                location_lng: 9.1,
                description: 'Original description',
                capacity: 10,
                desired_bases_max: 5,
                desired_flyers_max: 5,
                auto_promote: true,
                jam_participants: [],
              },
              error: null,
            },
            onInsert: (payload) => jamInsertPayloads.push(payload),
          },
        ],
        jam_participants: [
          {
            response: { data: null, error: null },
            selectResponse: { data: null, error: null },
          },
          {
            response: { data: null, error: null },
            onInsert: (payload) => participantInsertPayloads.push(payload),
          },
        ],
        profiles: [
          {
            response: {
              data: { main_role: 'base' },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: true, error: null });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.cloneJam('jam-1', 'owner-1');

      expect(result.name).toBe('Original Jam (Copia)');
      expect(result.status).toBe('draft');
      expect(auditService.log).toHaveBeenCalledWith(
        'jam-clone',
        'owner-1',
        'cloned',
        expect.objectContaining({
          original_jam_id: 'jam-1',
          original_jam_name: 'Original Jam',
        }),
      );
    });

    it('throws ForbiddenException when user cannot clone jam', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Original Jam',
                owner_id: 'owner-1',
                status: 'published',
                jam_participants: [],
              },
              error: null,
            },
          },
        ],
      });
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: false, error: null });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      await expect(
        service.cloneJam('jam-1', 'unauthorized-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows super admin to clone any jam', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: {
                id: 'jam-1',
                name: 'Original Jam',
                owner_id: 'owner-1',
                status: 'published',
                location: null,
                location_text: null,
                description: 'Test',
                capacity: 10,
                jam_participants: [],
              },
              error: null,
            },
          },
          {
            response: {
              data: {
                id: 'jam-clone',
                name: 'Original Jam (Copia)',
                owner_id: 'admin',
                status: 'draft',
                jam_participants: [],
              },
              error: null,
            },
          },
        ],
        jam_participants: [
          {
            response: { data: null, error: null },
            selectResponse: { data: null, error: null },
          },
          {
            response: { data: null, error: null },
          },
        ],
        profiles: [
          {
            response: {
              data: { main_role: 'base' },
              error: null,
            },
          },
        ],
      });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.cloneJam('jam-1', 'admin', true);

      expect(result.name).toBe('Original Jam (Copia)');
    });
  });

  describe('isManagerOrOwner', () => {
    it('returns true for super admin', async () => {
      const supabase = createSupabaseMock({});

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.isManagerOrOwner('jam-1', 'admin', true);

      expect(result).toBe(true);
    });

    it('returns true when user is owner or manager', async () => {
      const supabase = createSupabaseMock({});
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: true, error: null });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.isManagerOrOwner('jam-1', 'user-1', false);

      expect(result).toBe(true);
    });

    it('returns false when user is not owner or manager', async () => {
      const supabase = createSupabaseMock({});
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: false, error: null });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.isManagerOrOwner('jam-1', 'user-1', false);

      expect(result).toBe(false);
    });

    it('returns false when RPC call fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const supabase = createSupabaseMock({});
      (supabase.client as any).rpc = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'RPC error' } });

      const service = new JamsService(
        supabase.client,
        auditService as any,
        emailService as any,
      );

      const result = await service.isManagerOrOwner('jam-1', 'user-1', false);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
