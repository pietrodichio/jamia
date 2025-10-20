import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import type { JoinJamDto } from './dto/join-jam.dto';
import { AuditService } from '../audit/audit.service';

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
    const { data: participants, error: participantsError } =
      await this.supabase
        .from('jam_participants')
        .select(
          `
        *,
        profiles:user_id (name, main_role, phone)
      `,
        )
        .eq('jam_id', jamId)
        .eq('state', 'participant')
        .order('joined_at', { ascending: true });

    if (participantsError) {
      throw new Error(
        `Failed to fetch participants: ${participantsError.message}`,
      );
    }

    // Get waiting list
    const { data: waitingList, error: waitingError } = await this.supabase
      .from('jam_participants')
      .select(
        `
        *,
        profiles:user_id (name, main_role, phone)
      `,
      )
      .eq('jam_id', jamId)
      .eq('state', 'waiting')
      .order('joined_at', { ascending: true });

    if (waitingError) {
      throw new Error(`Failed to fetch waiting list: ${waitingError.message}`);
    }

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

    // Count current participants
    const { count: participantCount } = await this.supabase
      .from('jam_participants')
      .select('*', { count: 'exact', head: true })
      .eq('jam_id', jamId)
      .eq('state', 'participant');

    // Determine if user should be participant or on waiting list
    const isAtCapacity = jam.capacity && participantCount !== null && participantCount >= jam.capacity;
    const newState = isAtCapacity ? 'waiting' : 'participant';

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
      message: isAtCapacity
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
      .select('capacity, auto_promote')
      .eq('id', jamId)
      .single();

    if (!jam || !jam.auto_promote) {
      return;
    }

    // Check if there's capacity
    if (jam.capacity) {
      const { count: participantCount } = await this.supabase
        .from('jam_participants')
        .select('*', { count: 'exact', head: true })
        .eq('jam_id', jamId)
        .eq('state', 'participant');

      if (participantCount && participantCount >= jam.capacity) {
        return; // Still at capacity
      }
    }

    // Get first person on waiting list
    const { data: waitingPerson } = await this.supabase
      .from('jam_participants')
      .select('*')
      .eq('jam_id', jamId)
      .eq('state', 'waiting')
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!waitingPerson) {
      return; // No one waiting
    }

    // Promote to participant
    await this.supabase
      .from('jam_participants')
      .update({
        state: 'participant',
        promoted_at: new Date().toISOString(),
      })
      .eq('id', waitingPerson.id);

    // Log promotion
    await this.auditService.log(jamId, waitingPerson.user_id, 'promoted');
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
}

