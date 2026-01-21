import { apiClient } from './client';
import type {
  EventOrganizer,
  AddCoOrganizerDto,
} from '@jamia/types/event';

export const eventOrganizersApi = {
  // Add co-organizer to event
  async addCoOrganizer(
    eventId: string,
    data: AddCoOrganizerDto
  ): Promise<EventOrganizer> {
    const response = await apiClient.post<EventOrganizer>(
      `/events/${eventId}/organizers`,
      data
    );
    return response.data;
  },

  // Get event's co-organizers
  async getCoOrganizers(eventId: string): Promise<EventOrganizer[]> {
    const response = await apiClient.get<EventOrganizer[]>(
      `/events/${eventId}/organizers`
    );
    return response.data;
  },

  // Remove co-organizer
  async removeCoOrganizer(
    eventId: string,
    organizerId: string
  ): Promise<void> {
    await apiClient.delete(`/events/${eventId}/organizers/${organizerId}`);
  },
};
