import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { JoinJamDto } from './dto/join-jam.dto';
import { AuditService } from '../audit/audit.service';

type ParticipantRole = 'base' | 'flyer' | 'both';

type RoleCounts = {
  base: number;
  flyer: number;
  total: number;
};

type JamRoleConfig = {
  desired_bases_max?: number | null;
  desired_flyers_max?: number | null;
  capacity?: number | null;
};

@Injectable()
export class ParticipantsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly auditService: AuditService,
  ) {}

  async getJamParticipants(jamId: string, userId: string) {
    // Check if user has permission (owner or participant)
    const { data: jam } = await this.supabase
      .from('jams')
      .select('owner_id, status')
      .eq('id', jamId)
      .single();

    if (!jam) {
      throw new NotFoundException('Jam not found');
    }

    // Only jam owner can view all participants
    if (jam.owner_id !== userId) {
      throw new ForbiddenException(
        'Only the jam owner can view participants',
      );
    }

    // Get participants
    const { data: participantsData, error: participantsError } =
      await this.supabase
        .from('jam_participants')
        .select('*')
        .eq('jam_id', jamId)
        .eq('state', 'participant')
        .order('joined_at', { ascending: true });

    if (participantsError) {
      throw new Error(
        `Failed to fetch participants: ${participantsError.message}`,
      );
    }

    // Get waiting list
    const { data: waitingData, error: waitingError } = await this.supabase
      .from('jam_participants')
      .select('*')
      .eq('jam_id', jamId)
      .eq('state', 'waiting')
      .order('joined_at', { ascending: true });

    if (waitingError) {
      throw new Error(`Failed to fetch waiting list: ${waitingError.message}`);
    }

    // Get profile data for participants
    const participantIds = participantsData?.map(p => p.user_id) || [];
    const waitingIds = waitingData?.map(w => w.user_id) || [];
    const allUserIds = [...participantIds, ...waitingIds];

    let profilesData: any[] = [];
    if (allUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await this.supabase
        .from('profiles')
        .select('id, name, main_role, phone')
        .in('id', allUserIds);

      if (profilesError) {
        console.warn('Failed to fetch profiles:', profilesError.message);
      } else {
        profilesData = profiles || [];
      }
    }

    // Combine participants with profile data
    const participants = participantsData?.map(participant => ({
      ...participant,
      profiles: profilesData.find(p => p.id === participant.user_id)
    })) || [];

    // Combine waiting list with profile data
    const waitingList = waitingData?.map(waiting => ({
      ...waiting,
      profiles: profilesData.find(p => p.id === waiting.user_id)
    })) || [];

    return {
      participants: participants || [],
      waitingList: waitingList || [],
    };
  }

  async joinJam(jamId: string, userId: string, joinJamDto: JoinJamDto) {
    // Check if jam exists and is published
    const { data: jam, error: jamError } = await this.supabase
      .from('jams')
      .select('*')
      .eq('id', jamId)
      .single();

    if (jamError || !jam) {
      throw new NotFoundException('Jam not found');
    }

    if (jam.status !== 'published') {
      throw new BadRequestException('This jam is not available for booking');
    }

    // Check if user already participating
    const { data: existingParticipation } = await this.supabase
      .from('jam_participants')
      .select('*')
      .eq('jam_id', jamId)
      .eq('user_id', userId)
      .neq('state', 'cancelled')
      .maybeSingle();

    if (existingParticipation) {
      throw new BadRequestException('You are already participating in this jam');
    }

    const activeParticipants = await this.fetchActiveParticipants(jamId);
    const roleCounts = this.calculateRoleCounts(activeParticipants);
    const effectiveRole = this.resolveEffectiveRole(joinJamDto.role);

    const hasReachedRoleLimit = this.isRoleAtMax(effectiveRole, roleCounts, jam);
    const totalCapacityReached =
      jam.capacity !== null &&
      jam.capacity !== undefined &&
      roleCounts.total >= jam.capacity;

    // Determine if user should be participant or on waiting list
    const newState =
      totalCapacityReached || hasReachedRoleLimit ? 'waiting' : 'participant';

    // Add participant
    const { data, error } = await this.supabase
      .from('jam_participants')
      .insert({
        jam_id: jamId,
        user_id: userId,
        role: joinJamDto.role,
        state: newState,
        source: 'direct',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to join jam: ${error.message}`);
    }

    // Log action
    await this.auditService.log(jamId, userId, 'joined', {
      role: joinJamDto.role,
      state: newState,
    });

    return {
      ...data,
      message: newState === 'waiting'
        ? 'Added to waiting list'
        : 'Successfully joined the jam',
    };
  }

  async cancelParticipation(participantId: string, userId: string) {
    // Get participation
    const { data: participation, error: fetchError } = await this.supabase
      .from('jam_participants')
      .select('*')
      .eq('id', participantId)
      .single();

    if (fetchError || !participation) {
      throw new NotFoundException('Participation not found');
    }

    // Users can only cancel their own participation
    if (participation.user_id !== userId) {
      throw new ForbiddenException(
        'You can only cancel your own participation',
      );
    }

    // Update to cancelled
    const { data, error } = await this.supabase
      .from('jam_participants')
      .update({
        state: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', participantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel participation: ${error.message}`);
    }

    // Log cancellation
    await this.auditService.log(participation.jam_id, userId, 'cancelled', {
      previous_state: participation.state,
    });

    // If auto-promote is enabled and user was a participant, promote from waiting list
    if (participation.state === 'participant') {
      await this.promoteFromWaitingList(participation.jam_id);
    }

    return data;
  }

  async removeParticipant(participantId: string, userId: string) {
    // Get participation
    const { data: participation, error: fetchError } = await this.supabase
      .from('jam_participants')
      .select('jam_id')
      .eq('id', participantId)
      .single();

    if (fetchError || !participation) {
      throw new NotFoundException('Participation not found');
    }

    // Check if user is jam owner
    const { data: jam } = await this.supabase
      .from('jams')
      .select('owner_id, auto_promote')
      .eq('id', participation.jam_id)
      .single();

    if (!jam || jam.owner_id !== userId) {
      throw new ForbiddenException('Only the jam owner can remove participants');
    }

    // Delete participation
    const { error } = await this.supabase
      .from('jam_participants')
      .delete()
      .eq('id', participantId);

    if (error) {
      throw new Error(`Failed to remove participant: ${error.message}`);
    }

    // Log removal
    await this.auditService.log(participation.jam_id, userId, 'removed');

    // If auto-promote is enabled, promote from waiting list
    if (jam.auto_promote) {
      await this.promoteFromWaitingList(participation.jam_id);
    }

    return { message: 'Participant removed successfully' };
  }

  private async promoteFromWaitingList(jamId: string): Promise<void> {
    // Get jam details
    const { data: jam } = await this.supabase
      .from('jams')
      .select('capacity, auto_promote, desired_bases_max, desired_flyers_max')
      .eq('id', jamId)
      .single();

    if (!jam || !jam.auto_promote) {
      return;
    }

    const activeParticipants = await this.fetchActiveParticipants(jamId);
    let roleCounts = this.calculateRoleCounts(activeParticipants);

    // Check if there's capacity
    if (
      jam.capacity !== null &&
      jam.capacity !== undefined &&
      roleCounts.total >= jam.capacity
    ) {
      return; // Still at capacity
    }

    // Get first person on waiting list
    const { data: waitingList, error: waitingError } = await this.supabase
      .from('jam_participants')
      .select('id, user_id, role')
      .eq('jam_id', jamId)
      .eq('state', 'waiting')
      .order('joined_at', { ascending: true });

    if (waitingError) {
      throw new Error(
        `Failed to fetch waiting list: ${waitingError.message}`,
      );
    }

    if (!waitingList || waitingList.length === 0) {
      return; // No one waiting
    }

    for (const waitingPerson of waitingList) {
      // Ensure overall capacity still allows promotion
      if (
        jam.capacity !== null &&
        jam.capacity !== undefined &&
        roleCounts.total >= jam.capacity
      ) {
        return;
      }

      const effectiveRole = this.resolveEffectiveRole(
        waitingPerson.role as ParticipantRole,
      );

      if (this.isRoleAtMax(effectiveRole, roleCounts, jam)) {
        continue;
      }

      const { error: updateError } = await this.supabase
        .from('jam_participants')
        .update({
          state: 'participant',
          promoted_at: new Date().toISOString(),
        })
        .eq('id', waitingPerson.id);

      if (updateError) {
        throw new Error(
          `Failed to promote participant: ${updateError.message}`,
        );
      }

      roleCounts = this.incrementRoleCounts(roleCounts, effectiveRole);

      // Log promotion
      await this.auditService.log(jamId, waitingPerson.user_id, 'promoted');
      break;
    }
  }

  async getUserParticipation(jamId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('jam_participants')
      .select('*')
      .eq('jam_id', jamId)
      .eq('user_id', userId)
      .neq('state', 'cancelled')
      .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to fetch user participation: ${error.message}`,
      );
    }

    return data;
  }

  private async fetchActiveParticipants(jamId: string) {
    const { data, error } = await this.supabase
      .from('jam_participants')
      .select('id, role')
      .eq('jam_id', jamId)
      .eq('state', 'participant');

    if (error) {
      throw new Error(
        `Failed to fetch active participants: ${error.message}`,
      );
    }

    return (
      data || []
    ) as Array<{
      id: string;
      role: ParticipantRole;
    }>;
  }

  private resolveEffectiveRole(role: ParticipantRole): 'base' | 'flyer' {
    if (role === 'both') {
      return 'flyer';
    }

    return role;
  }

  private calculateRoleCounts(
    participants: Array<{ role: ParticipantRole }>,
  ): RoleCounts {
    return participants.reduce<RoleCounts>(
      (acc, participant) => {
        if (participant.role === 'base') {
          acc.base += 1;
        } else {
          acc.flyer += 1;
        }

        acc.total += 1;
        return acc;
      },
      { base: 0, flyer: 0, total: 0 },
    );
  }

  private incrementRoleCounts(
    counts: RoleCounts,
    role: 'base' | 'flyer',
  ): RoleCounts {
    if (role === 'base') {
      return {
        ...counts,
        base: counts.base + 1,
        total: counts.total + 1,
      };
    }

    return {
      ...counts,
      flyer: counts.flyer + 1,
      total: counts.total + 1,
    };
  }

  private isRoleAtMax(
    role: 'base' | 'flyer',
    counts: RoleCounts,
    jam: JamRoleConfig,
  ): boolean {
    const max =
      role === 'base' ? jam.desired_bases_max : jam.desired_flyers_max;

    if (max === null || max === undefined) {
      return false;
    }

    const current = role === 'base' ? counts.base : counts.flyer;
    return current >= max;
  }
}
