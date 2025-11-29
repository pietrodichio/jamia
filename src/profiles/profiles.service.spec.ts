import { ProfilesService } from './profiles.service';
import { createSupabaseMock } from '../test-utils/supabase-mock';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ProfilesService', () => {
  describe('searchUsers', () => {
    it('returns empty array when query is less than 2 characters and no jamId', async () => {
      const supabase = createSupabaseMock({});

      const service = new ProfilesService(supabase.client);

      const result = await service.searchUsers('a', 10);

      expect(result).toEqual([]);
    });

    it('returns empty array when query is empty and no jamId', async () => {
      const supabase = createSupabaseMock({});

      const service = new ProfilesService(supabase.client);

      const result = await service.searchUsers('', 10);

      expect(result).toEqual([]);
    });

    it('returns all participants when query is less than 2 characters and jamId is provided', async () => {
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
              data: [{ user_id: 'manager-1' }],
              error: null,
            },
          },
        ],
        jam_participants: [
          {
            response: {
              data: [
                { user_id: 'participant-1' },
                { user_id: 'participant-2' },
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
                  id: 'participant-1',
                  first_name: 'Alice',
                  last_name: 'Smith',
                  email: 'alice@example.com',
                },
                {
                  id: 'participant-2',
                  first_name: 'Bob',
                  last_name: 'Jones',
                  email: 'bob@example.com',
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      const result = await service.searchUsers('a', 10, 'jam-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alice Smith');
      expect(result[0].email).toBe('alice@example.com');
      expect(result[1].name).toBe('Bob Jones');
      expect(result[1].email).toBe('bob@example.com');
    });

    it('excludes jam owner and managers from results', async () => {
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
              data: [{ user_id: 'manager-1' }],
              error: null,
            },
          },
        ],
        jam_participants: [
          {
            response: {
              data: [
                { user_id: 'owner-1' },
                { user_id: 'manager-1' },
                { user_id: 'participant-1' },
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
                  id: 'participant-1',
                  first_name: 'Alice',
                  last_name: 'Smith',
                  email: 'alice@example.com',
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      const result = await service.searchUsers('a', 10, 'jam-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('participant-1');
      expect(result[0].name).toBe('Alice Smith');
    });

    it('searches participants by first name when jamId is provided', async () => {
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
              data: [],
              error: null,
            },
          },
        ],
        jam_participants: [
          {
            response: {
              data: [
                { user_id: 'participant-1' },
                { user_id: 'participant-2' },
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
                  id: 'participant-1',
                  first_name: 'Alice',
                  last_name: 'Smith',
                  email: 'alice@example.com',
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      const result = await service.searchUsers('Alice', 10, 'jam-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('participant-1');
      expect(result[0].name).toBe('Alice Smith');
    });

    it('searches participants by last name when jamId is provided', async () => {
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
              data: [],
              error: null,
            },
          },
        ],
        jam_participants: [
          {
            response: {
              data: [
                { user_id: 'participant-1' },
                { user_id: 'participant-2' },
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
                  id: 'participant-2',
                  first_name: 'Bob',
                  last_name: 'Jones',
                  email: 'bob@example.com',
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      const result = await service.searchUsers('Jones', 10, 'jam-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('participant-2');
      expect(result[0].name).toBe('Bob Jones');
    });

    it('searches participants by email when jamId is provided', async () => {
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
              data: [],
              error: null,
            },
          },
        ],
        jam_participants: [
          {
            response: {
              data: [
                { user_id: 'participant-1' },
                { user_id: 'participant-2' },
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
                  id: 'participant-1',
                  first_name: 'Alice',
                  last_name: 'Smith',
                  email: 'alice@example.com',
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      const result = await service.searchUsers('alice@example.com', 10, 'jam-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('participant-1');
      expect(result[0].email).toBe('alice@example.com');
    });

    it('returns empty array when no participants match the search query', async () => {
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
              data: [],
              error: null,
            },
          },
        ],
        jam_participants: [
          {
            response: {
              data: [{ user_id: 'participant-1' }],
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: [],
              error: null,
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      const result = await service.searchUsers('NonExistent', 10, 'jam-1');

      expect(result).toEqual([]);
    });

    it('returns empty array when jam has no participants', async () => {
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
              data: [],
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

      const service = new ProfilesService(supabase.client);

      const result = await service.searchUsers('test', 10, 'jam-1');

      expect(result).toEqual([]);
    });

    it('respects the limit parameter', async () => {
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
              data: [],
              error: null,
            },
          },
        ],
        jam_participants: [
          {
            response: {
              data: [
                { user_id: 'participant-1' },
                { user_id: 'participant-2' },
                { user_id: 'participant-3' },
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
                  id: 'participant-1',
                  first_name: 'Alice',
                  last_name: 'Smith',
                  email: 'alice@example.com',
                },
                {
                  id: 'participant-2',
                  first_name: 'Bob',
                  last_name: 'Jones',
                  email: 'bob@example.com',
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      const result = await service.searchUsers('a', 2, 'jam-1');

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('handles participants with missing last name', async () => {
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
              data: [],
              error: null,
            },
          },
        ],
        jam_participants: [
          {
            response: {
              data: [{ user_id: 'participant-1' }],
              error: null,
            },
          },
        ],
        profiles: [
          {
            response: {
              data: [
                {
                  id: 'participant-1',
                  first_name: 'Alice',
                  last_name: null,
                  email: 'alice@example.com',
                },
              ],
              error: null,
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      const result = await service.searchUsers('a', 10, 'jam-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice');
    });
  });

  describe('getProfile', () => {
    it('successfully retrieves a profile', async () => {
      const supabase = createSupabaseMock({
        profiles: [
          {
            response: {
              data: {
                id: 'user-1',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com',
                main_role: 'base',
                phone: '+1234567890',
                photo_url: 'https://example.com/photo.jpg',
              },
              error: null,
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      const result = await service.getProfile('user-1');

      expect(result.id).toBe('user-1');
      expect(result.first_name).toBe('John');
      expect(result.last_name).toBe('Doe');
      expect(result.email).toBe('john@example.com');
    });

    it('throws NotFoundException when profile does not exist', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const supabase = createSupabaseMock({
        profiles: [
          {
            response: {
              data: null,
              error: { message: 'Not found' },
            },
          },
          {
            response: {
              data: null,
              error: { message: 'Not found' },
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      await expect(service.getProfile('non-existent')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.getProfile('non-existent')).rejects.toThrow(
        'Profile not found: Not found',
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Supabase error:',
        expect.any(Object),
      );

      consoleSpy.mockRestore();
    });

    it('throws NotFoundException when data is null', async () => {
      const supabase = createSupabaseMock({
        profiles: [
          {
            response: {
              data: null,
              error: null,
            },
          },
          {
            response: {
              data: null,
              error: null,
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      await expect(service.getProfile('user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.getProfile('user-1')).rejects.toThrow(
        'Profile not found: No data returned',
      );
    });

    it('returns profile with all fields', async () => {
      const supabase = createSupabaseMock({
        profiles: [
          {
            response: {
              data: {
                id: 'user-1',
                first_name: 'Jane',
                last_name: 'Smith',
                email: 'jane@example.com',
                main_role: 'flyer',
                phone: '+9876543210',
                photo_url: 'https://example.com/jane.jpg',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
              },
              error: null,
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      const result = await service.getProfile('user-1');

      expect(result).toMatchObject({
        id: 'user-1',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        main_role: 'flyer',
        phone: '+9876543210',
        photo_url: 'https://example.com/jane.jpg',
      });
    });
  });

  describe('updateProfile', () => {
    it('successfully updates own profile', async () => {
      const updatedPayloads: unknown[] = [];
      const supabase = createSupabaseMock({
        profiles: [
          {
            response: {
              data: {
                id: 'user-1',
                first_name: 'John',
                last_name: 'Doe Updated',
                email: 'john@example.com',
                main_role: 'base',
              },
              error: null,
            },
            updateResponse: {
              data: {
                id: 'user-1',
                first_name: 'John',
                last_name: 'Doe Updated',
                email: 'john@example.com',
                main_role: 'base',
              },
              error: null,
            },
            onUpdate: (payload) => updatedPayloads.push(payload),
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      const result = await service.updateProfile('user-1', 'user-1', {
        last_name: 'Doe Updated',
      });

      expect(result.last_name).toBe('Doe Updated');
      expect(updatedPayloads).toHaveLength(1);
      expect(updatedPayloads[0]).toMatchObject({
        last_name: 'Doe Updated',
      });
    });

    it('throws ForbiddenException when trying to update another user profile', async () => {
      const supabase = createSupabaseMock({});

      const service = new ProfilesService(supabase.client);

      await expect(
        service.updateProfile('other-user', 'user-1', {
          first_name: 'Hacked',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.updateProfile('other-user', 'user-1', {
          first_name: 'Hacked',
        }),
      ).rejects.toThrow('You can only update your own profile');
    });

    it('successfully updates multiple fields', async () => {
      const supabase = createSupabaseMock({
        profiles: [
          {
            response: {
              data: {
                id: 'user-1',
                first_name: 'John Updated',
                last_name: 'Doe Updated',
                email: 'john.updated@example.com',
                main_role: 'flyer',
                phone: '+1111111111',
              },
              error: null,
            },
            updateResponse: {
              data: {
                id: 'user-1',
                first_name: 'John Updated',
                last_name: 'Doe Updated',
                email: 'john.updated@example.com',
                main_role: 'flyer',
                phone: '+1111111111',
              },
              error: null,
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      const result = await service.updateProfile('user-1', 'user-1', {
        first_name: 'John Updated',
        last_name: 'Doe Updated',
        email: 'john.updated@example.com',
        main_role: 'flyer',
        phone: '+1111111111',
      });

      expect(result.first_name).toBe('John Updated');
      expect(result.last_name).toBe('Doe Updated');
      expect(result.email).toBe('john.updated@example.com');
      expect(result.main_role).toBe('flyer');
      expect(result.phone).toBe('+1111111111');
    });

    it('throws error when database update fails', async () => {
      const supabase = createSupabaseMock({
        profiles: [
          {
            response: {
              data: null,
              error: { message: 'Update failed' },
            },
            updateResponse: {
              data: null,
              error: { message: 'Update failed' },
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      await expect(
        service.updateProfile('user-1', 'user-1', {
          first_name: 'Updated',
        }),
      ).rejects.toThrow('Failed to update profile: Update failed');
    });

    it('allows updating profile with same userId', async () => {
      const userId = 'user-1';
      const supabase = createSupabaseMock({
        profiles: [
          {
            response: {
              data: {
                id: userId,
                first_name: 'Updated Name',
              },
              error: null,
            },
            updateResponse: {
              data: {
                id: userId,
                first_name: 'Updated Name',
              },
              error: null,
            },
          },
        ],
      });

      const service = new ProfilesService(supabase.client);

      const result = await service.updateProfile(userId, userId, {
        first_name: 'Updated Name',
      });

      expect(result.id).toBe(userId);
      expect(result.first_name).toBe('Updated Name');
    });
  });
});

