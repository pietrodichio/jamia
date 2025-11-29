import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { JoinJamDto } from './dto/join-jam.dto';
import { AddParticipantDto } from './dto/add-participant.dto';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';

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

type ParticipantNotificationPayload = {
  userId: string;
  jamId: string;
  jamName: string;
  jamStartsAt?: string | null;
  jamLocation?: string | null;
  jamUrl?: string | null;
};

type ParticipantContact = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

type JamWithConfig = {
  id: string;
  owner_id: string;
  status: string;
  desired_bases_max?: number | null;
  desired_flyers_max?: number | null;
  capacity?: number | null;
  auto_promote?: boolean | null;
  name?: string | null;
  starts_at?: string | null;
  location?: Record<string, unknown> | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_text?: string | null;
};

@Injectable()
export class ParticipantsService {
  private readonly logger = new Logger(ParticipantsService.name);
  private readonly frontendBaseUrl: string | null;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    @Optional() configService?: ConfigService,
  ) {
    this.frontendBaseUrl =
      configService?.get<string>('FRONTEND_BASE_URL') || null;
  }

  async getJamParticipants(
    jamId: string,
    userId: string,
    isSuperAdmin = false,
  ) {
    // Check if user has permission (owner or participant)
    const { data: jam } = await this.supabase
      .from('jams')
      .select('owner_id, status')
      .eq('id', jamId)
      .single();

    if (!jam) {
      throw new NotFoundException('Jam not found');
    }

    let hasManagementAccess = isSuperAdmin || jam.owner_id === userId;

    if (!hasManagementAccess && !isSuperAdmin) {
      const { data: managerRecord, error: managerError } = await this.supabase
        .from('jam_managers')
        .select('id')
        .eq('jam_id', jamId)
        .eq('user_id', userId)
        .maybeSingle();

      if (managerError) {
        throw new Error(
          `Failed to verify jam manager permissions: ${managerError.message}`,
        );
      }

      hasManagementAccess = Boolean(managerRecord);
    }

    if (!hasManagementAccess) {
      throw new ForbiddenException(
        'Only the jam owner or managers can view participants',
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

    // Get cancelled participants (only for managers)
    let cancelledData: any[] = [];
    if (hasManagementAccess) {
      const { data: cancelled, error: cancelledError } = await this.supabase
        .from('jam_participants')
        .select('*')
        .eq('jam_id', jamId)
        .eq('state', 'cancelled')
        .order('cancelled_at', { ascending: false });

      if (cancelledError) {
        throw new Error(
          `Failed to fetch cancelled participants: ${cancelledError.message}`,
        );
      }
      cancelledData = cancelled || [];
    }

    // Get profile data for participants
    const participantIds = participantsData?.map((p) => p.user_id) || [];
    const waitingIds = waitingData?.map((w) => w.user_id) || [];
    const cancelledIds = cancelledData?.map((c) => c.user_id) || [];
    const allUserIds = [...participantIds, ...waitingIds, ...cancelledIds];

    let profilesData: any[] = [];
    if (allUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await this.supabase
        .from('profiles')
        .select('id, first_name, last_name, main_role, phone, photo_url')
        .in('id', allUserIds);

      if (profilesError) {
        console.warn('Failed to fetch profiles:', profilesError.message);
      } else {
        profilesData = profiles || [];
      }
    }

    // Combine participants with profile data
    const participants =
      participantsData?.map((participant) => ({
        ...participant,
        profiles: profilesData.find((p) => p.id === participant.user_id),
      })) || [];

    // Combine waiting list with profile data
    const waitingList =
      waitingData?.map((waiting) => ({
        ...waiting,
        profiles: profilesData.find((p) => p.id === waiting.user_id),
      })) || [];

    // Combine cancelled list with profile data
    const cancelledList =
      cancelledData?.map((cancelled) => ({
        ...cancelled,
        profiles: profilesData.find((p) => p.id === cancelled.user_id),
      })) || [];

    return {
      participants: participants || [],
      waitingList: waitingList || [],
      cancelledList: cancelledList || [],
    };
  }

  private async fetchJamWithConfig(jamId: string): Promise<JamWithConfig> {
    const { data: jam, error: jamError } = await this.supabase
      .from('jams')
      .select(
        'id, owner_id, status, capacity, desired_bases_max, desired_flyers_max, auto_promote, name, starts_at, location_text, location, location_lat, location_lng',
      )
      .eq('id', jamId)
      .single();

    if (jamError || !jam) {
      throw new NotFoundException('Jam not found');
    }

    return jam as JamWithConfig;
  }

  async joinJam(jamId: string, userId: string, joinJamDto: JoinJamDto) {
    const jam = await this.fetchJamWithConfig(jamId);
    await this.ensureUserEmailConfirmed(userId);

    if (jam.status !== 'published') {
      throw new BadRequestException('This jam is not available for booking');
    }

    return this.createParticipationRecord({
      jam,
      userId,
      role: joinJamDto.role,
      source: 'direct',
      actorUserId: userId,
      alreadyParticipatingMessage: 'You are already participating in this jam',
    });
  }

  private async createParticipationRecord({
    jam,
    userId,
    role,
    source,
    actorUserId,
    alreadyParticipatingMessage = 'This user is already participating in this jam',
  }: {
    jam: JamWithConfig;
    userId: string;
    role: ParticipantRole;
    source: string;
    actorUserId: string;
    alreadyParticipatingMessage?: string;
  }) {
    // Check if user already participating
    const { data: existingParticipation } = await this.supabase
      .from('jam_participants')
      .select('*')
      .eq('jam_id', jam.id)
      .eq('user_id', userId)
      .neq('state', 'cancelled')
      .maybeSingle();

    if (existingParticipation) {
      throw new BadRequestException(alreadyParticipatingMessage);
    }

    const { data: cancelledParticipation } = await this.supabase
      .from('jam_participants')
      .select('*')
      .eq('jam_id', jam.id)
      .eq('user_id', userId)
      .eq('state', 'cancelled')
      .maybeSingle();

    const activeParticipants = await this.fetchActiveParticipants(jam.id);
    const roleCounts = this.calculateRoleCounts(activeParticipants);
    const effectiveRole = this.resolveEffectiveRole(role);

    const hasReachedRoleLimit = this.isRoleAtMax(
      effectiveRole,
      roleCounts,
      jam,
    );
    const totalCapacityReached =
      jam.capacity !== null &&
      jam.capacity !== undefined &&
      roleCounts.total >= jam.capacity;

    // Determine if user should be participant or on waiting list
    const newState =
      totalCapacityReached || hasReachedRoleLimit ? 'waiting' : 'participant';

    const jamLocationDescription =
      (jam.location as { description?: string } | null)?.description ||
      jam.location_text;

    const participationPayload = {
      role,
      state: newState,
      source,
    };

    let participationRecord;

    if (cancelledParticipation) {
      const { data, error } = await this.supabase
        .from('jam_participants')
        .update({
          ...participationPayload,
          cancelled_at: null,
          promoted_at: null,
          joined_at: new Date().toISOString(),
        })
        .eq('id', cancelledParticipation.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to rejoin jam: ${error.message}`);
      }

      participationRecord = data;
    } else {
      const { data, error } = await this.supabase
        .from('jam_participants')
        .insert({
          jam_id: jam.id,
          user_id: userId,
          ...participationPayload,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to join jam: ${error.message}`);
      }

      participationRecord = data;
    }

    // Log action with actor information
    await this.auditService.log(jam.id, actorUserId, 'joined', {
      role,
      state: newState,
      source,
      target_user_id: userId,
      actor_user_id: actorUserId,
    });

    if (newState === 'participant') {
      await this.notifyParticipantConfirmed({
        userId,
        jamId: jam.id,
        jamName: jam.name || 'la jam',
        jamStartsAt: jam.starts_at,
        jamLocation: jamLocationDescription,
      });
    }

    return {
      ...participationRecord,
      message:
        newState === 'waiting'
          ? 'Added to waiting list'
          : 'Successfully joined the jam',
    };
  }

  private async ensureUserEmailConfirmed(userId: string) {
    const { data, error } = await this.supabase.auth.admin.getUserById(userId);

    if (error) {
      throw new Error(
        `Failed to verify email confirmation status: ${error.message}`,
      );
    }

    const user = data?.user;

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const isEmailConfirmed = Boolean(
      user.email_confirmed_at || user.confirmed_at,
    );

    if (!isEmailConfirmed) {
      throw new ForbiddenException(
        'Please confirm your email before joining a jam',
      );
    }
  }

  async addParticipantAsManager(
    jamId: string,
    actorUserId: string,
    addParticipantDto: AddParticipantDto,
    isSuperAdmin = false,
  ) {
    const jam = await this.fetchJamWithConfig(jamId);

    if (!isSuperAdmin && jam.owner_id !== actorUserId) {
      const { data: managerRecord, error: managerError } = await this.supabase
        .from('jam_managers')
        .select('id')
        .eq('jam_id', jamId)
        .eq('user_id', actorUserId)
        .maybeSingle();

      if (managerError) {
        throw new Error(
          `Failed to verify manager permissions: ${managerError.message}`,
        );
      }

      if (!managerRecord) {
        throw new ForbiddenException(
          'Only the jam owner or managers can add participants',
        );
      }
    }

    const normalizedEmail = this.normalizeEmail(addParticipantDto.email);

    const { data: existingProfile, error: profileError } = await this.supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Failed to look up user: ${profileError.message}`);
    }

    let targetUserId: string;
    let wasInvited = false;

    if (existingProfile) {
      targetUserId = existingProfile.id;
    } else {
      const inviteOptions: {
        data?: {
          name?: string;
          invite_jam_id?: string;
          invite_jam_name?: string | null;
        };
        redirectTo?: string;
      } = {
        data: {
          name: this.buildDisplayName(
            addParticipantDto.firstName,
            addParticipantDto.lastName,
          ),
          invite_jam_id: jamId,
          invite_jam_name: jam.name || null,
        },
      };

      const redirectTo = this.buildInviteRedirectUrl(jamId, jam.name);
      if (redirectTo) {
        inviteOptions.redirectTo = redirectTo;
      }

      const inviteResult = await this.supabase.auth.admin.inviteUserByEmail(
        normalizedEmail,
        inviteOptions,
      );

      if (inviteResult.error || !inviteResult.data?.user) {
        throw new Error(
          `Failed to invite participant: ${
            inviteResult.error?.message || 'unknown error'
          }`,
        );
      }

      targetUserId = inviteResult.data.user.id;
      wasInvited = true;

      await this.upsertInvitedProfile(targetUserId, {
        email: normalizedEmail,
        firstName: addParticipantDto.firstName,
        lastName: addParticipantDto.lastName,
        phone: addParticipantDto.phone,
        role: addParticipantDto.role,
      });
    }

    const participation = await this.createParticipationRecord({
      jam,
      userId: targetUserId,
      role: addParticipantDto.role,
      source: wasInvited ? 'manager_invite' : 'manager_manual',
      actorUserId,
    });

    return {
      ...participation,
      invited: wasInvited,
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

  async removeParticipant(
    participantId: string,
    userId: string,
    isSuperAdmin = false,
  ) {
    // Get participation
    const { data: participation, error: fetchError } = await this.supabase
      .from('jam_participants')
      .select('jam_id, user_id')
      .eq('id', participantId)
      .single();

    if (fetchError || !participation) {
      throw new NotFoundException('Participation not found');
    }

    // Check if user is jam owner or manager
    const { data: jam } = await this.supabase
      .from('jams')
      .select(
        'owner_id, auto_promote, name, starts_at, location_text, location, location_lat, location_lng',
      )
      .eq('id', participation.jam_id)
      .single();

    if (!jam) {
      throw new NotFoundException('Jam not found');
    }

    let hasPermission = isSuperAdmin || jam.owner_id === userId;

    if (!hasPermission && !isSuperAdmin) {
      const { data: managerRecord, error: managerError } = await this.supabase
        .from('jam_managers')
        .select('id')
        .eq('jam_id', participation.jam_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (managerError) {
        throw new Error(
          `Failed to verify manager permissions: ${managerError.message}`,
        );
      }

      hasPermission = Boolean(managerRecord);
    }

    if (!hasPermission) {
      throw new ForbiddenException(
        'Only the jam owner or managers can remove participants',
      );
    }

    const jamLocationDescription =
      (jam.location as { description?: string } | null)?.description ||
      jam.location_text;

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

    await this.notifyParticipantRemoved({
      userId: participation.user_id,
      jamId: participation.jam_id,
      jamName: jam.name || 'la jam',
      jamStartsAt: jam.starts_at,
      jamLocation: jamLocationDescription,
    });

    // If auto-promote is enabled, promote from waiting list
    if (jam.auto_promote) {
      await this.promoteFromWaitingList(participation.jam_id);
    }

    return { message: 'Participant removed successfully' };
  }

  async updateParticipantRole(
    participantId: string,
    userId: string,
    role: 'base' | 'flyer',
    isSuperAdmin = false,
  ) {
    const { data: participation, error: fetchError } = await this.supabase
      .from('jam_participants')
      .select('id, jam_id, user_id, role')
      .eq('id', participantId)
      .single();

    if (fetchError || !participation) {
      throw new NotFoundException('Participation not found');
    }

    const isSelfUpdate = participation.user_id === userId;

    if (!isSelfUpdate) {
      const { data: jam } = await this.supabase
        .from('jams')
        .select('owner_id')
        .eq('id', participation.jam_id)
        .single();

      if (!jam) {
        throw new NotFoundException('Jam not found');
      }

      let hasPermission = isSuperAdmin || jam.owner_id === userId;

      if (!hasPermission && !isSuperAdmin) {
        const { data: managerRecord, error: managerError } =
          await this.supabase
            .from('jam_managers')
            .select('id')
            .eq('jam_id', participation.jam_id)
            .eq('user_id', userId)
            .maybeSingle();

        if (managerError) {
          throw new Error(
            `Failed to verify manager permissions: ${managerError.message}`,
          );
        }

        hasPermission = Boolean(managerRecord);
      }

      if (!hasPermission) {
        throw new ForbiddenException(
          'You do not have permission to update this participant role',
        );
      }
    }

    const previousRole = participation.role as ParticipantRole;

    const { data: updated, error: updateError } = await this.supabase
      .from('jam_participants')
      .update({ role })
      .eq('id', participantId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(
        `Failed to update participant role: ${updateError?.message || 'unknown error'}`,
      );
    }

    // Log the role update
    await this.auditService.log(participation.jam_id, userId, 'role_updated', {
      previous_role: previousRole,
      new_role: role,
      target_user_id: participation.user_id,
    });

    return updated;
  }

  async promoteWaitingParticipant(
    participantId: string,
    userId: string,
    isSuperAdmin = false,
  ) {
    const { data: participation, error: fetchError } = await this.supabase
      .from('jam_participants')
      .select('id, jam_id, user_id, role, state')
      .eq('id', participantId)
      .single();

    if (fetchError || !participation) {
      throw new NotFoundException('Participation not found');
    }

    if (participation.state !== 'waiting') {
      throw new BadRequestException(
        'Only waiting list participants can be promoted',
      );
    }

    const jam = await this.fetchJamWithConfig(participation.jam_id);

    let hasPermission = isSuperAdmin || jam.owner_id === userId;

    if (!hasPermission && !isSuperAdmin) {
      const { data: managerRecord, error: managerError } = await this.supabase
        .from('jam_managers')
        .select('id')
        .eq('jam_id', participation.jam_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (managerError) {
        throw new Error(
          `Failed to verify manager permissions: ${managerError.message}`,
        );
      }

      hasPermission = Boolean(managerRecord);
    }

    if (!hasPermission) {
      throw new ForbiddenException(
        'Only the jam owner or managers can promote participants',
      );
    }

    if (jam.auto_promote) {
      throw new BadRequestException(
        'Manual promotion is disabled when auto-promote is active',
      );
    }

    const activeParticipants = await this.fetchActiveParticipants(
      participation.jam_id,
    );
    const roleCounts = this.calculateRoleCounts(activeParticipants);
    const effectiveRole = this.resolveEffectiveRole(
      participation.role as ParticipantRole,
    );

    if (
      jam.capacity !== null &&
      jam.capacity !== undefined &&
      roleCounts.total >= jam.capacity
    ) {
      throw new BadRequestException(
        'Jam is currently at capacity. Cannot promote from waiting list.',
      );
    }

    if (this.isRoleAtMax(effectiveRole, roleCounts, jam)) {
      throw new BadRequestException(
        `Cannot promote this participant because ${effectiveRole} capacity is full`,
      );
    }

    const { data: updated, error: updateError } = await this.supabase
      .from('jam_participants')
      .update({
        state: 'participant',
        promoted_at: new Date().toISOString(),
      })
      .eq('id', participantId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(
        `Failed to promote participant: ${
          updateError?.message || 'unknown error'
        }`,
      );
    }

    await this.auditService.log(participation.jam_id, userId, 'promoted', {
      target_user_id: participation.user_id,
    });

    const jamLocationDescription =
      (jam.location as { description?: string } | null)?.description ||
      jam.location_text;

    await this.notifyParticipantPromoted({
      userId: participation.user_id,
      jamId: participation.jam_id,
      jamName: jam.name || 'la jam',
      jamStartsAt: jam.starts_at,
      jamLocation: jamLocationDescription,
    });

    return updated;
  }

  private async promoteFromWaitingList(jamId: string): Promise<void> {
    // Get jam details
    const { data: jam } = await this.supabase
      .from('jams')
      .select(
        'capacity, auto_promote, desired_bases_max, desired_flyers_max, name, starts_at, location_text, location, location_lat, location_lng',
      )
      .eq('id', jamId)
      .single();

    if (!jam || !jam.auto_promote) {
      return;
    }

    const jamLocationDescription =
      (jam.location as { description?: string } | null)?.description ||
      jam.location_text;

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
      throw new Error(`Failed to fetch waiting list: ${waitingError.message}`);
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

      await this.notifyParticipantPromoted({
        userId: waitingPerson.user_id,
        jamId,
        jamName: jam.name || 'la jam',
        jamStartsAt: jam.starts_at,
        jamLocation: jamLocationDescription,
      });
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
      throw new Error(`Failed to fetch user participation: ${error.message}`);
    }

    return data;
  }

  private async notifyParticipantConfirmed(
    payload: ParticipantNotificationPayload,
  ) {
    if (!this.emailService) {
      this.logger.warn(
        'Email service not configured. Skipping participant confirmation email.',
      );
      return;
    }

    await this.sendParticipantEmail(payload, (context) =>
      this.emailService.sendParticipantConfirmationEmail(context),
    );
  }

  private async notifyParticipantPromoted(
    payload: ParticipantNotificationPayload,
  ) {
    if (!this.emailService) {
      this.logger.warn(
        'Email service not configured. Skipping participant promotion email.',
      );
      return;
    }

    await this.sendParticipantEmail(payload, (context) =>
      this.emailService.sendPromotionEmail(context),
    );
  }

  private async notifyParticipantRemoved(
    payload: ParticipantNotificationPayload,
  ) {
    if (!this.emailService) {
      this.logger.warn(
        'Email service not configured. Skipping participant removal email.',
      );
      return;
    }

    await this.sendParticipantEmail(payload, (context) =>
      this.emailService.sendRemovalEmail(context),
    );
  }

  private async sendParticipantEmail(
    payload: ParticipantNotificationPayload,
    sender: (context: {
      to: string;
      recipientName?: string | null;
      jamId?: string | null;
      jamUrl?: string | null;
      jamName: string;
      jamStartsAt?: string | null;
      jamLocation?: string | null;
    }) => Promise<void>,
  ) {
    const contact = await this.getParticipantContact(payload.userId);
    if (!contact?.email) {
      this.logger.warn(
        `Cannot send email to participant ${payload.userId}: missing email address.`,
      );
      return;
    }

    try {
      await sender({
        to: contact.email,
        recipientName: this.buildRecipientName(contact),
        jamId: payload.jamId,
        jamUrl: payload.jamUrl,
        jamName: payload.jamName,
        jamStartsAt: payload.jamStartsAt,
        jamLocation: payload.jamLocation,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send participant email for jam ${payload.jamName} and user ${payload.userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async getParticipantContact(
    userId: string,
  ): Promise<ParticipantContact | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      this.logger.warn(
        `Failed to fetch participant contact ${userId}: ${error.message}`,
      );
      return null;
    }

    return data || null;
  }

  private buildRecipientName(contact: ParticipantContact): string | null {
    if (contact.first_name) {
      return contact.first_name;
    }

    if (contact.last_name) {
      return contact.last_name;
    }

    return null;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private buildDisplayName(
    firstName?: string,
    lastName?: string,
  ): string | undefined {
    const parts = [firstName, lastName].filter(Boolean);
    return parts.length > 0 ? (parts as string[]).join(' ') : undefined;
  }

  private buildInviteRedirectUrl(
    jamId: string,
    jamName?: string | null,
  ): string | null {
    if (!this.frontendBaseUrl) {
      return null;
    }

    try {
      const url = new URL('/accept-invite', this.frontendBaseUrl);
      url.searchParams.set('jamId', jamId);

      if (jamName) {
        url.searchParams.set('jamName', jamName);
      }

      return url.toString();
    } catch (error) {
      this.logger.warn(
        `Invalid FRONTEND_BASE_URL configuration: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private async upsertInvitedProfile(
    userId: string,
    profile: {
      email: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      role?: ParticipantRole;
    },
  ): Promise<void> {
    const payload: Record<string, any> = {
      id: userId,
      email: profile.email,
      first_name: profile.firstName || profile.email,
    };

    if (profile.lastName) {
      payload.last_name = profile.lastName;
    }

    if (profile.phone) {
      payload.phone = profile.phone;
    }

    payload.main_role = profile.role || 'both';

    const { error } = await this.supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      this.logger.warn(
        `Failed to upsert invited profile ${userId}: ${error.message}`,
      );
    }
  }

  private async fetchActiveParticipants(jamId: string) {
    const { data, error } = await this.supabase
      .from('jam_participants')
      .select('id, role')
      .eq('jam_id', jamId)
      .eq('state', 'participant');

    if (error) {
      throw new Error(`Failed to fetch active participants: ${error.message}`);
    }

    return (data || []) as Array<{
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
    if (!Array.isArray(participants) || participants.length === 0) {
      return { base: 0, flyer: 0, total: 0 };
    }

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
