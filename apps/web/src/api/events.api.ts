import { apiClient } from './client';
import type {
  Event,
  EventType,
  EventWithOrganizer,
  CreateEventDto,
  UpdateEventDto,
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
    accommodation_options?: string[];
    food_options?: string[];
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
    if (params.accommodation_options?.length) params.accommodation_options.forEach(opt => searchParams.append('accommodation_options', opt));
    if (params.food_options?.length) params.food_options.forEach(opt => searchParams.append('food_options', opt));

    const response = await apiClient.get(`/events/search?${searchParams.toString()}`);
    return response.data;
  },
};
