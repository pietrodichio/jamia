// Shared types for Participant entity and operations

export type ParticipantRole = 'base' | 'flyer' | 'both';
export type ParticipantState = 'participant' | 'waiting' | 'cancelled';

export interface JoinJamDto {
  role: ParticipantRole;
}

export interface AddParticipantDto {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: ParticipantRole;
}

export interface UpdateRoleDto {
  role: 'base' | 'flyer';
}

export interface ParticipantResponse {
  id: string;
  jam_id: string;
  user_id: string;
  role: ParticipantRole;
  state: ParticipantState;
  source: string;
  joined_at: string;
  promoted_at: string | null;
  cancelled_at: string | null;
  profiles?: {
    id?: string;
    first_name?: string | null;
    last_name?: string | null;
    main_role?: ParticipantRole | null;
    phone?: string | null;
    photo_url?: string | null;
  } | null;
}

export interface ParticipantListResponse {
  participants: ParticipantResponse[];
  waitingList: ParticipantResponse[];
  cancelledList: ParticipantResponse[];
}

export interface PublicParticipantResponse {
  id: string;
  role: ParticipantRole;
  state: ParticipantState;
  joined_at: string;
  profiles: {
    first_name: string | null;
    last_name: string;
    photo_url: string | null;
  } | null;
}
