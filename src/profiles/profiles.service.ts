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
    console.log('Fetching profile for ID:', profileId);

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

    console.log('Updating profile for ID:', profileId);
    console.log('Update data:', updateProfileDto);

    console.log('type of updateProfileDto:', typeof updateProfileDto);

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

  async searchUsers(query: string, limit: number = 10) {
    if (query.length < 2) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, name, email')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      console.error('Search users error:', error);
      // If name column doesn't exist, try with first_name and last_name
      const { data: fallbackData, error: fallbackError } = await this.supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`,
        )
        .limit(limit);

      if (fallbackError) {
        throw new Error(`Failed to search users: ${fallbackError.message}`);
      }

      // Transform the data to match expected format
      return (fallbackData || []).map((user) => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name || ''}`.trim(),
        email: user.email,
      }));
    }

    return data || [];
  }
}
