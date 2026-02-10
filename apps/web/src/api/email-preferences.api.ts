import { apiClient } from './client';
import type {
  UpdateEmailPreferencesDto,
  EmailPreferencesResponse,
} from '@jamia/types/email-preferences';

export const emailPreferencesApi = {
  getPreferences: async (): Promise<EmailPreferencesResponse> => {
    const response = await apiClient.get('/email-preferences');
    return response.data;
  },

  updatePreferences: async (dto: UpdateEmailPreferencesDto): Promise<EmailPreferencesResponse> => {
    const response = await apiClient.patch('/email-preferences', dto);
    return response.data;
  },
};
