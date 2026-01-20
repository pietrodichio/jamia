import { apiClient, publicApiClient } from './client';
import type {
  JoinJamDto,
  AddParticipantDto,
  ParticipantResponse,
  ParticipantListResponse,
  PublicParticipantResponse,
} from '@jamia/types/participant';

// Re-export for backward compatibility
export type {
  JoinJamDto,
  AddParticipantDto as ManagedParticipantDto,
  ParticipantResponse as Participant,
  ParticipantListResponse as ParticipantsResponse,
};

export type ParticipantUpdatableRole = 'base' | 'flyer';

export const participantsApi = {
  getJamParticipants: async (jamId: string): Promise<ParticipantListResponse> => {
    const response = await apiClient.get(`/participants/jams/${jamId}`);
    return response.data;
  },

  updateRole: async (
    participantId: string,
    role: ParticipantUpdatableRole
  ): Promise<ParticipantResponse> => {
    const response = await apiClient.patch(
      `/participants/${participantId}/role`,
      { role }
    );
    return response.data;
  },

  getUserParticipation: async (jamId: string): Promise<ParticipantResponse | null> => {
    const response = await apiClient.get(`/participants/jams/${jamId}/my-participation`);
    return response.data;
  },

  joinJam: async (jamId: string, data: JoinJamDto): Promise<ParticipantResponse> => {
    const response = await apiClient.post(`/participants/jams/${jamId}`, data);
    return response.data;
  },

  addParticipantAsManager: async (
    jamId: string,
    data: AddParticipantDto
  ): Promise<ParticipantResponse> => {
    const response = await apiClient.post(`/participants/jams/${jamId}/manage`, data);
    return response.data;
  },

  cancelParticipation: async (participantId: string): Promise<ParticipantResponse> => {
    const response = await apiClient.patch(`/participants/${participantId}/cancel`);
    return response.data;
  },

  removeParticipant: async (participantId: string): Promise<void> => {
    await apiClient.delete(`/participants/${participantId}`);
  },

  promoteParticipant: async (participantId: string): Promise<ParticipantResponse> => {
    const response = await apiClient.patch(`/participants/${participantId}/promote`);
    return response.data;
  },

  getPublicJamParticipants: async (jamId: string): Promise<{ participants: PublicParticipantResponse[] }> => {
    const response = await publicApiClient.get(`/public/jams/${jamId}/participants`);
    return response.data;
  },
};
