// Shared types for Event entity and operations

// Event type enum
export type EventType = 'jam' | 'class' | 'workshop' | 'convention';

// Event status enum
export type EventStatus = 'draft' | 'published' | 'archived';

// Base event interface
export interface Event {
  id: string;
  owner_id: string;
  type: EventType;

  // Required fields
  title: string;
  location_text: string;
  starts_at: string;
  ends_at: string;

  // Optional shared fields
  description?: string;
  price?: string;
  external_link?: string;
  organizer_contact?: string;

  // Optional location fields
  location_lat?: number;
  location_lng?: number;
  location_place_id?: string;
  gmaps_link?: string;

  // Status
  status: EventStatus;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Event with organizer details (for list views)
export interface EventWithOrganizer extends Event {
  organizer: {
    id: string;
    name: string;
    email: string;
    photo_url?: string;
  };
}

// Event organizer interface
export interface EventOrganizer {
  id: string;
  event_id: string;
  user_id: string;
  added_by: string;
  created_at: string;

  // Joined user profile
  user?: {
    id: string;
    name: string;
    email: string;
    photo_url?: string;
  };
}

// DTOs (mirror backend DTOs)
export interface CreateEventDto {
  type: EventType;
  title: string;
  location_text: string;
  starts_at: string;
  ends_at: string;
  description?: string;
  price?: string;
  external_link?: string;
  organizer_contact?: string;
  location_lat?: number;
  location_lng?: number;
  location_place_id?: string;
  gmaps_link?: string;
}

export interface UpdateEventDto extends Partial<CreateEventDto> {
  status?: EventStatus;
}

export interface AddCoOrganizerDto {
  userId: string;
}
