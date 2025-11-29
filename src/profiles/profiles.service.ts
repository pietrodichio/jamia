import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getProfile(profileId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new NotFoundException(`Profile not found: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Profile not found: No data returned');
    }

    return data;
  }

  async updateProfile(
    profileId: string,
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ) {
    // Users can only update their own profile
    if (profileId !== userId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .update(updateProfileDto)
      .eq('id', profileId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return data;
  }

  async searchUsers(
    query: string,
    limit: number = 10,
    jamId?: string,
  ) {
    // If jamId is provided, only search among users who are (or have been) participants in that jam
    // This prevents enumeration of all users in the platform
    if (jamId) {
      // Get the jam's owner_id to exclude from results
      const { data: jam, error: jamError } = await this.supabase
        .from('jams')
        .select('owner_id')
        .eq('id', jamId)
        .single();

      if (jamError) {
        throw new Error(`Failed to fetch jam: ${jamError.message}`);
      }

      const ownerId = jam?.owner_id;

      // Get all managers for this jam to exclude from results
      const { data: managers, error: managersError } = await this.supabase
        .from('jam_managers')
        .select('user_id')
        .eq('jam_id', jamId);

      if (managersError) {
        throw new Error(
          `Failed to fetch jam managers: ${managersError.message}`,
        );
      }

      const managerIds = (managers || []).map((m) => m.user_id);
      const excludedIds = ownerId
        ? [...managerIds, ownerId]
        : managerIds;

      // First, get all user_ids who have participated in this jam (any state)
      const { data: participants, error: participantsError } = await this.supabase
        .from('jam_participants')
        .select('user_id')
        .eq('jam_id', jamId);

      if (participantsError) {
        throw new Error(
          `Failed to fetch jam participants: ${participantsError.message}`,
        );
      }

      const participantIds = (participants || [])
        .map((p) => p.user_id)
        .filter((id) => !excludedIds.includes(id));

      if (participantIds.length === 0) {
        return [];
      }

      // If query is empty or too short, return all participants (up to limit)
      // Ordered alphabetically by first_name, then last_name
      if (query.length < 2) {
        const { data, error } = await this.supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', participantIds)
          .order('first_name', { ascending: true })
          .order('last_name', { ascending: true, nullsFirst: false })
          .limit(limit);

        if (error) {
          throw new Error(`Failed to search users: ${error.message}`);
        }

        return (data || []).map((user) => ({
          id: user.id,
          name: `${user.first_name} ${user.last_name || ''}`.trim(),
          email: user.email,
        }));
      }

      // Search only among these participants with the query
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', participantIds)
        .or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`,
        )
        .limit(limit);

      if (error) {
        throw new Error(`Failed to search users: ${error.message}`);
      }

      // Transform the data to match expected format
      return (data || []).map((user) => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name || ''}`.trim(),
        email: user.email,
      }));
    }

    // If no jamId, require at least 2 characters for security
    if (query.length < 2) {
      return [];
    }

    return [];
  }
}
