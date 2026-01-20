import { apiClient } from './client';
import type {
  UpdateProfileDto,
  ProfileResponse,
  UserSearchResult,
} from '@jamia/types/profile';

// Re-export for backward compatibility
export type {
  UpdateProfileDto,
  ProfileResponse as Profile,
  UserSearchResult,
};

export const profilesApi = {
  getProfile: async (profileId: string): Promise<ProfileResponse> => {
    const response = await apiClient.get(`/profiles/${profileId}`);
    return response.data;
  },

  updateProfile: async (profileId: string, data: UpdateProfileDto): Promise<ProfileResponse> => {
    const response = await apiClient.patch(`/profiles/${profileId}`, data);
    return response.data;
  },

  searchUsers: async (
    query: string,
    limit: number = 10,
    jamId?: string,
  ): Promise<UserSearchResult[]> => {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    if (jamId) {
      params.append('jamId', jamId);
    }
    const response = await apiClient.get(`/profiles/search?${params.toString()}`);
    return response.data;
  },
};
