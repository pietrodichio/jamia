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
      .eq('id', jamId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Jam not found');
    }

    // Check if user has permission to view this jam
    if (data.status !== 'published' && data.owner_id !== userId) {
      // Check if user is a manager
      if (userId) {
        const isManager = await this.isManagerOrOwner(jamId, userId);
        if (!isManager) {
          throw new ForbiddenException(
            'You do not have permission to view this jam',
          );
        }
      } else {
        throw new ForbiddenException(
          'You do not have permission to view this jam',
        );
      }
    }

    // Calculate participant counts
    const participantCount =
      data.jam_participants?.filter((p: any) => p.state === 'participant')
        .length || 0;
    const waitingCount =
      data.jam_participants?.filter((p: any) => p.state === 'waiting').length ||
      0;

    return {
      ...data,
      participant_count: participantCount,
      waiting_count: waitingCount,
    };
  }

  async getPublicJamParticipants(jamId: string) {
    // First check if jam exists and is published
    const { data: jam, error: jamError } = await this.supabase
      .from('jams')
      .select('id, status, public_participants')
      .eq('id', jamId)
      .single();

    if (jamError || !jam) {
      throw new NotFoundException('Jam not found');
    }

    if (jam.status !== 'published') {
      throw new ForbiddenException('Jam is not published');
    }

    if (jam.public_participants === false) {
      throw new ForbiddenException('Participants are not publicly visible');
    }

    // Get participants with profile information using explicit join
    const { data, error } = await this.supabase
      .from('jam_participants')
      .select(
        `
        id,
        role,
        state,
        joined_at,
        user_id
      `,
      )
      .eq('jam_id', jamId)
      .eq('state', 'participant')
      .order('joined_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch participants: ${error.message}`);
    }

    // Get profile information separately to avoid relationship issues
    const participantIds = (data || []).map((p) => p.user_id);

    if (participantIds.length === 0) {
      return { participants: [] };
    }

    const { data: profiles, error: profilesError } = await this.supabase
      .from('profiles')
      .select('id, first_name, last_name, photo_url')
      .in('id', participantIds);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    // Create a map of profiles by user_id for easy lookup
    const profileMap = new Map();
    (profiles || []).forEach((profile) => {
      profileMap.set(profile.id, profile);
    });

    // Return participants with privacy-protected information
    const participants = (data || []).map((participant: any) => {
      const profile = profileMap.get(participant.user_id);
      return {
        id: participant.id,
        role: participant.role,
        state: participant.state,
        joined_at: participant.joined_at,
        profiles: profile
          ? {
              first_name: profile.first_name,
              last_name: profile.last_name
                ? profile.last_name.charAt(0) + '.'
                : '',
              photo_url: profile.photo_url,
              // No phone number for public access
            }
          : null,
      };
    });

    return { participants };
  }

  async createJam(userId: string, createJamDto: CreateJamDto) {
    // Validate dates
    const start = new Date(createJamDto.starts_at);
    const end = new Date(createJamDto.ends_at);

    if (end <= start) {
      throw new BadRequestException('End date must be after start date');
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
    // Check ownership or management
    const jam = await this.getJamById(jamId);

    const isOwnerOrManager = await this.isManagerOrOwner(jamId, userId);
    if (!isOwnerOrManager) {
      throw new ForbiddenException(
        'You can only update jams you own or manage',
      );
    }

    // Validate dates if provided
    if (updateJamDto.starts_at || updateJamDto.ends_at) {
      const start = new Date(updateJamDto.starts_at || jam.starts_at);
      const end = new Date(updateJamDto.ends_at || jam.ends_at);

      if (end <= start) {
        throw new BadRequestException('End date must be after start date');
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
    await this.auditService.log(
      jamId,
      userId,
      'updated',
      updateJamDto as Record<string, unknown>,
    );

    return data;
  }

  async publishJam(jamId: string, userId: string) {
    const jam = await this.getJamById(jamId, userId);
    console.log('jam:', jam);
    console.log('userId:', userId);

    const isOwnerOrManager = await this.isManagerOrOwner(jamId, userId);
    if (!isOwnerOrManager) {
      throw new ForbiddenException(
        'You can only publish jams you own or manage',
      );
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
    const jam = await this.getJamById(jamId, userId);

    if (!jam) {
      throw new NotFoundException('Jam not found');
    }

    const isOwnerOrManager = await this.isManagerOrOwner(jamId, userId);
    if (!isOwnerOrManager) {
      throw new ForbiddenException(
        'You can only delete jams you own or manage',
      );
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
      .in('status', ['draft', 'published'])
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

  async cloneJam(jamId: string, userId: string) {
    // Get the original jam
    const originalJam = await this.getJamById(jamId, userId);

    // Check if user has permission to clone this jam
    const isOwnerOrManager = await this.isManagerOrOwner(jamId, userId);
    if (!isOwnerOrManager) {
      throw new ForbiddenException('You can only clone jams you own or manage');
    }

    // Create new jam with basic details (no dates, no participants)
    const { data, error } = await this.supabase
      .from('jams')
      .insert({
        owner_id: userId,
        name: `${originalJam.name} (Copia)`,
        location_text: originalJam.location_text,
        gmaps_link: originalJam.gmaps_link,
        description: originalJam.description,
        capacity: originalJam.capacity,
        desired_bases_min: originalJam.desired_bases_min,
        desired_bases_max: originalJam.desired_bases_max,
        desired_flyers_min: originalJam.desired_flyers_min,
        desired_flyers_max: originalJam.desired_flyers_max,
        auto_promote: originalJam.auto_promote,
        status: 'draft',
        // Note: starts_at and ends_at are required but will be set by user when editing
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now as placeholder
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to clone jam: ${error.message}`);
    }

    // Add owner as participant
    await this.ensureOwnerParticipation(data.id, userId);

    // Log the clone action
    await this.auditService.log(data.id, userId, 'cloned', {
      original_jam_id: jamId,
      original_jam_name: originalJam.name,
    });

    return data;
  }

  async isManagerOrOwner(jamId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('is_owner_or_manager', {
      jam_id: jamId,
      user_id: userId,
    });

    if (error) {
      console.error('Error checking owner/manager status:', error);
      return false;
    }

    return data || false;
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
