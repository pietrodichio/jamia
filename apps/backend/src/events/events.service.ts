import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateOccurrenceDto } from './dto/update-occurrence.dto';
import { SearchEventsDto } from './dto/search-events.dto';
import { AuditService } from '../audit/audit.service';
import { rrulestr, RRule } from 'rrule';

@Injectable()
export class EventsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly auditService: AuditService,
  ) {}

  async isOwnerOrCoOrganizer(
    eventId: string,
    userId: string,
    isSuperAdmin = false,
  ): Promise<boolean> {
    if (isSuperAdmin) {
      return true;
    }

    try {
      const { data, error } = await this.supabase.rpc(
        'is_event_owner_or_organizer',
        {
          event_id: eventId,
          user_id: userId,
        },
      );

      if (error) {
        console.error(
          `Failed to verify owner/organizer permissions: ${error.message}`,
        );
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Failed to verify owner/organizer permissions', error);
      return false;
    }
  }

  private validateRRule(rruleString: string, dtstart: Date): void {
    try {
      const rule = rrulestr(rruleString, { dtstart });

      // Enforce occurrence limit (prevent infinite series performance issues)
      const occurrences = rule.all((date, i) => i < 1001); // Max 1000 occurrences

      if (occurrences.length === 1001) {
        throw new BadRequestException(
          'Recurring series would generate more than 1000 occurrences. Please set an earlier end date.',
        );
      }
    } catch (error) {
      throw new BadRequestException(`Invalid recurrence rule: ${error.message}`);
    }
  }

  async createEvent(ownerId: string, createEventDto: CreateEventDto) {
    // Validate dates
    const start = new Date(createEventDto.starts_at);
    const end = new Date(createEventDto.ends_at);

    if (end <= start) {
      throw new BadRequestException('End date must be after start date');
    }

    // Validate recurrence rule if provided
    if (createEventDto.recurrence_rule && createEventDto.recurrence_dtstart) {
      this.validateRRule(
        createEventDto.recurrence_rule,
        new Date(createEventDto.recurrence_dtstart),
      );
    }

    const { data, error } = await this.supabase
      .from('events')
      .insert({
        owner_id: ownerId,
        ...createEventDto,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }

    // Log creation
    await this.auditService.log(data.id, ownerId, 'event_created', {
      event_title: createEventDto.title,
      event_type: createEventDto.type,
    });

    return data;
  }

  async getEventById(eventId: string, userId?: string, isSuperAdmin = false) {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Event not found');
    }

    // Check if user has permission to view this event
    if (
      !isSuperAdmin &&
      data.status !== 'published' &&
      data.owner_id !== userId
    ) {
      // Check if user is an organizer
      if (userId) {
        const isOrganizer = await this.isOwnerOrCoOrganizer(
          eventId,
          userId,
          isSuperAdmin,
        );
        if (!isOrganizer) {
          throw new ForbiddenException(
            'You do not have permission to view this event',
          );
        }
      } else {
        throw new ForbiddenException(
          'You do not have permission to view this event',
        );
      }
    }

    return data;
  }

  async getEventsByOwner(userId: string) {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('owner_id', userId)
      .order('starts_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch owned events: ${error.message}`);
    }

    return data || [];
  }

  async getEventsCoOrganized(userId: string) {
    // Get organizer relations
    const { data: organizerRelations, error: organizerError } =
      await this.supabase
        .from('event_organizers')
        .select('event_id')
        .eq('user_id', userId);

    if (organizerError) {
      throw new Error(
        `Failed to fetch co-organized events: ${organizerError.message}`,
      );
    }

    if (!organizerRelations || organizerRelations.length === 0) {
      return [];
    }

    const eventIds = organizerRelations.map((r) => r.event_id);

    // Get event details
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .in('id', eventIds)
      .order('starts_at', { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch co-organized event details: ${error.message}`,
      );
    }

    return data || [];
  }

  async updateEvent(
    eventId: string,
    userId: string,
    updateEventDto: UpdateEventDto,
    isSuperAdmin = false,
  ) {
    // Check authorization
    const canUpdate = await this.isOwnerOrCoOrganizer(
      eventId,
      userId,
      isSuperAdmin,
    );
    if (!canUpdate) {
      throw new ForbiddenException(
        'You can only update events you own or co-organize',
      );
    }

    // Get current event for date validation
    const currentEvent = await this.getEventById(eventId, userId, isSuperAdmin);

    // Validate dates if provided
    if (updateEventDto.starts_at || updateEventDto.ends_at) {
      const start = new Date(
        updateEventDto.starts_at || currentEvent.starts_at,
      );
      const end = new Date(updateEventDto.ends_at || currentEvent.ends_at);

      if (end <= start) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const { data, error } = await this.supabase
      .from('events')
      .update(updateEventDto)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update event: ${error.message}`);
    }

    // Log update
    await this.auditService.log(
      eventId,
      userId,
      'event_updated',
      updateEventDto as Record<string, unknown>,
    );

    return data;
  }

  async deleteEvent(eventId: string, userId: string, isSuperAdmin = false) {
    // Check owner ONLY (not co-organizers)
    const event = await this.getEventById(eventId, userId, isSuperAdmin);

    if (!isSuperAdmin && event.owner_id !== userId) {
      throw new ForbiddenException('Only the event owner can delete events');
    }

    const { error } = await this.supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }

    // Log deletion
    await this.auditService.log(eventId, userId, 'event_deleted', {
      event_title: event.title,
    });

    return { message: 'Event deleted successfully' };
  }

  async publishEvent(eventId: string, userId: string, isSuperAdmin = false) {
    // Check authorization
    const canPublish = await this.isOwnerOrCoOrganizer(
      eventId,
      userId,
      isSuperAdmin,
    );
    if (!canPublish) {
      throw new ForbiddenException(
        'You can only publish events you own or co-organize',
      );
    }

    const { data, error } = await this.supabase
      .from('events')
      .update({ status: 'published' })
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to publish event: ${error.message}`);
    }

    // Log publication
    await this.auditService.log(eventId, userId, 'event_published');

    return data;
  }

  async updateOccurrence(
    eventId: string,
    originalStart: string,
    updateDto: UpdateOccurrenceDto,
    userId: string,
    isSuperAdmin = false,
  ): Promise<any> {
    // 1. Verify user owns or co-organizes event
    const { data: event, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error || !event) {
      throw new NotFoundException('Event not found');
    }

    if (
      !isSuperAdmin &&
      !(await this.isOwnerOrCoOrganizer(eventId, userId, isSuperAdmin))
    ) {
      throw new ForbiddenException(
        'You can only edit events you own or co-organize',
      );
    }

    // 2. Upsert exception
    const { data, error: upsertError } = await this.supabase
      .from('event_occurrences')
      .upsert(
        {
          event_id: eventId,
          original_start: originalStart,
          ...updateDto,
        },
        {
          onConflict: 'event_id,original_start',
        },
      )
      .select()
      .single();

    if (upsertError) {
      throw new Error(`Failed to update occurrence: ${upsertError.message}`);
    }

    // 3. Log action
    await this.auditService.log(
      eventId,
      userId,
      updateDto.is_cancelled ? 'cancel_occurrence' : 'update_occurrence',
      { original_start: originalStart, updates: updateDto },
    );

    return data;
  }

  async updateFutureOccurrences(
    eventId: string,
    fromDate: string,
    updateDto: UpdateEventDto,
    userId: string,
    isSuperAdmin = false,
  ): Promise<{ truncatedSeriesId: string; newSeriesId: string }> {
    // 1. Get original event
    const { data: originalEvent, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error || !originalEvent) {
      throw new NotFoundException('Event not found');
    }

    if (!originalEvent.recurrence_rule) {
      throw new BadRequestException('Event is not recurring');
    }

    if (
      !isSuperAdmin &&
      !(await this.isOwnerOrCoOrganizer(eventId, userId, isSuperAdmin))
    ) {
      throw new ForbiddenException(
        'You can only edit events you own or co-organize',
      );
    }

    // 2. Parse original RRULE
    const originalRule = rrulestr(originalEvent.recurrence_rule, {
      dtstart: new Date(originalEvent.recurrence_dtstart),
    });

    // 3. Truncate original series
    const truncatedRule = new RRule({
      ...originalRule.origOptions,
      until: new Date(new Date(fromDate).getTime() - 1), // End 1ms before edit date
    });

    await this.supabase
      .from('events')
      .update({
        recurrence_rule: truncatedRule.toString(),
        recurrence_until: truncatedRule.options.until?.toISOString(),
      })
      .eq('id', eventId);

    // 4. Create new series starting from edit date
    const newRuleOptions = {
      ...originalRule.origOptions,
      dtstart: new Date(fromDate),
      ...((updateDto.recurrence_rule ? { freq: RRule.WEEKLY } : {}) as any), // If updateDto has new rule
    };

    if (updateDto.recurrence_rule) {
      const customRule = rrulestr(updateDto.recurrence_rule, {
        dtstart: new Date(fromDate),
      });
      Object.assign(newRuleOptions, customRule.origOptions);
    }

    const newRule = new RRule(newRuleOptions);

    const { data: newEvent, error: createError } = await this.supabase
      .from('events')
      .insert({
        ...originalEvent,
        id: undefined, // Generate new UUID
        ...updateDto,
        recurrence_rule: newRule.toString(),
        recurrence_dtstart: new Date(fromDate).toISOString(),
        starts_at: new Date(fromDate).toISOString(),
        parent_event_id: eventId, // Link to original series
        created_at: undefined, // New timestamp
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create new series: ${createError.message}`);
    }

    // 5. Log action
    await this.auditService.log(eventId, userId, 'split_recurring_series', {
      from_date: fromDate,
      new_series_id: newEvent.id,
    });

    return { truncatedSeriesId: eventId, newSeriesId: newEvent.id };
  }

  async searchEvents(dto: SearchEventsDto) {
    const { data, error } = await this.supabase.rpc(
      'search_events_by_location',
      {
        search_lng: dto.lng,
        search_lat: dto.lat,
        radius_meters: dto.radius || 50000,
        event_types: dto.types || null,
        date_from: dto.dateFrom || null,
        date_to: dto.dateTo || null,
        keyword: dto.keyword || null,
      },
    );

    if (error) {
      throw new Error(`Failed to search events: ${error.message}`);
    }

    return data;
  }

  /**
   * Create event listing from managed jam
   * Called by JamsService when managed jam is created
   */
  async createEventFromJam(jam: any, userId: string): Promise<any> {
    // Only create events for published managed jams
    if (jam.status !== 'published' || jam.visibility !== 'managed') {
      return null;
    }

    // Map jam fields to event fields
    const eventData = {
      owner_id: jam.owner_id,
      type: 'jam' as const,
      title: jam.name,
      location_text: jam.location?.description || jam.location_text || '',
      location_lat: jam.location?.latitude ?? jam.location_lat,
      location_lng: jam.location?.longitude ?? jam.location_lng,
      gmaps_link: jam.location?.google_maps_url || jam.gmaps_link,
      starts_at: jam.starts_at,
      ends_at: jam.ends_at,
      description: jam.description,
      status: 'published' as const,
      source_jam_id: jam.id,
      // Don't copy recurrence - jams handle their own scheduling
    };

    const { data, error } = await this.supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();

    if (error) {
      console.error('Failed to create event from jam:', error);
      // Don't throw - jam creation should succeed even if event sync fails
      return null;
    }

    await this.auditService.log(data.id, userId, 'sync_jam_to_event', {
      source_jam_id: jam.id,
      operation: 'create',
    });

    return data;
  }

  /**
   * Update event listing when managed jam is updated
   * Called by JamsService when managed jam changes
   */
  async syncJamUpdate(
    jamId: string,
    jamUpdates: any,
    userId: string,
  ): Promise<void> {
    // Find linked event
    const { data: event } = await this.supabase
      .from('events')
      .select('id, status')
      .eq('source_jam_id', jamId)
      .maybeSingle();

    if (!event) {
      return; // No linked event, nothing to sync
    }

    // Handle visibility/status changes
    if (
      jamUpdates.visibility === 'share-by-link' ||
      jamUpdates.status === 'draft'
    ) {
      // Jam is no longer public - delete event listing
      await this.supabase.from('events').delete().eq('id', event.id);

      await this.auditService.log(event.id, userId, 'sync_jam_to_event', {
        source_jam_id: jamId,
        operation: 'delete',
        reason: 'jam_visibility_changed',
      });

      return;
    }

    // Map updates
    const eventUpdates: any = {};
    if (jamUpdates.name !== undefined) eventUpdates.title = jamUpdates.name;
    if (jamUpdates.description !== undefined)
      eventUpdates.description = jamUpdates.description;
    if (jamUpdates.location) {
      if (jamUpdates.location.description)
        eventUpdates.location_text = jamUpdates.location.description;
      if (jamUpdates.location.latitude !== undefined)
        eventUpdates.location_lat = jamUpdates.location.latitude;
      if (jamUpdates.location.longitude !== undefined)
        eventUpdates.location_lng = jamUpdates.location.longitude;
      if (jamUpdates.location.google_maps_url)
        eventUpdates.gmaps_link = jamUpdates.location.google_maps_url;
    }
    if (jamUpdates.location_text !== undefined)
      eventUpdates.location_text = jamUpdates.location_text;
    if (jamUpdates.location_lat !== undefined)
      eventUpdates.location_lat = jamUpdates.location_lat;
    if (jamUpdates.location_lng !== undefined)
      eventUpdates.location_lng = jamUpdates.location_lng;
    if (jamUpdates.gmaps_link !== undefined)
      eventUpdates.gmaps_link = jamUpdates.gmaps_link;
    if (jamUpdates.starts_at) eventUpdates.starts_at = jamUpdates.starts_at;
    if (jamUpdates.ends_at) eventUpdates.ends_at = jamUpdates.ends_at;
    if (jamUpdates.status === 'published') eventUpdates.status = 'published';
    if (jamUpdates.status === 'archived') eventUpdates.status = 'archived';

    if (Object.keys(eventUpdates).length === 0) {
      return; // No relevant updates
    }

    await this.supabase.from('events').update(eventUpdates).eq('id', event.id);

    await this.auditService.log(event.id, userId, 'sync_jam_to_event', {
      source_jam_id: jamId,
      operation: 'update',
      updates: eventUpdates,
    });
  }

  /**
   * Delete event listing when managed jam is deleted
   * Called by JamsService when jam is deleted
   */
  async deleteEventFromJam(jamId: string, userId: string): Promise<void> {
    const { data: event } = await this.supabase
      .from('events')
      .select('id')
      .eq('source_jam_id', jamId)
      .maybeSingle();

    if (!event) {
      return; // No linked event
    }

    await this.supabase.from('events').delete().eq('id', event.id);

    await this.auditService.log(event.id, userId, 'sync_jam_to_event', {
      source_jam_id: jamId,
      operation: 'delete',
      reason: 'jam_deleted',
    });
  }
}
