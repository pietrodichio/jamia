import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import type { UpdateProfileDto } from './dto/update-profile.dto';

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

    if (error || !data) {
      throw new NotFoundException('Profile not found');
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
}

