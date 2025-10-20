import { apiClient } from './client';

export interface Profile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  bio?: string;
  city?: string;
  main_role: 'base' | 'flyer' | 'both';
  photo_url?: string;
  verified?: boolean;
  created_at?: string;
}

export interface UpdateProfileDto {
  name?: string;
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
};

