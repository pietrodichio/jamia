import { apiClient, publicApiClient } from './client';
import type {
  Event,
  EventType,
  EventWithOrganizer,
  CreateEventDto,
  UpdateEventDto,
  UpdateOccurrenceDto,
} from '@jamia/types/event';

export const eventsApi = {
  // Create event
  async createEvent(data: CreateEventDto): Promise<Event> {
    const response = await apiClient.post<Event>('/events', data);
    return response.data;
  },

  // Get user's owned events
  async getMyEvents(): Promise<Event[]> {
    const response = await apiClient.get<Event[]>('/events/my-events');
    return response.data;
  },

  // Get events user co-organizes
  async getCoOrganizedEvents(): Promise<Event[]> {
    const response = await apiClient.get<Event[]>('/events/co-organized');
    return response.data;
  },

  // Get single event by ID
  async getEventById(eventId: string): Promise<Event> {
    const response = await apiClient.get<Event>(`/events/${eventId}`);
    return response.data;
  },

  // Get single event with organizer details
  async getEvent(eventId: string): Promise<EventWithOrganizer> {
    const response = await apiClient.get<EventWithOrganizer>(`/events/${eventId}`);
    return response.data;
  },

  // Update event
  async updateEvent(eventId: string, data: UpdateEventDto): Promise<Event> {
    const response = await apiClient.patch<Event>(`/events/${eventId}`, data);
    return response.data;
  },

  // Save event draft (create or update)
  async saveDraft(data: Partial<CreateEventDto> & { id?: string }): Promise<Event> {
    const response = await apiClient.post<Event>('/events/draft', data);
    return response.data;
  },

  // Publish event (shortcut for status update)
  async publishEvent(eventId: string): Promise<Event> {
    const response = await apiClient.patch<Event>(`/events/${eventId}/publish`);
    return response.data;
  },

  // Delete event
  async deleteEvent(eventId: string): Promise<void> {
    await apiClient.delete(`/events/${eventId}`);
  },

  // Search events by location
  async searchEvents(params: {
    lng: number;
    lat: number;
    radius?: number;
    types?: EventType[];
    dateFrom?: string;
    dateTo?: string;
    keyword?: string;
    tags?: string[];
    teacher_id?: string;
  }): Promise<(Event & { distance_meters: number })[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('lng', params.lng.toString());
    searchParams.append('lat', params.lat.toString());

    if (params.radius) searchParams.append('radius', (params.radius * 1000).toString()); // Convert km to meters
    if (params.types?.length) params.types.forEach(t => searchParams.append('types', t));
    if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.append('dateTo', params.dateTo);
    if (params.keyword) searchParams.append('keyword', params.keyword);
    if (params.tags?.length) params.tags.forEach(tag => searchParams.append('tags', tag));
    if (params.teacher_id) searchParams.append('teacher_id', params.teacher_id);

    const response = await apiClient.get(`/events/search?${searchParams.toString()}`);
    return response.data;
  },

  // Get upcoming published events (public)
  async getPublicEvents(params?: {
    startsAt?: string;
    limit?: number;
    types?: EventType[];
    dateFrom?: string;
    dateTo?: string;
    keyword?: string;
    tags?: string[];
  }): Promise<Event[]> {
    const searchParams = new URLSearchParams();
    if (params?.startsAt) searchParams.append('startsAt', params.startsAt);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.types?.length) {
      params.types.forEach(t => searchParams.append('types', t));
    }
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo);
    if (params?.keyword) searchParams.append('keyword', params.keyword);
    if (params?.tags?.length) {
      params.tags.forEach(tag => searchParams.append('tags', tag));
    }

    const query = searchParams.toString();
    const response = await publicApiClient.get<Event[]>(
      query ? `/events/public?${query}` : '/events/public',
    );
    return response.data;
  },

  // Update single occurrence
  async updateOccurrence(
    eventId: string,
    originalStart: string,
    dto: UpdateOccurrenceDto
  ): Promise<any> {
    const response = await apiClient.patch(
      `/events/${eventId}/occurrences/${originalStart}`,
      dto
    );
    return response.data;
  },

  // Update all future occurrences (series split)
  async updateFutureOccurrences(
    eventId: string,
    fromDate: string,
    dto: UpdateEventDto
  ): Promise<{ truncatedSeriesId: string; newSeriesId: string }> {
    const response = await apiClient.patch(
      `/events/${eventId}/future/${fromDate}`,
      dto
    );
    return response.data;
  },
};
