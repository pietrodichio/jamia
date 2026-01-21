import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class EventOrganizersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly auditService: AuditService,
  ) {}

  async getCoOrganizers(
    eventId: string,
    userId: string,
    isSuperAdmin = false,
  ) {
    // Check if the user is the owner or an existing co-organizer of the event
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('owner_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new NotFoundException('Event not found');
    }

    const isOwner = event.owner_id === userId;

    if (!isSuperAdmin) {
      const { data: existingOrganizer, error: organizerError } =
        await this.supabase
          .from('event_organizers')
          .select('user_id')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .maybeSingle();

      if (!isOwner && !existingOrganizer) {
        throw new ForbiddenException(
          'You do not have permission to view co-organizers for this event',
        );
      }
    }

    const { data, error } = await this.supabase
      .from('event_organizers')
      .select(
        `
        id,
        event_id,
        user_id,
        added_by,
        created_at,
        profiles (
          id,
          first_name,
          last_name,
          email
        )
      `,
      )
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch event co-organizers: ${error.message}`);
    }

    return data || [];
  }

  async addCoOrganizer(
    eventId: string,
    ownerId: string,
    coOrganizerUserId: string,
    isSuperAdmin = false,
  ) {
    // Check if event exists and user has permission
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('id, owner_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new NotFoundException('Event not found');
    }

    // Check if ownerId is actually the owner of the event or super admin
    if (!isSuperAdmin && event.owner_id !== ownerId) {
      throw new ForbiddenException(
        'Only the event owner can add co-organizers',
      );
    }

    if (ownerId === coOrganizerUserId) {
      throw new BadRequestException(
        'The owner cannot be added as a co-organizer',
      );
    }

    // Check if coOrganizerUserId exists
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('id', coOrganizerUserId)
      .single();

    if (profileError || !profile) {
      throw new NotFoundException('User not found');
    }

    // Check if already a co-organizer
    const { data: existingOrganizer } = await this.supabase
      .from('event_organizers')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('user_id', coOrganizerUserId)
      .maybeSingle();

    if (existingOrganizer) {
      throw new BadRequestException(
        'User is already a co-organizer for this event',
      );
    }

    const { data, error } = await this.supabase
      .from('event_organizers')
      .insert({
        event_id: eventId,
        user_id: coOrganizerUserId,
        added_by: ownerId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add co-organizer: ${error.message}`);
    }

    // Log the action
    await this.auditService.log(eventId, ownerId, 'organizer_added', {
      co_organizer_user_id: coOrganizerUserId,
    });

    return data;
  }

  async removeCoOrganizer(
    eventId: string,
    organizerId: string,
    userId: string,
    isSuperAdmin = false,
  ) {
    // Check if userId is actually the owner of the event or super admin
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('owner_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new NotFoundException('Event not found');
    }

    if (!isSuperAdmin && event.owner_id !== userId) {
      throw new ForbiddenException(
        'Only the event owner can remove co-organizers',
      );
    }

    const { error } = await this.supabase
      .from('event_organizers')
      .delete()
      .eq('id', organizerId)
      .eq('event_id', eventId);

    if (error) {
      throw new Error(`Failed to remove co-organizer: ${error.message}`);
    }

    await this.auditService.log(eventId, userId, 'organizer_removed', {
      organizer_id: organizerId,
    });

    return { message: 'Co-organizer removed successfully' };
  }
}
