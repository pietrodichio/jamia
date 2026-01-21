import { apiClient } from './client';
import type { EventTeacher, AddTeacherDto } from '@jamia/types/event';

export const teachersApi = {
  // Add teacher to event
  async addTeacher(
    eventId: string,
    data: AddTeacherDto
  ): Promise<EventTeacher> {
    const response = await apiClient.post<EventTeacher>(
      `/events/${eventId}/teachers`,
      data
    );
    return response.data;
  },

  // Get event's teachers
  async listTeachers(eventId: string): Promise<EventTeacher[]> {
    const response = await apiClient.get<EventTeacher[]>(
      `/events/${eventId}/teachers`
    );
    return response.data;
  },

  // Remove teacher
  async removeTeacher(
    eventId: string,
    teacherId: string
  ): Promise<void> {
    await apiClient.delete(`/events/${eventId}/teachers/${teacherId}`);
  },
};
