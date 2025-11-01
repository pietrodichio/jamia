import { BadRequestException } from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { createSupabaseMock } from '../test-utils/supabase-mock';

describe('ParticipantsService', () => {
  const auditService = { log: jest.fn() };

  beforeEach(() => {
    auditService.log = jest.fn().mockResolvedValue(undefined);
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
        {
          response: {
            data: [{ id: 'participant-1', role: 'flyer' }],
            error: null,
          },
        },
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
      jams: [{ response: { data: jam, error: null } }],
      jam_participants: [
        { response: { data: null, error: null } },
        {
          response: {
            data: [{ id: 'participant-1', role: 'base' }],
            error: null,
          },
        },
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
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
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

  it('promotes the first waiting participant whose role fits remaining capacity', async () => {
    const insertedUpdates: unknown[] = [];

    const supabase = createSupabaseMock({
      jam_participants: [
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
        {
          response: {
            data: [
              { id: 'base-1', role: 'base' },
              { id: 'flyer-1', role: 'flyer' },
            ],
            error: null,
          },
        },
        {
          response: {
            data: [
              { id: 'wait-base', user_id: 'user-base', role: 'base' },
              { id: 'wait-flyer', user_id: 'user-flyer', role: 'flyer' },
            ],
            error: null,
          },
        },
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
        {
          response: {
            data: {
              id: 'jam-promote',
              capacity: 3,
              auto_promote: true,
              desired_bases_max: 1,
              desired_flyers_max: 2,
            },
            error: null,
          },
        },
      ],
    });

    const service = new ParticipantsService(
      supabase.client,
      auditService as any,
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
    );

    await expect(
      service.joinJam('jam-unpublished', 'user', { role: 'both' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
