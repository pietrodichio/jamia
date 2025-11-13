import { apiClient, publicApiClient } from './client';

export interface ParticipantProfile {
  name?: string;
  first_name?: string;
  last_name?: string;
  main_role?: string;
  phone?: string;
  photo_url?: string;
}

export interface Participant {
  id: string;
  jam_id: string;
  user_id: string;
  role: 'base' | 'flyer' | 'both';
  state: 'participant' | 'waiting' | 'cancelled';
  joined_at?: string;
  promoted_at?: string;
  cancelled_at?: string;
  source?: string;
  invited?: boolean;
  profiles?: ParticipantProfile;
}

export interface JoinJamDto {
  role: 'base' | 'flyer' | 'both';
}

export interface ManagedParticipantDto {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: 'base' | 'flyer' | 'both';
}

export interface ParticipantsResponse {
  participants: Participant[];
  waitingList: Participant[];
}

export const participantsApi = {
  getJamParticipants: async (jamId: string): Promise<ParticipantsResponse> => {
    const response = await apiClient.get(`/participants/jams/${jamId}`);
    return response.data;
  },

  getUserParticipation: async (jamId: string): Promise<Participant | null> => {
    const response = await apiClient.get(`/participants/jams/${jamId}/my-participation`);
    return response.data;
  },

  joinJam: async (jamId: string, data: JoinJamDto): Promise<Participant> => {
    const response = await apiClient.post(`/participants/jams/${jamId}`, data);
    return response.data;
  },

  addParticipantAsManager: async (
    jamId: string,
    data: ManagedParticipantDto
  ): Promise<Participant> => {
    const response = await apiClient.post(`/participants/jams/${jamId}/manage`, data);
    return response.data;
  },

  cancelParticipation: async (participantId: string): Promise<Participant> => {
    const response = await apiClient.patch(`/participants/${participantId}/cancel`);
    return response.data;
  },

  removeParticipant: async (participantId: string): Promise<void> => {
    await apiClient.delete(`/participants/${participantId}`);
  },

  getPublicJamParticipants: async (jamId: string): Promise<{ participants: Participant[] }> => {
    const response = await publicApiClient.get(`/public/jams/${jamId}/participants`);
    return response.data;
  },
};
