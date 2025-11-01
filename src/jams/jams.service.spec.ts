import { JamsService } from './jams.service';
import { createSupabaseMock } from '../test-utils/supabase-mock';

describe('JamsService', () => {
  const auditService = { log: jest.fn() };

  beforeEach(() => {
    auditService.log = jest.fn().mockResolvedValue(undefined);
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

    const service = new JamsService(supabase.client, auditService as any);

    await service.createJam('owner-1', {
      name: 'Morning Jam',
      location_text: 'Park',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 3600000).toISOString(),
    });

    expect(jamInsertPayloads).toHaveLength(1);
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

    const service = new JamsService(supabase.client, auditService as any);

    await service.publishJam('jam-publish', 'owner-2');

    expect(supabase.from).toHaveBeenCalledWith('jam_participants');
    expect(auditService.log).toHaveBeenCalledWith(
      'jam-publish',
      'owner-2',
      'published',
    );
  });
});
