import { apiClient, publicApiClient } from './client';
import type {
  JamLocation,
  CreateJamDto,
  UpdateJamDto,
  JamResponse,
  JamEmailAudience,
  SendJamEmailDto,
  TestJamEmailDto,
} from '@jamia/types/jam';

// Re-export for backward compatibility
export type {
  JamLocation,
  CreateJamDto,
  UpdateJamDto,
  JamResponse as Jam,
  JamEmailAudience,
  SendJamEmailDto as SendJamEmailPayload,
  TestJamEmailDto as TestJamEmailPayload,
};

export interface SendJamEmailResponse {
  recipientCount: number;
  audience: JamEmailAudience;
}

export const jamsApi = {
  getPublishedJams: async (): Promise<JamResponse[]> => {
    const response = await apiClient.get('/jams');
    return response.data;
  },

  getMyJams: async (): Promise<JamResponse[]> => {
    const response = await apiClient.get('/jams/my');
    return response.data;
  },

  getParticipatingJams: async (): Promise<JamResponse[]> => {
    const response = await apiClient.get('/jams/participating');
    return response.data;
  },

  getJamById: async (jamId: string): Promise<JamResponse> => {
    const response = await apiClient.get(`/jams/${jamId}`);
    return response.data;
  },

  getPublicJamById: async (jamId: string): Promise<JamResponse> => {
    const response = await publicApiClient.get(`/public/jams/${jamId}`);
    return response.data;
  },

  createJam: async (data: CreateJamDto): Promise<JamResponse> => {
    const response = await apiClient.post('/jams', data);
    return response.data;
  },

  updateJam: async (jamId: string, data: UpdateJamDto): Promise<JamResponse> => {
    const response = await apiClient.patch(`/jams/${jamId}`, data);
    return response.data;
  },

  publishJam: async (jamId: string): Promise<JamResponse> => {
    const response = await apiClient.post(`/jams/${jamId}/publish`);
    return response.data;
  },

  deleteJam: async (jamId: string): Promise<void> => {
    await apiClient.delete(`/jams/${jamId}`);
  },

  cloneJam: async (jamId: string): Promise<JamResponse> => {
    const response = await apiClient.post(`/jams/${jamId}/clone`);
    return response.data;
  },

  sendJamEmail: async (
    jamId: string,
    payload: SendJamEmailDto
  ): Promise<SendJamEmailResponse> => {
    const response = await apiClient.post(`/jams/${jamId}/email`, payload);
    return response.data;
  },

  sendJamEmailTest: async (
    jamId: string,
    payload: TestJamEmailDto
  ): Promise<{ recipientCount: number }> => {
    const response = await apiClient.post(`/jams/${jamId}/email/test`, payload);
    return response.data;
  },
};
