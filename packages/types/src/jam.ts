// Shared types for Jam entity and operations

export interface JamLocation {
  description: string;
  place_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  google_maps_url?: string | null;
}

export interface CreateJamDto {
  name: string;
  location: JamLocation;
  starts_at: string;
  ends_at: string;
  description?: string;
  capacity?: number;
  desired_bases_min?: number;
  desired_bases_max?: number;
  desired_flyers_min?: number;
  desired_flyers_max?: number;
  auto_promote?: boolean;
  public_participants?: boolean;
  telegram_notifications_enabled?: boolean;
}

export interface UpdateJamDto {
  name?: string;
  location?: JamLocation;
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
  public_participants?: boolean;
  telegram_notifications_enabled?: boolean;
}

export interface JamResponse {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  location: JamLocation | null;
  location_text: string | null;
  gmaps_link: string | null;
  location_lat: number | null;
  location_lng: number | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  desired_bases_min: number | null;
  desired_bases_max: number | null;
  desired_flyers_min: number | null;
  desired_flyers_max: number | null;
  auto_promote: boolean | null;
  public_participants: boolean | null;
  telegram_notifications_enabled: boolean | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  participant_count?: number;
  waiting_count?: number;
}

export enum JamEmailAudience {
  ALL = 'all',
  PARTICIPANTS = 'participants',
  WAITING = 'waiting',
}

export interface SendJamEmailDto {
  audience: JamEmailAudience;
  subject: string;
  htmlContent: string;
  textContent: string;
  previewText?: string;
}

export interface TestJamEmailDto {
  recipientEmail: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  previewText?: string;
}
