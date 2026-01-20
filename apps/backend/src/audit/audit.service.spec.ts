import { AuditService } from './audit.service';
import { createSupabaseMock } from '../test-utils/supabase-mock';

describe('AuditService', () => {
  describe('log', () => {
    it('successfully logs an audit entry without metadata', async () => {
      const insertedPayloads: unknown[] = [];
      const supabase = createSupabaseMock({
        audit_log: [
          {
            response: {
              data: {
                id: 'audit-1',
                jam_id: 'jam-1',
                actor_user_id: 'user-1',
                action: 'joined',
                metadata: null,
                created_at: '2024-01-01T00:00:00Z',
              },
              error: null,
            },
            onInsert: (payload) => insertedPayloads.push(payload),
          },
        ],
      });

      const service = new AuditService(supabase.client);

      await service.log('jam-1', 'user-1', 'joined');

      expect(insertedPayloads).toHaveLength(1);
      expect(insertedPayloads[0]).toMatchObject({
        jam_id: 'jam-1',
        actor_user_id: 'user-1',
        action: 'joined',
        metadata: null,
      });
    });

    it('successfully logs an audit entry with metadata', async () => {
      const insertedPayloads: unknown[] = [];
      const supabase = createSupabaseMock({
        audit_log: [
          {
            response: {
              data: {
                id: 'audit-1',
                jam_id: 'jam-1',
                actor_user_id: 'user-1',
                action: 'manager_added',
                metadata: { manager_user_id: 'manager-1' },
                created_at: '2024-01-01T00:00:00Z',
              },
              error: null,
            },
            onInsert: (payload) => insertedPayloads.push(payload),
          },
        ],
      });

      const service = new AuditService(supabase.client);

      await service.log('jam-1', 'user-1', 'manager_added', {
        manager_user_id: 'manager-1',
      });

      expect(insertedPayloads).toHaveLength(1);
      expect(insertedPayloads[0]).toMatchObject({
        jam_id: 'jam-1',
        actor_user_id: 'user-1',
        action: 'manager_added',
        metadata: { manager_user_id: 'manager-1' },
      });
    });

    it('handles insert errors gracefully without throwing', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const supabase = createSupabaseMock({
        audit_log: [
          {
            response: Promise.reject(new Error('Database error')),
          },
        ],
      });

      const service = new AuditService(supabase.client);

      // Should not throw
      await expect(
        service.log('jam-1', 'user-1', 'joined'),
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create audit log:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('logs all audit action types', async () => {
      const insertedPayloads: unknown[] = [];
      const supabase = createSupabaseMock({
        audit_log: [
          { response: { data: { id: '1' }, error: null } },
          { response: { data: { id: '2' }, error: null } },
          { response: { data: { id: '3' }, error: null } },
          { response: { data: { id: '4' }, error: null } },
          { response: { data: { id: '5' }, error: null } },
          { response: { data: { id: '6' }, error: null } },
          { response: { data: { id: '7' }, error: null } },
          { response: { data: { id: '8' }, error: null } },
          { response: { data: { id: '9' }, error: null } },
          { response: { data: { id: '10' }, error: null } },
          { response: { data: { id: '11' }, error: null } },
          { response: { data: { id: '12' }, error: null } },
          { response: { data: { id: '13' }, error: null } },
          { response: { data: { id: '14' }, error: null } },
          { response: { data: { id: '15' }, error: null } },
          { response: { data: { id: '16' }, error: null } },
        ],
      });

      const service = new AuditService(supabase.client);

      const actions = [
        'created',
        'updated',
        'published',
        'unpublished',
        'deleted',
        'joined',
        'cancelled',
        'promoted',
        'removed',
        'manager_added',
        'manager_removed',
        'cloned',
        'email_sent',
        'email_test_sent',
        'role_updated',
      ] as const;

      for (const action of actions) {
        await service.log('jam-1', 'user-1', action);
      }

      // All actions should be logged without errors
      expect(true).toBe(true);
    });
  });

  describe('getJamAuditLog', () => {
    it('successfully retrieves audit logs for a jam', async () => {
      const supabase = createSupabaseMock({
        audit_log: [
          {
            response: {
              data: [
                {
                  id: 'audit-1',
                  jam_id: 'jam-1',
                  actor_user_id: 'user-1',
                  action: 'created',
                  metadata: null,
                  created_at: '2024-01-02T00:00:00Z',
                },
                {
                  id: 'audit-2',
                  jam_id: 'jam-1',
                  actor_user_id: 'user-2',
                  action: 'joined',
                  metadata: { role: 'base' },
                  created_at: '2024-01-01T00:00:00Z',
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new AuditService(supabase.client);

      const result = await service.getJamAuditLog('jam-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('audit-1');
      expect(result[0].action).toBe('created');
      expect(result[1].id).toBe('audit-2');
      expect(result[1].action).toBe('joined');
    });

    it('returns empty array when jam has no audit logs', async () => {
      const supabase = createSupabaseMock({
        audit_log: [
          {
            response: {
              data: [],
              error: null,
            },
          },
        ],
      });

      const service = new AuditService(supabase.client);

      const result = await service.getJamAuditLog('jam-1');

      expect(result).toEqual([]);
    });

    it('returns logs ordered by created_at descending', async () => {
      const supabase = createSupabaseMock({
        audit_log: [
          {
            response: {
              data: [
                {
                  id: 'audit-3',
                  jam_id: 'jam-1',
                  actor_user_id: 'user-1',
                  action: 'updated',
                  metadata: null,
                  created_at: '2024-01-03T00:00:00Z',
                },
                {
                  id: 'audit-2',
                  jam_id: 'jam-1',
                  actor_user_id: 'user-1',
                  action: 'published',
                  metadata: null,
                  created_at: '2024-01-02T00:00:00Z',
                },
                {
                  id: 'audit-1',
                  jam_id: 'jam-1',
                  actor_user_id: 'user-1',
                  action: 'created',
                  metadata: null,
                  created_at: '2024-01-01T00:00:00Z',
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new AuditService(supabase.client);

      const result = await service.getJamAuditLog('jam-1');

      expect(result).toHaveLength(3);
      expect(result[0].created_at).toBe('2024-01-03T00:00:00Z');
      expect(result[1].created_at).toBe('2024-01-02T00:00:00Z');
      expect(result[2].created_at).toBe('2024-01-01T00:00:00Z');
    });

    it('throws error when database query fails', async () => {
      const supabase = createSupabaseMock({
        audit_log: [
          {
            response: {
              data: null,
              error: { message: 'Database connection error' },
            },
          },
        ],
      });

      const service = new AuditService(supabase.client);

      await expect(service.getJamAuditLog('jam-1')).rejects.toThrow(
        'Failed to fetch audit log: Database connection error',
      );
    });

    it('handles logs with complex metadata', async () => {
      const supabase = createSupabaseMock({
        audit_log: [
          {
            response: {
              data: [
                {
                  id: 'audit-1',
                  jam_id: 'jam-1',
                  actor_user_id: 'user-1',
                  action: 'manager_added',
                  metadata: {
                    manager_user_id: 'manager-1',
                    previous_role: 'base',
                    new_role: 'flyer',
                    target_user_id: 'user-2',
                  },
                  created_at: '2024-01-01T00:00:00Z',
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new AuditService(supabase.client);

      const result = await service.getJamAuditLog('jam-1');

      expect(result).toHaveLength(1);
      expect(result[0].metadata).toMatchObject({
        manager_user_id: 'manager-1',
        previous_role: 'base',
        new_role: 'flyer',
        target_user_id: 'user-2',
      });
    });
  });
});

