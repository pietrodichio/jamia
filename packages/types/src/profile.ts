// Shared types for Profile entity and operations

import type { ParticipantRole } from './participant';

export interface UpdateProfileDto {
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  city?: string;
  main_role?: ParticipantRole;
  photo_url?: string;
}

export interface ProfileResponse {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  bio: string | null;
  city: string | null;
  main_role: ParticipantRole | null;
  photo_url: string | null;
  telegram_chat_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
}
