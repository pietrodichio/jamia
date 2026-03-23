import { apiClient } from './client';

export interface TelegramLinkResponse {
  token: string;
  botLink: string;
  expiresIn: number;
}

export const telegramApi = {
  generateLink: async (): Promise<TelegramLinkResponse> => {
    const response = await apiClient.post('/telegram/generate-link');
    return response.data;
  },

  unlinkAccount: async (): Promise<{ message: string }> => {
    const response = await apiClient.delete('/telegram/unlink');
    return response.data;
  },
};
