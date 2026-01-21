import { apiClient } from './client';
import type {
  Event,
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
};
