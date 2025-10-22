import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { CreateJamDto } from './dto/create-jam.dto';
import { UpdateJamDto } from './dto/update-jam.dto';
import { AuditService } from '../audit/audit.service';

type ParticipantRole = 'base' | 'flyer' | 'both';

@Injectable()
export class JamsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly auditService: AuditService,
  ) {}

  async getPublishedJams() {
    const { data, error } = await this.supabase
      .from('jams')
      .select(
        `
        *,
        jam_participants (
          id,
          state
        )
      `,
      )
      .eq('status', 'published')
      .order('starts_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch jams: ${error.message}`);
    }

    // Calculate participant counts
    return (data || []).map((jam) => ({
      ...jam,
      participant_count:
        jam.jam_participants?.filter((p: any) => p.state === 'participant')
          .length || 0,
      waiting_count:
        jam.jam_participants?.filter((p: any) => p.state === 'waiting')
          .length || 0,
    }));
  }

  async getMyJams(userId: string) {
    const { data, error } = await this.supabase
      .from('jams')
      .select(
        `
        *,
        jam_participants (
          id,
          state
        )
      `,
      )
      .eq('owner_id', userId)
      .order('starts_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch user jams: ${error.message}`);
    }

    // Calculate participant counts
    return (data || []).map((jam) => ({
      ...jam,
      participant_count:
        jam.jam_participants?.filter((p: any) => p.state === 'participant')
          .length || 0,
      waiting_count:
        jam.jam_participants?.filter((p: any) => p.state === 'waiting')
          .length || 0,
    }));
  }

  async getJamById(jamId: string, userId?: string) {
    console.log('jamId:', jamId);
    console.log('userId:', userId);
    const { data, error } = await this.supabase
      .from('jams')
      .select('*')
      .eq('id', jamId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Jam not found');
    }

    // Check if user has permission to view this jam
    if (data.status !== 'published' && data.owner_id !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this jam',
      );
    }

    return data;
  }

  async createJam(userId: string, createJamDto: CreateJamDto) {
    // Validate dates
    const start = new Date(createJamDto.starts_at);
    const end = new Date(createJamDto.ends_at);

    if (end <= start) {
      throw new BadRequestException(
        'End date must be after start date',
      );
    }

    const { data, error } = await this.supabase
      .from('jams')
      .insert({
        owner_id: userId,
        ...createJamDto,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create jam: ${error.message}`);
    }

    await this.ensureOwnerParticipation(data.id, userId);

    // Log creation
    await this.auditService.log(data.id, userId, 'created', {
      jam_name: createJamDto.name,
    });

    return data;
  }

  async updateJam(jamId: string, userId: string, updateJamDto: UpdateJamDto) {
    // Check ownership
    const jam = await this.getJamById(jamId);

    if (jam.owner_id !== userId) {
      throw new ForbiddenException('You can only update your own jams');
    }

    // Validate dates if provided
    if (updateJamDto.starts_at || updateJamDto.ends_at) {
      const start = new Date(updateJamDto.starts_at || jam.starts_at);
      const end = new Date(updateJamDto.ends_at || jam.ends_at);

      if (end <= start) {
        throw new BadRequestException(
          'End date must be after start date',
        );
      }
    }

    const { data, error } = await this.supabase
      .from('jams')
      .update(updateJamDto)
      .eq('id', jamId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update jam: ${error.message}`);
    }

    // Log update
    await this.auditService.log(jamId, userId, 'updated', updateJamDto as Record<string, unknown>);

    return data;
  }

  async publishJam(jamId: string, userId: string) {
    const jam = await this.getJamById(jamId, userId);
    console.log('jam:', jam);
    console.log('userId:', userId);
    if (jam.owner_id !== userId) {
      throw new ForbiddenException('You can only publish your own jams');
    }

    await this.ensureOwnerParticipation(jamId, userId);

    const { data, error } = await this.supabase
      .from('jams')
      .update({ status: 'published' })
      .eq('id', jamId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to publish jam: ${error.message}`);
    }

    // Log publication
    await this.auditService.log(jamId, userId, 'published');

    return data;
  }

  async deleteJam(jamId: string, userId: string) {
    const jam = await this.getJamById(jamId);

    if (jam.owner_id !== userId) {
      throw new ForbiddenException('You can only delete your own jams');
    }

    const { error } = await this.supabase.from('jams').delete().eq('id', jamId);

    if (error) {
      throw new Error(`Failed to delete jam: ${error.message}`);
    }

    return { message: 'Jam deleted successfully' };
  }

  async getJamsUserParticipatesIn(userId: string) {
    // First get user participations
    const { data: participations, error: participationsError } =
      await this.supabase
        .from('jam_participants')
        .select('jam_id')
        .eq('user_id', userId)
        .in('state', ['participant', 'waiting']);

    if (participationsError) {
      throw new Error(
        `Failed to fetch participations: ${participationsError.message}`,
      );
    }

    if (!participations || participations.length === 0) {
      return [];
    }

    const jamIds = participations.map((p) => p.jam_id);

    // Get jam details
    const { data, error } = await this.supabase
      .from('jams')
      .select(
        `
        *,
        jam_participants (
          id,
          state
        )
      `,
      )
      .in('id', jamIds)
      .eq('status', 'published')
      .order('starts_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch jams: ${error.message}`);
    }

    return (data || []).map((jam) => ({
      ...jam,
      participant_count:
        jam.jam_participants?.filter((p: any) => p.state === 'participant')
          .length || 0,
      waiting_count:
        jam.jam_participants?.filter((p: any) => p.state === 'waiting')
          .length || 0,
    }));
  }

  private async ensureOwnerParticipation(
    jamId: string,
    ownerId: string,
  ): Promise<void> {
    const { data: existingParticipation } = await this.supabase
      .from('jam_participants')
      .select('id')
      .eq('jam_id', jamId)
      .eq('user_id', ownerId)
      .neq('state', 'cancelled')
      .maybeSingle();

    if (existingParticipation) {
      return;
    }

    let role: ParticipantRole = 'both';

    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('main_role')
      .eq('id', ownerId)
      .maybeSingle();

    if (!profileError && profile?.main_role) {
      const normalizedRole = profile.main_role as ParticipantRole;
      if (['base', 'flyer', 'both'].includes(normalizedRole)) {
        role = normalizedRole;
      }
    }

    const { error: insertError } = await this.supabase
      .from('jam_participants')
      .insert({
        jam_id: jamId,
        user_id: ownerId,
        role,
        state: 'participant',
        source: 'owner',
      });

    if (insertError) {
      throw new Error(
        `Failed to enrol jam owner as participant: ${insertError.message}`,
      );
    }
  }
}
