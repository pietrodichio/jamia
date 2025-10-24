import { apiClient } from './client';

export interface Jam {
  id: string;
  owner_id: string;
  name: string;
  location_text: string;
  gmaps_link?: string;
  starts_at: string;
  ends_at: string;
  description?: string;
  capacity?: number;
  desired_bases_min?: number;
  desired_bases_max?: number;
  desired_flyers_min?: number;
  desired_flyers_max?: number;
  status: 'draft' | 'published' | 'archived';
  auto_promote?: boolean;
  created_at?: string;
  updated_at?: string;
  participant_count?: number;
  waiting_count?: number;
}

export interface CreateJamDto {
  name: string;
  location_text: string;
  gmaps_link?: string;
  starts_at: string;
  ends_at: string;
  description?: string;
  capacity?: number;
  desired_bases_min?: number;
  desired_bases_max?: number;
  desired_flyers_min?: number;
  desired_flyers_max?: number;
  auto_promote?: boolean;
}

export interface UpdateJamDto {
  name?: string;
  location_text?: string;
  gmaps_link?: string;
  starts_at?: string;
  ends_at?: string;
  description?: string;
  capacity?: number;
  desired_bases_min?: number;
  desired_bases_max?: number;
  desired_flyers_min?: number;
  desired_flyers_max?: number;
  auto_promote?: boolean;
  status?: 'draft' | 'published' | 'archived';
}

export const jamsApi = {
  getPublishedJams: async (): Promise<Jam[]> => {
    const response = await apiClient.get('/jams');
    return response.data;
  },

  getMyJams: async (): Promise<Jam[]> => {
    const response = await apiClient.get('/jams/my');
    return response.data;
  },

  getParticipatingJams: async (): Promise<Jam[]> => {
    const response = await apiClient.get('/jams/participating');
    return response.data;
  },

  getJamById: async (jamId: string): Promise<Jam> => {
    const response = await apiClient.get(`/jams/${jamId}`);
    return response.data;
  },

  createJam: async (data: CreateJamDto): Promise<Jam> => {
    const response = await apiClient.post('/jams', data);
    return response.data;
  },

  updateJam: async (jamId: string, data: UpdateJamDto): Promise<Jam> => {
    const response = await apiClient.patch(`/jams/${jamId}`, data);
    return response.data;
  },

  publishJam: async (jamId: string): Promise<Jam> => {
    const response = await apiClient.post(`/jams/${jamId}/publish`);
    return response.data;
  },

  deleteJam: async (jamId: string): Promise<void> => {
    await apiClient.delete(`/jams/${jamId}`);
  },

  cloneJam: async (jamId: string): Promise<Jam> => {
    const response = await apiClient.post(`/jams/${jamId}/clone`);
    return response.data;
  },
};

