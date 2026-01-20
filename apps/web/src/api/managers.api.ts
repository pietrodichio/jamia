import { apiClient } from './client';

export interface JamManager {
  id: string;
  jam_id: string;
  user_id: string;
  added_by: string;
  created_at: string;
  profiles: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string;
  };
}

export const managersApi = {
  async getJamManagers(jamId: string): Promise<JamManager[]> {
    const response = await apiClient.get(`/jams/${jamId}/managers`);
    return response.data;
  },

  async getJamManagersBatch(jamIds: string[]): Promise<Record<string, JamManager[]>> {
    const response = await apiClient.post('/jams/managers/batch', {
      jamIds,
    });
    return response.data;
  },

  async addJamManager(jamId: string, userId: string): Promise<JamManager> {
    const response = await apiClient.post(`/jams/${jamId}/managers`, {
      userId,
    });
    return response.data;
  },

  async removeJamManager(jamId: string, managerUserId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/jams/${jamId}/managers/${managerUserId}`);
    return response.data;
  },
};
