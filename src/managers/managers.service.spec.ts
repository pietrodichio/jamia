import { ManagersService } from './managers.service';
import { createSupabaseMock } from '../test-utils/supabase-mock';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('ManagersService', () => {
  const auditService = { log: jest.fn() };

  beforeEach(() => {
    auditService.log = jest.fn().mockResolvedValue(undefined);
  });

  describe('getJamManagersBatch', () => {
    it('returns empty object when jamIds array is empty', async () => {
      const supabase = createSupabaseMock({});

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.getJamManagersBatch([], 'user-1');

      expect(result).toEqual({});
    });

    it('returns empty arrays for all jams when user has no access', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: [
                { id: 'jam-1', owner_id: 'other-owner' },
                { id: 'jam-2', owner_id: 'other-owner-2' },
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

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.getJamManagersBatch(
        ['jam-1', 'jam-2'],
        'user-1',
      );

      expect(result).toEqual({
        'jam-1': [],
        'jam-2': [],
      });
    });

    it('returns managers for jams owned by the user', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: [
                { id: 'jam-1', owner_id: 'user-1' },
                { id: 'jam-2', owner_id: 'other-owner' },
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
          {
            response: {
              data: [
                {
                  id: 'manager-1',
                  jam_id: 'jam-1',
                  user_id: 'manager-user-1',
                  added_by: 'user-1',
                  created_at: '2024-01-01T00:00:00Z',
                  profiles: {
                    id: 'manager-user-1',
                    first_name: 'Manager',
                    last_name: 'One',
                    email: 'manager1@example.com',
                  },
                },
                {
                  id: 'manager-2',
                  jam_id: 'jam-1',
                  user_id: 'manager-user-2',
                  added_by: 'user-1',
                  created_at: '2024-01-02T00:00:00Z',
                  profiles: {
                    id: 'manager-user-2',
                    first_name: 'Manager',
                    last_name: 'Two',
                    email: 'manager2@example.com',
                  },
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.getJamManagersBatch(
        ['jam-1', 'jam-2'],
        'user-1',
      );

      expect(result['jam-1']).toHaveLength(2);
      expect(result['jam-1'][0].user_id).toBe('manager-user-1');
      expect(result['jam-1'][1].user_id).toBe('manager-user-2');
      expect(result['jam-2']).toEqual([]);
    });

    it('returns managers for jams where user is a manager', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: [
                { id: 'jam-1', owner_id: 'owner-1' },
                { id: 'jam-2', owner_id: 'owner-2' },
              ],
              error: null,
            },
          },
        ],
        jam_managers: [
          {
            response: {
              data: [{ jam_id: 'jam-1' }],
              error: null,
            },
          },
          {
            response: {
              data: [
                {
                  id: 'manager-2',
                  jam_id: 'jam-1',
                  user_id: 'other-manager',
                  added_by: 'owner-1',
                  created_at: '2024-01-02T00:00:00Z',
                  profiles: {
                    id: 'other-manager',
                    first_name: 'Other',
                    last_name: 'Manager',
                    email: 'other@example.com',
                  },
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.getJamManagersBatch(
        ['jam-1', 'jam-2'],
        'user-1',
      );

      expect(result['jam-1']).toHaveLength(1);
      expect(result['jam-1'][0].user_id).toBe('other-manager');
      expect(result['jam-2']).toEqual([]);
    });

    it('returns managers for both owned and managed jams', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: [
                { id: 'jam-1', owner_id: 'user-1' },
                { id: 'jam-2', owner_id: 'owner-2' },
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
          {
            response: {
              data: [
                {
                  id: 'manager-1',
                  jam_id: 'jam-1',
                  user_id: 'manager-1',
                  added_by: 'user-1',
                  created_at: '2024-01-01T00:00:00Z',
                  profiles: {
                    id: 'manager-1',
                    first_name: 'Manager',
                    last_name: 'One',
                    email: 'manager1@example.com',
                  },
                },
                {
                  id: 'manager-2',
                  jam_id: 'jam-2',
                  user_id: 'manager-2',
                  added_by: 'owner-2',
                  created_at: '2024-01-01T00:00:00Z',
                  profiles: {
                    id: 'manager-2',
                    first_name: 'Manager',
                    last_name: 'Two',
                    email: 'manager2@example.com',
                  },
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.getJamManagersBatch(
        ['jam-1', 'jam-2'],
        'user-1',
      );

      expect(result['jam-1']).toHaveLength(1);
      expect(result['jam-1'][0].user_id).toBe('manager-1');
      expect(result['jam-2']).toHaveLength(1);
      expect(result['jam-2'][0].user_id).toBe('manager-2');
    });

    it('returns all managers for all jams when user is super admin', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: [
                { id: 'jam-1', owner_id: 'owner-1' },
                { id: 'jam-2', owner_id: 'owner-2' },
              ],
              error: null,
            },
          },
        ],
        jam_managers: [
          {
            response: {
              data: [
                {
                  id: 'manager-1',
                  jam_id: 'jam-1',
                  user_id: 'manager-1',
                  added_by: 'owner-1',
                  created_at: '2024-01-01T00:00:00Z',
                  profiles: {
                    id: 'manager-1',
                    first_name: 'Manager',
                    last_name: 'One',
                    email: 'manager1@example.com',
                  },
                },
                {
                  id: 'manager-2',
                  jam_id: 'jam-2',
                  user_id: 'manager-2',
                  added_by: 'owner-2',
                  created_at: '2024-01-01T00:00:00Z',
                  profiles: {
                    id: 'manager-2',
                    first_name: 'Manager',
                    last_name: 'Two',
                    email: 'manager2@example.com',
                  },
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.getJamManagersBatch(
        ['jam-1', 'jam-2'],
        'admin-user',
        true,
      );

      expect(result['jam-1']).toHaveLength(1);
      expect(result['jam-1'][0].user_id).toBe('manager-1');
      expect(result['jam-2']).toHaveLength(1);
      expect(result['jam-2'][0].user_id).toBe('manager-2');
    });

    it('handles jams not found gracefully', async () => {
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

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.getJamManagersBatch(
        ['jam-1', 'jam-2'],
        'user-1',
      );

      expect(result).toEqual({});
    });
  });

  describe('getJamManagers', () => {
    it('returns managers when user is the jam owner', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
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
          {
            response: {
              data: [
                {
                  id: 'manager-1',
                  jam_id: 'jam-1',
                  user_id: 'manager-1',
                  added_by: 'owner-1',
                  created_at: '2024-01-01T00:00:00Z',
                  profiles: {
                    id: 'manager-1',
                    first_name: 'Manager',
                    last_name: 'One',
                    email: 'manager1@example.com',
                  },
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.getJamManagers('jam-1', 'owner-1');

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe('manager-1');
    });

    it('returns managers when user is a manager', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
              error: null,
            },
          },
        ],
        jam_managers: [
          {
            response: {
              data: { user_id: 'manager-1' },
              error: null,
            },
          },
          {
            response: {
              data: [
                {
                  id: 'manager-1',
                  jam_id: 'jam-1',
                  user_id: 'manager-1',
                  added_by: 'owner-1',
                  created_at: '2024-01-01T00:00:00Z',
                  profiles: {
                    id: 'manager-1',
                    first_name: 'Manager',
                    last_name: 'One',
                    email: 'manager1@example.com',
                  },
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.getJamManagers('jam-1', 'manager-1');

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe('manager-1');
    });

    it('allows super admin to view managers', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
              error: null,
            },
          },
        ],
        jam_managers: [
          {
            response: {
              data: [
                {
                  id: 'manager-1',
                  jam_id: 'jam-1',
                  user_id: 'manager-1',
                  added_by: 'owner-1',
                  created_at: '2024-01-01T00:00:00Z',
                  profiles: {
                    id: 'manager-1',
                    first_name: 'Manager',
                    last_name: 'One',
                    email: 'manager1@example.com',
                  },
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.getJamManagers('jam-1', 'admin', true);

      expect(result).toHaveLength(1);
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

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.getJamManagers('non-existent', 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when user is not owner or manager', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
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

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.getJamManagers('jam-1', 'unauthorized-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws error when fetching managers fails', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
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
          {
            response: {
              data: null,
              error: { message: 'Database error' },
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.getJamManagers('jam-1', 'owner-1'),
      ).rejects.toThrow('Failed to fetch jam managers');
    });

    it('returns empty array when jam has no managers', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
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
          {
            response: {
              data: [],
              error: null,
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.getJamManagers('jam-1', 'owner-1');

      expect(result).toEqual([]);
    });
  });

  describe('addJamManager', () => {
    it('successfully adds a manager', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: { id: 'manager-1' },
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
          {
            response: {
              data: {
                id: 'manager-record-1',
                jam_id: 'jam-1',
                user_id: 'manager-1',
                added_by: 'owner-1',
                created_at: '2024-01-01T00:00:00Z',
              },
              error: null,
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.addJamManager(
        'jam-1',
        'owner-1',
        'manager-1',
      );

      expect(result.user_id).toBe('manager-1');
      expect(result.jam_id).toBe('jam-1');
      expect(auditService.log).toHaveBeenCalledWith(
        'jam-1',
        'owner-1',
        'manager_added',
        { manager_user_id: 'manager-1' },
      );
    });

    it('allows super admin to add managers', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: { id: 'manager-1' },
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
          {
            response: {
              data: {
                id: 'manager-record-1',
                jam_id: 'jam-1',
                user_id: 'manager-1',
                added_by: 'admin',
                created_at: '2024-01-01T00:00:00Z',
              },
              error: null,
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.addJamManager(
        'jam-1',
        'admin',
        'manager-1',
        true,
      );

      expect(result.user_id).toBe('manager-1');
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

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.addJamManager('non-existent', 'owner-1', 'manager-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when user is not the owner', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
              error: null,
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.addJamManager('jam-1', 'unauthorized-user', 'manager-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws BadRequestException when trying to add owner as manager', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
              error: null,
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.addJamManager('jam-1', 'owner-1', 'owner-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when manager user does not exist', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: null,
              error: { message: 'Not found' },
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.addJamManager('jam-1', 'owner-1', 'non-existent'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when user is already a manager', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: { id: 'manager-1' },
              error: null,
            },
          },
        ],
        jam_managers: [
          {
            response: {
              data: { user_id: 'manager-1' },
              error: null,
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.addJamManager('jam-1', 'owner-1', 'manager-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws error when insert fails', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: { id: 'manager-1' },
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
          {
            response: {
              data: null,
              error: { message: 'Insert failed' },
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.addJamManager('jam-1', 'owner-1', 'manager-1'),
      ).rejects.toThrow('Failed to add manager');
    });
  });

  describe('removeJamManager', () => {
    it('successfully removes a manager', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
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

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.removeJamManager(
        'jam-1',
        'owner-1',
        'manager-1',
      );

      expect(result.message).toBe('Jam manager removed successfully');
      expect(auditService.log).toHaveBeenCalledWith(
        'jam-1',
        'owner-1',
        'manager_removed',
        { manager_user_id: 'manager-1' },
      );
    });

    it('allows super admin to remove managers', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
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

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.removeJamManager(
        'jam-1',
        'admin',
        'manager-1',
        true,
      );

      expect(result.message).toBe('Jam manager removed successfully');
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

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.removeJamManager('non-existent', 'owner-1', 'manager-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when user is not the owner', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
              error: null,
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.removeJamManager('jam-1', 'unauthorized-user', 'manager-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws error when delete fails', async () => {
      const supabase = createSupabaseMock({
        jams: [
          {
            response: {
              data: { id: 'jam-1', owner_id: 'owner-1' },
              error: null,
            },
          },
        ],
        jam_managers: [
          {
            response: {
              data: null,
              error: { message: 'Delete failed' },
            },
          },
        ],
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      await expect(
        service.removeJamManager('jam-1', 'owner-1', 'manager-1'),
      ).rejects.toThrow('Failed to remove jam manager');
    });
  });

  describe('isOwnerOrManager', () => {
    it('returns true when user is owner or manager', async () => {
      const supabase = createSupabaseMock({});
      (supabase.client as any).rpc = jest.fn().mockResolvedValue({
        data: true,
        error: null,
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.isOwnerOrManager('jam-1', 'user-1');

      expect(result).toBe(true);
      expect((supabase.client as any).rpc).toHaveBeenCalledWith(
        'is_owner_or_manager',
        { jam_id: 'jam-1', user_id: 'user-1' },
      );
    });

    it('returns false when user is not owner or manager', async () => {
      const supabase = createSupabaseMock({});
      (supabase.client as any).rpc = jest.fn().mockResolvedValue({
        data: false,
        error: null,
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.isOwnerOrManager('jam-1', 'user-1');

      expect(result).toBe(false);
    });

    it('returns false when RPC call fails', async () => {
      const supabase = createSupabaseMock({});
      (supabase.client as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.isOwnerOrManager('jam-1', 'user-1');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error checking owner/manager status:',
        expect.any(Object),
      );

      consoleSpy.mockRestore();
    });

    it('returns false when RPC returns null data', async () => {
      const supabase = createSupabaseMock({});
      (supabase.client as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const service = new ManagersService(
        supabase.client,
        auditService as any,
      );

      const result = await service.isOwnerOrManager('jam-1', 'user-1');

      expect(result).toBe(false);
    });
  });
});

