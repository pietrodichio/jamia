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
import { SearchEventsDto } from './dto/search-events.dto';
import { AuditService } from '../audit/audit.service';

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

  async createEvent(ownerId: string, createEventDto: CreateEventDto) {
    // Validate dates
    const start = new Date(createEventDto.starts_at);
    const end = new Date(createEventDto.ends_at);

    if (end <= start) {
      throw new BadRequestException('End date must be after start date');
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
}
