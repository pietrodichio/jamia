import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { CreateEventDto, LocationDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateOccurrenceDto } from './dto/update-occurrence.dto';
import { SearchEventsDto } from './dto/search-events.dto';
import { PublicEventsDto } from './dto/public-events.dto';
import { SaveDraftEventDto } from './dto/save-draft-event.dto';
import { AuditService } from '../audit/audit.service';
import { rrulestr, RRule } from 'rrule';

@Injectable()
export class EventsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Extract location fields from DTO, handling both string and object formats
   */
  private extractLocationFields(dto: any): {
    location_text?: string;
    location_city?: string;
    location_lat?: number;
    location_lng?: number;
    gmaps_link?: string;
  } {
    const result: any = {};

    // Handle location_text as object (from frontend location picker)
    if (dto.location_text && typeof dto.location_text === 'object') {
      const loc = dto.location_text as LocationDto;
      result.location_text = loc.description;
      if (loc.city) result.location_city = loc.city;
      if (loc.latitude !== undefined) result.location_lat = loc.latitude;
      if (loc.longitude !== undefined) result.location_lng = loc.longitude;
      if (loc.googleMapsUrl) result.gmaps_link = loc.googleMapsUrl;
    } else if (typeof dto.location_text === 'string') {
      result.location_text = dto.location_text;
    }

    // Also check for direct location fields (higher priority)
    if (dto.location_city) result.location_city = dto.location_city;
    if (dto.location_lat !== undefined) result.location_lat = dto.location_lat;
    if (dto.location_lng !== undefined) result.location_lng = dto.location_lng;
    if (dto.gmaps_link) result.gmaps_link = dto.gmaps_link;

    return result;
  }

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

    // Extract location fields from DTO
    const locationFields = this.extractLocationFields(createEventDto);

    // Remove the original location_text if it was an object (we've extracted it)
    const { location_text, ...restDto } = createEventDto;

    const { data, error } = await this.supabase
      .from('events')
      .insert({
        owner_id: ownerId,
        ...restDto,
        ...locationFields,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }

    // REVERSE SYNC: Create corresponding jam for managed jams
    if (createEventDto.type === 'jam' && createEventDto.manage_participants) {
      await this.createJamFromEvent(data, createEventDto, ownerId);
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

    const { data: organizer, error: organizerError } = await this.supabase
      .from('profiles')
      .select('id,first_name,last_name,email,photo_url,is_super_admin,bio')
      .eq('id', data.owner_id)
      .maybeSingle();

    if (organizerError) {
      throw new Error(
        `Failed to load organizer profile: ${organizerError.message}`,
      );
    }

    const organizerName = organizer
      ? `${organizer.first_name ?? ''} ${organizer.last_name ?? ''}`.trim()
      : null;

    return organizer
      ? {
          ...data,
          organizer: {
            id: organizer.id,
            name: organizerName,
            email: organizer.email,
            photo_url: organizer.photo_url ?? undefined,
            is_super_admin: organizer.is_super_admin ?? false,
            bio: organizer.bio ?? undefined,
          },
        }
      : { ...data, organizer: null };
  }

  async saveDraftEvent(
    userId: string,
    dto: SaveDraftEventDto,
    isSuperAdmin = false,
  ) {
    if (!userId) {
      throw new ForbiddenException('User is required to save drafts');
    }

    if (dto.id) {
      const { data: existing, error } = await this.supabase
        .from('events')
        .select('id, owner_id')
        .eq('id', dto.id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to load draft: ${error.message}`);
      }

      if (existing && !isSuperAdmin && existing.owner_id !== userId) {
        throw new ForbiddenException('You can only edit your own drafts');
      }
    }

    // Extract location fields from DTO
    const locationFields = this.extractLocationFields(dto);

    // Remove the original location_text if it was an object (we've extracted it)
    const { location_text, ...restDto } = dto;

    let data;
    let error;

    if (dto.id) {
       // Try to update first if ID is provided
       // We know if it exists from the check above, but purely relying on ID presence:
       
       // If we found 'existing' above, we update. 
       // If we didn't (and it was allowed), we technically could be creating with specific ID, 
       // but typically drafts shouldn't be created with specific IDs from client unless dealing with offline sync/UUIDs.
       // Assuming if ID is present and passed checks, we treat as Update or Upsert-with-defaults?
       
       // Simplest fix: Use upsert but ensure we merge with defaults IF it's a new record? No, upsert doesn't work that way.
       
       // If it essentially exists (we checked 'existing' variable in previous block if dto.id was present):
       // Wait, I need access to 'existing' variable from the block above.
       // The previous block scope limits 'existing'.
       // Let's assume if dto.id is present, we try to UPDATE.
       // If it fails (doesn't exist), we catch and insert? 
       // Or better: The user sends ID for existing drafts.
       
       // Let's modify the flow slightly to verify existence properly.
       
       const { data: existingCheck } = await this.supabase
         .from('events')
         .select('id')
         .eq('id', dto.id)
         .maybeSingle();
         
       if (existingCheck) {
         // Update existing
         const updateResult = await this.supabase
           .from('events')
           .update({
             ...restDto,
             ...locationFields,
             updated_at: new Date().toISOString(),
           })
           .eq('id', dto.id)
           .select('*')
           .single();
           
           data = updateResult.data;
           error = updateResult.error;
       } else {
         // Create new with specific ID (or fail? let's allow create)
         // Need defaults
         const insertResult = await this.supabase
           .from('events')
           .insert({
             id: dto.id,
             title: restDto.title || 'Untitled Draft',
             location_text: locationFields.location_text || '',
             starts_at: restDto.starts_at || new Date().toISOString(),
             ends_at: restDto.ends_at || new Date(Date.now() + 3600000).toISOString(),
             status: 'draft',
             owner_id: userId,
             ...restDto,
             ...locationFields,
           })
           .select('*')
           .single();
           
           data = insertResult.data;
           error = insertResult.error;
       }
    } else {
      // Create new (no ID provided)
      const insertResult = await this.supabase
        .from('events')
        .insert({
           title: restDto.title || 'Untitled Draft',
           location_text: locationFields.location_text || '',
           starts_at: restDto.starts_at || new Date().toISOString(),
           ends_at: restDto.ends_at || new Date(Date.now() + 3600000).toISOString(),
           status: 'draft',
           owner_id: userId,
           ...restDto,
           ...locationFields,
        })
        .select('*')
        .single();
        
        data = insertResult.data;
        error = insertResult.error;
    }

    if (error) {
      throw new Error(`Failed to save draft: ${error.message}`);
    }

    // REVERSE SYNC: Create/update corresponding jam for managed jam drafts
    if (restDto.type === 'jam' && restDto.manage_participants) {
      // Check if linked jam exists
      const { data: existingJam } = await this.supabase
        .from('jams')
        .select('id')
        .eq('source_event_id', data.id)
        .maybeSingle();

      if (existingJam) {
        // Update existing jam
        await this.supabase
          .from('jams')
          .update({
            name: data.title,
            location_text: data.location_text,
            location_lat: data.location_lat,
            location_lng: data.location_lng,
            gmaps_link: data.gmaps_link,
            starts_at: data.starts_at,
            ends_at: data.ends_at,
            description: data.description,
            capacity: restDto.capacity ?? null,
            desired_bases_min: restDto.desired_bases_min ?? null,
            desired_bases_max: restDto.desired_bases_max ?? null,
            desired_flyers_min: restDto.desired_flyers_min ?? null,
            desired_flyers_max: restDto.desired_flyers_max ?? null,
            auto_promote: restDto.auto_promote ?? true,
            public_participants: restDto.public_participants ?? true,
            location:
              data.location_lat && data.location_lng
                ? {
                    description: data.location_text,
                    latitude: data.location_lat,
                    longitude: data.location_lng,
                    google_maps_url: data.gmaps_link,
                  }
                : null,
          })
          .eq('id', existingJam.id);
      } else {
        // Create new jam - need to cast restDto to CreateEventDto for the method
        await this.createJamFromEvent(data, restDto as CreateEventDto, userId);
      }
    }

    const { data: organizer, error: organizerError } = await this.supabase
      .from('profiles')
      .select('id,first_name,last_name,email,photo_url,is_super_admin,bio')
      .eq('id', data.owner_id)
      .maybeSingle();

    if (organizerError) {
      throw new Error(
        `Failed to load organizer profile: ${organizerError.message}`,
      );
    }

    const organizerName = organizer
      ? `${organizer.first_name ?? ''} ${organizer.last_name ?? ''}`.trim()
      : null;

    return organizer
      ? {
          ...data,
          organizer: {
            id: organizer.id,
            name: organizerName,
            email: organizer.email,
            photo_url: organizer.photo_url ?? undefined,
            is_super_admin: organizer.is_super_admin ?? false,
            bio: organizer.bio ?? undefined,
          },
        }
      : { ...data, organizer: null };
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

    // Extract location fields from DTO if location_text is an object
    const locationFields = this.extractLocationFields(updateEventDto);

    // Prepare update data, removing location_text if it was an object
    const { location_text, ...restDto } = updateEventDto as any;
    const updateData = {
      ...restDto,
      ...locationFields,
    };

    const { data, error } = await this.supabase
      .from('events')
      .update(updateData)
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

    // Sync status to linked jam (if exists)
    if (data.source_jam_id) {
      // Event was created from jam - jam sync is handled by JamsService
      // No action needed here
    } else if (data.manage_participants && data.type === 'jam') {
      // Event was created via /create-event - sync status to linked jam
      await this.supabase
        .from('jams')
        .update({ status: 'published' })
        .eq('source_event_id', eventId);
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
        filter_tags: dto.tags || null,
        filter_accommodation: dto.accommodation_options || null,
        filter_food: dto.food_options || null,
        filter_teacher_id: dto.teacher_id || null,
      },
    );

    if (error) {
      throw new Error(`Failed to search events: ${error.message}`);
    }

    return data;
  }

  async getPublicEvents(dto: PublicEventsDto) {
    const startsAt = dto.startsAt ?? new Date().toISOString();
    const limit = dto.limit ?? 100;

    let query = this.supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .gte('starts_at', startsAt)
      .order('starts_at', { ascending: true })
      .limit(limit);

    // Filter by event types
    if (dto.types && dto.types.length > 0) {
      query = query.in('type', dto.types);
    }

    // Filter by date range
    if (dto.dateFrom) {
      query = query.gte('starts_at', dto.dateFrom);
    }
    if (dto.dateTo) {
      query = query.lte('starts_at', dto.dateTo);
    }

    // Keyword search in title and description
    if (dto.keyword) {
      const keyword = `%${dto.keyword}%`;
      // Search in both title and description using OR
      // Supabase PostgREST or() syntax: field.operator.value,field2.operator.value
      query = query.or(`title.ilike.${keyword},description.ilike.${keyword}`);
    }

    // Filter by tags (array contains)
    if (dto.tags && dto.tags.length > 0) {
      // Use PostgreSQL array contains operator (@>)
      // For Supabase, we use cs (contains) filter
      query = query.contains('tags', dto.tags);
    }

    // Filter by accommodation options (array contains)
    if (dto.accommodation_options && dto.accommodation_options.length > 0) {
      query = query.contains('accommodation_options', dto.accommodation_options);
    }

    // Filter by food options (array contains)
    if (dto.food_options && dto.food_options.length > 0) {
      query = query.contains('food_options', dto.food_options);
    }

    const { data, error } = await query
      .select('*, event_teachers(user:profiles(id, first_name, last_name, photo_url))');

    if (error) {
      throw new Error(`Failed to fetch public events: ${error.message}`);
    }

    // Transform result to match Event interface structure for teachers
    const eventsWithTeachers = data?.map((event: any) => ({
      ...event,
      teachers: event.event_teachers?.map((et: any) => ({
        ...et,
        profiles: et.user
      })) || []
    })) || [];

    return eventsWithTeachers;
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

  /**
   * Create corresponding jam record when event with manage_participants is created
   * Called during event creation for type='jam' events with participant management
   * REVERSE SYNC: Event -> Jam direction (vs createEventFromJam which is Jam -> Event)
   */
  private async createJamFromEvent(
    event: any,
    dto: CreateEventDto,
    userId: string,
  ): Promise<any> {
    // Skip if already linked to a jam (prevents circular sync)
    if (event.source_jam_id) {
      return null;
    }

    const jamData = {
      owner_id: event.owner_id,
      name: event.title,
      location_text: event.location_text,
      location_lat: event.location_lat,
      location_lng: event.location_lng,
      gmaps_link: event.gmaps_link,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      description: event.description,
      status: event.status, // 'draft' on creation
      source_event_id: event.id, // Link back to event
      // Jam-specific fields from DTO
      capacity: dto.capacity ?? null,
      desired_bases_min: dto.desired_bases_min ?? null,
      desired_bases_max: dto.desired_bases_max ?? null,
      desired_flyers_min: dto.desired_flyers_min ?? null,
      desired_flyers_max: dto.desired_flyers_max ?? null,
      auto_promote: dto.auto_promote ?? true,
      public_participants: dto.public_participants ?? true,
      // Build location JSON object if coordinates available
      location:
        event.location_lat && event.location_lng
          ? {
              description: event.location_text,
              latitude: event.location_lat,
              longitude: event.location_lng,
              google_maps_url: event.gmaps_link,
            }
          : null,
    };

    const { data: jam, error } = await this.supabase
      .from('jams')
      .insert(jamData)
      .select()
      .single();

    if (error) {
      console.error('Failed to create jam from event:', error);
      // Non-throwing: event creation succeeds even if jam sync fails
      return null;
    }

    // Update event with source_jam_id for bidirectional linking
    await this.supabase
      .from('events')
      .update({ source_jam_id: jam.id })
      .eq('id', event.id);

    // Add owner as participant (mirrors JamsService.ensureOwnerParticipation pattern)
    // Get user's main_role from profile
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('main_role')
      .eq('id', userId)
      .maybeSingle();

    const role = profile?.main_role || 'both';

    await this.supabase.from('jam_participants').insert({
      jam_id: jam.id,
      user_id: userId,
      role,
      state: 'participant',
      source: 'owner',
    });

    return jam;
  }
}
