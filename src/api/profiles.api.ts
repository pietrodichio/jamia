import { apiClient } from './client';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  city?: string;
  main_role: 'base' | 'flyer' | 'both';
  photo_url?: string;
  verified?: boolean;
  created_at?: string;
}

export interface UpdateProfileDto {
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  city?: string;
  main_role?: 'base' | 'flyer' | 'both';
  photo_url?: string;
}

export const profilesApi = {
  getProfile: async (profileId: string): Promise<Profile> => {
    const response = await apiClient.get(`/profiles/${profileId}`);
    return response.data;
  },

  updateProfile: async (profileId: string, data: UpdateProfileDto): Promise<Profile> => {
    const response = await apiClient.patch(`/profiles/${profileId}`, data);
    return response.data;
  },

  searchUsers: async (query: string, limit: number = 10): Promise<{ id: string; name: string; email: string }[]> => {
    const response = await apiClient.get(`/profiles/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  },
};

