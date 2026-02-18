import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { createSupabaseMock } from '../test-utils/supabase-mock';

describe('ParticipantsService', () => {
  const auditService = { log: jest.fn() };
  const telegramService = { notifyJamManager: jest.fn() };

  beforeEach(() => {
    auditService.log = jest.fn().mockResolvedValue(undefined);
    telegramService.notifyJamManager = jest.fn().mockResolvedValue(undefined);
  });

  it('waitlists a "both" signup when flyer capacity is full', async () => {
    const jam = {
      id: 'jam-1',
      status: 'published',
      capacity: 5,
      desired_bases_max: 2,
      desired_flyers_max: 1,
    };

    const insertedRecords: unknown[] = [];

    const supabase = createSupabaseMock({
      jams: [{ response: { data: jam, error: null } }],
      jam_participants: [
        { response: { data: null, error: null } },
        { response: { data: null, error: null } },
        {
          response: {
            data: [{ id: 'participant-1', role: 'flyer' }],
            error: null,
          },
        },
        { response: { data: [], error: null } },
        {
          response: {
            data: {
              id: 'new-participant',
              role: 'both',
              state: 'waiting',
            },
            error: null,
          },
          onInsert: (payload) => insertedRecords.push(payload),
        },
      ],
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
      null as any,
      telegramService as any,
    );

    const result = await service.joinJam('jam-1', 'user-both', {
      role: 'both',
    });

    expect(result.state).toBe('waiting');
    expect(result.message).toBe('Added to waiting list');
    expect(insertedRecords).toHaveLength(1);
    expect(insertedRecords[0]).toMatchObject({
      state: 'waiting',
      role: 'both',
    });
    expect(auditService.log).toHaveBeenCalledWith(
      'jam-1',
      'user-both',
      'joined',
      expect.objectContaining({ state: 'waiting', role: 'both' }),
    );
  });

  it('admits a "both" signup as participant when flyer capacity allows it', async () => {
    const jam = {
      id: 'jam-2',
      status: 'published',
      capacity: 5,
      desired_bases_max: 2,
      desired_flyers_max: 2,
    };

    const insertedRecords: unknown[] = [];

    const supabase = createSupabaseMock({
      jams: [
        { response: { data: jam, error: null } },
        { response: { data: { owner_id: 'owner-1', telegram_notifications_enabled: true }, error: null } },
      ],
      jam_participants: [
        { response: { data: null, error: null } },
        { response: { data: null, error: null } },
        {
          response: {
            data: [{ id: 'participant-1', role: 'base' }],
            error: null,
          },
        },
        { response: { data: [], error: null } },
        {
          response: {
            data: {
              id: 'new-participant',
              role: 'both',
              state: 'participant',
            },
            error: null,
          },
          onInsert: (payload) => insertedRecords.push(payload),
        },
      ],
      profiles: [
        { response: { data: { telegram_chat_id: null }, error: null } },
      ],
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
      null as any,
      telegramService as any,
    );

    const result = await service.joinJam('jam-2', 'user-both', {
      role: 'both',
    });

    expect(result.state).toBe('participant');
    expect(result.message).toBe('Successfully joined the jam');
    expect(insertedRecords).toHaveLength(1);
    expect(insertedRecords[0]).toMatchObject({
      state: 'participant',
      role: 'both',
    });
  });

  it('allows a previously cancelled participant to rejoin the jam', async () => {
    const jam = {
      id: 'jam-3',
      status: 'published',
      capacity: 5,
    };

    const updatedRecords: unknown[] = [];

    const supabase = createSupabaseMock({
      jams: [
        { response: { data: jam, error: null } },
        { response: { data: { owner_id: 'owner-1', telegram_notifications_enabled: true }, error: null } },
      ],
      jam_participants: [
        { response: { data: null, error: null } },
        {
          response: {
            data: {
              id: 'cancelled-participant',
              jam_id: 'jam-3',
              user_id: 'user-cancelled',
              role: 'flyer',
              state: 'cancelled',
            },
            error: null,
          },
        },
        { response: { data: [], error: null } },
        { response: { data: [], error: null } },
        {
          response: {
            data: {
              id: 'cancelled-participant',
              role: 'flyer',
              state: 'participant',
            },
            error: null,
          },
          updateResponse: {
            data: {
              id: 'cancelled-participant',
              role: 'flyer',
              state: 'participant',
            },
            error: null,
          },
          onUpdate: (payload) => updatedRecords.push(payload),
        },
      ],
      profiles: [
        { response: { data: { telegram_chat_id: null }, error: null } },
      ],
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
      null as any,
      telegramService as any,
    );

    const result = await service.joinJam('jam-3', 'user-cancelled', {
      role: 'flyer',
    });

    expect(result.state).toBe('participant');
    expect(result.role).toBe('flyer');
    expect(updatedRecords).toHaveLength(1);
    expect(updatedRecords[0]).toMatchObject({
      state: 'participant',
      role: 'flyer',
      source: 'direct',
    });
    expect(auditService.log).toHaveBeenCalledWith(
      'jam-3',
      'user-cancelled',
      'joined',
      expect.objectContaining({ state: 'participant', role: 'flyer' }),
    );
  });

  it('returns a rejoining participant to the waiting list when capacity is still full', async () => {
    const jam = {
      id: 'jam-4',
      status: 'published',
      capacity: 1,
    };

    const updatedRecords: unknown[] = [];

    const supabase = createSupabaseMock({
      jams: [{ response: { data: jam, error: null } }],
      jam_participants: [
        { response: { data: null, error: null } },
        {
          response: {
            data: {
              id: 'cancelled-waiting',
              jam_id: 'jam-4',
              user_id: 'user-waiting',
              role: 'flyer',
              state: 'cancelled',
            },
            error: null,
          },
        },
        {
          response: {
            data: [{ id: 'active-participant', role: 'base' }],
            error: null,
          },
        },
        { response: { data: [], error: null } },
        {
          response: {
            data: {
              id: 'cancelled-waiting',
              role: 'flyer',
              state: 'waiting',
            },
            error: null,
          },
          updateResponse: {
            data: {
              id: 'cancelled-waiting',
              role: 'flyer',
              state: 'waiting',
            },
            error: null,
          },
          onUpdate: (payload) => updatedRecords.push(payload),
        },
      ],
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
      null as any,
      telegramService as any,
    );

    const result = await service.joinJam('jam-4', 'user-waiting', {
      role: 'flyer',
    });

    expect(result.state).toBe('waiting');
    expect(result.role).toBe('flyer');
    expect(updatedRecords).toHaveLength(1);
    expect(updatedRecords[0]).toMatchObject({
      state: 'waiting',
      role: 'flyer',
      source: 'direct',
    });
    expect(auditService.log).toHaveBeenCalledWith(
      'jam-4',
      'user-waiting',
      'joined',
      expect.objectContaining({ state: 'waiting', role: 'flyer' }),
    );
  });

  it('promotes the first waiting participant whose role fits remaining capacity', async () => {
    const insertedUpdates: unknown[] = [];

    const supabase = createSupabaseMock({
      jam_participants: [
        // cancelParticipation: fetch participation
        {
          response: {
            data: {
              id: 'participant-1',
              jam_id: 'jam-promote',
              user_id: 'user-original',
              state: 'participant',
            },
            error: null,
          },
        },
        // cancelParticipation: update to cancelled
        {
          response: {
            data: {
              id: 'participant-1',
              state: 'cancelled',
            },
            error: null,
          },
          updateResponse: {
            data: {
              id: 'participant-1',
              state: 'cancelled',
            },
            error: null,
          },
        },
        // promoteFromWaitingList: fetchActiveParticipants
        {
          response: {
            data: [
              { id: 'base-1', role: 'base' },
            ],
            error: null,
          },
        },
        // promoteFromWaitingList: waitingList query
        {
          response: {
            data: [
              { id: 'wait-base', user_id: 'user-base', role: 'base' },
              { id: 'wait-flyer', user_id: 'user-flyer', role: 'flyer' },
            ],
            error: null,
          },
        },
        // promoteFromWaitingList: update wait-flyer to participant
        // (wait-base skipped because bases at max: desired_bases_max=1, base-1 already active)
        {
          response: {
            data: {
              id: 'wait-flyer',
              state: 'participant',
            },
            error: null,
          },
          updateResponse: {
            data: {
              id: 'wait-flyer',
              state: 'participant',
            },
            error: null,
          },
          onUpdate: (payload) => insertedUpdates.push(payload),
        },
      ],
      jams: [
        // cancelParticipation: getJamOwnerTelegramChatId (owner_id + telegram_notifications_enabled)
        {
          response: {
            data: {
              owner_id: 'owner-1',
              telegram_notifications_enabled: true,
            },
            error: null,
          },
        },
        // promoteFromWaitingList: jam details query (auto_promote etc.)
        {
          response: {
            data: {
              capacity: 3,
              auto_promote: true,
              desired_bases_max: 1,
              desired_flyers_max: 2,
              name: 'Test Jam',
              starts_at: '2024-01-01T10:00:00Z',
              location_text: 'Test Location',
              location: null,
              location_lat: null,
              location_lng: null,
            },
            error: null,
          },
        },
      ],
      profiles: [
        // getJamOwnerTelegramChatId: owner telegram_chat_id (null → skip telegram notification)
        { response: { data: { telegram_chat_id: null }, error: null } },
      ],
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
      null as any,
      telegramService as any,
    );

    await service.cancelParticipation('participant-1', 'user-original');

    expect(insertedUpdates).toHaveLength(1);
    expect(insertedUpdates[0]).toMatchObject({
      state: 'participant',
    });
    expect(auditService.log).toHaveBeenCalledWith(
      'jam-promote',
      'user-flyer',
      'promoted',
    );
  });

  it('throws when trying to join an unpublished jam', async () => {
    const jam = {
      id: 'jam-unpublished',
      status: 'draft',
    };

    const supabase = createSupabaseMock({
      jams: [{ response: { data: jam, error: null } }],
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
      null as any,
      telegramService as any,
    );

    await expect(
      service.joinJam('jam-unpublished', 'user', { role: 'both' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows a participant to update their own role', async () => {
    const supabase = createSupabaseMock({
      jam_participants: [
        {
          response: {
            data: {
              id: 'participant-1',
              jam_id: 'jam-role',
              user_id: 'user-1',
              role: 'base',
            },
            error: null,
          },
        },
        {
          response: {
            data: {
              id: 'participant-1',
              jam_id: 'jam-role',
              user_id: 'user-1',
              role: 'flyer',
            },
            error: null,
          },
          updateResponse: {
            data: {
              id: 'participant-1',
              jam_id: 'jam-role',
              user_id: 'user-1',
              role: 'flyer',
            },
            error: null,
          },
        },
      ],
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
      null as any,
      telegramService as any,
    );

    const result = await service.updateParticipantRole(
      'participant-1',
      'user-1',
      'flyer',
    );

    expect(result.role).toBe('flyer');
    expect(auditService.log).toHaveBeenCalledWith(
      'jam-role',
      'user-1',
      'role_updated',
      expect.objectContaining({
        previous_role: 'base',
        new_role: 'flyer',
        target_user_id: 'user-1',
      }),
    );
  });

  it('prevents an unrelated user from updating someone else’s role', async () => {
    const supabase = createSupabaseMock({
      jam_participants: [
        {
          response: {
            data: {
              id: 'participant-1',
              jam_id: 'jam-role',
              user_id: 'user-1',
              role: 'base',
            },
            error: null,
          },
        },
        {
          response: {
            data: {
              id: 'participant-1',
              jam_id: 'jam-role',
              user_id: 'user-1',
              role: 'base',
            },
            error: null,
          },
        },
      ],
      jams: [
        {
          response: {
            data: {
              id: 'jam-role',
              owner_id: 'owner-1',
            },
            error: null,
          },
        },
      ],
      jam_managers: [
        {
          response: {
            data: null,
            error: null,
          },
        },
      ],
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
      null as any,
      telegramService as any,
    );

    await expect(
      service.updateParticipantRole('participant-1', 'other-user', 'flyer'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows the jam owner to manually promote a waiting participant when auto-promote is disabled', async () => {
    const updatedPayloads: unknown[] = [];

    const supabase = createSupabaseMock({
      jam_participants: [
        {
          response: {
            data: {
              id: 'waiting-1',
              jam_id: 'jam-manual',
              user_id: 'user-wait',
              role: 'base',
              state: 'waiting',
            },
            error: null,
          },
        },
        {
          response: {
            data: [{ id: 'existing', role: 'flyer' }],
            error: null,
          },
        },
        {
          response: {
            data: {
              id: 'waiting-1',
              jam_id: 'jam-manual',
              user_id: 'user-wait',
              role: 'base',
              state: 'participant',
            },
            error: null,
          },
          updateResponse: {
            data: {
              id: 'waiting-1',
              jam_id: 'jam-manual',
              user_id: 'user-wait',
              role: 'base',
              state: 'participant',
            },
            error: null,
          },
          onUpdate: (payload) => updatedPayloads.push(payload),
        },
      ],
      jams: [
        {
          response: {
            data: {
              id: 'jam-manual',
              owner_id: 'owner-1',
              status: 'published',
              capacity: 5,
              desired_bases_max: null,
              desired_flyers_max: null,
              auto_promote: false,
              name: 'Manual Jam',
            },
            error: null,
          },
        },
      ],
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
      null as any,
      telegramService as any,
    );

    const result = await service.promoteWaitingParticipant(
      'waiting-1',
      'owner-1',
    );

    expect(result.state).toBe('participant');
    expect(updatedPayloads).toHaveLength(1);
    expect(updatedPayloads[0]).toMatchObject({
      state: 'participant',
    });
    expect(auditService.log).toHaveBeenCalledWith(
      'jam-manual',
      'owner-1',
      'promoted',
      expect.objectContaining({ target_user_id: 'user-wait' }),
    );
  });

  it('prevents manual promotion when auto-promote is active', async () => {
    const supabase = createSupabaseMock({
      jam_participants: [
        {
          response: {
            data: {
              id: 'waiting-2',
              jam_id: 'jam-auto',
              user_id: 'user-wait',
              role: 'flyer',
              state: 'waiting',
            },
            error: null,
          },
        },
      ],
      jams: [
        {
          response: {
            data: {
              id: 'jam-auto',
              owner_id: 'owner-1',
              status: 'published',
              capacity: 5,
              desired_bases_max: null,
              desired_flyers_max: null,
              auto_promote: true,
            },
            error: null,
          },
        },
      ],
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
      null as any,
      telegramService as any,
    );

    await expect(
      service.promoteWaitingParticipant('waiting-2', 'owner-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when updating role for non-existing participation', async () => {
    const supabase = createSupabaseMock({
      jam_participants: [
        {
          response: {
            data: null,
            error: null,
          },
        },
      ],
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
      null as any,
      telegramService as any,
    );

    await expect(
      service.updateParticipantRole('missing', 'user-1', 'base'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('waitlists a new signup when a waiting participant could be admitted and auto-promote is disabled', async () => {
    const jam = {
      id: 'jam-fair-1',
      status: 'published',
      capacity: 2,
      desired_bases_max: 1,
      desired_flyers_max: 1,
      auto_promote: false,
    };

    const insertedRecords: unknown[] = [];

    const supabase = createSupabaseMock({
      jams: [{ response: { data: jam, error: null } }],
      jam_participants: [
        // existingParticipation
        { response: { data: null, error: null } },
        // cancelledParticipation
        { response: { data: null, error: null } },
        // activeParticipants
        {
          response: {
            data: [{ id: 'p-base', role: 'base' }],
            error: null,
          },
        },
        // waitingList
        {
          response: {
            data: [{ id: 'w-flyer', role: 'flyer' }],
            error: null,
          },
        },
        // insert new participant
        {
          response: {
            data: {
              id: 'new-user',
              role: 'base',
              state: 'waiting',
            },
            error: null,
          },
          onInsert: (payload) => insertedRecords.push(payload),
        },
      ],
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
      null as any,
      telegramService as any,
    );

    const result = await service.joinJam('jam-fair-1', 'new-user', {
      role: 'base',
    });

    expect(result.state).toBe('waiting');
    expect(insertedRecords).toHaveLength(1);
    expect(insertedRecords[0]).toMatchObject({
      state: 'waiting',
      role: 'base',
    });
    expect(auditService.log).toHaveBeenCalledWith(
      'jam-fair-1',
      'new-user',
      'joined',
      expect.objectContaining({ state: 'waiting', role: 'base' }),
    );
  });

  it('admits a new signup as participant when only their role fits remaining capacity and auto-promote is disabled', async () => {
    const jam = {
      id: 'jam-fair-2',
      status: 'published',
      capacity: 2,
      desired_bases_max: 1,
      desired_flyers_max: 1,
      auto_promote: false,
    };

    const insertedRecords: unknown[] = [];

    const supabase = createSupabaseMock({
      jams: [
        { response: { data: jam, error: null } },
        { response: { data: { owner_id: 'owner-1', telegram_notifications_enabled: true }, error: null } },
      ],
      jam_participants: [
        // existingParticipation
        { response: { data: null, error: null } },
        // cancelledParticipation
        { response: { data: null, error: null } },
        // activeParticipants: 1 base (base capacity is now full at 1/1)
        {
          response: {
            data: [{ id: 'p-base', role: 'base' }],
            error: null,
          },
        },
        // waitingList: 1 base (cannot be admitted because base is at max 1/1)
        {
          response: {
            data: [{ id: 'w-base', role: 'base' }],
            error: null,
          },
        },
        // insert new participant (flyer) - should be admitted because flyer capacity is 0/1
        {
          response: {
            data: {
              id: 'new-flyer',
              role: 'flyer',
              state: 'participant',
            },
            error: null,
          },
          onInsert: (payload) => insertedRecords.push(payload),
        },
      ],
      profiles: [
        { response: { data: { telegram_chat_id: null }, error: null } },
      ],
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
      null as any,
      telegramService as any,
    );

    const result = await service.joinJam('jam-fair-2', 'new-flyer', {
      role: 'flyer',
    });

    expect(result.state).toBe('participant');
    expect(result.role).toBe('flyer');
    expect(insertedRecords).toHaveLength(1);
    expect(insertedRecords[0]).toMatchObject({
      state: 'participant',
      role: 'flyer',
    });
    expect(auditService.log).toHaveBeenCalledWith(
      'jam-fair-2',
      'new-flyer',
      'joined',
      expect.objectContaining({ state: 'participant', role: 'flyer' }),
    );
  });
});
