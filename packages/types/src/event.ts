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
  image_url?: string;
  price?: string;
  external_link?: string;
  cta_text?: string;
  organizer_contact?: string;

  // Optional location fields
  location_lat?: number;
  location_lng?: number;
  location_place_id?: string;
  gmaps_link?: string;

  // Status
  status: EventStatus;

  // Filter fields (ARRAY columns)
  tags?: string[];
  accommodation_options?: string[];
  food_options?: string[];

  // Recurrence fields
  recurrence_rule?: string | null;
  recurrence_dtstart?: string | null;
  recurrence_until?: string | null;
  parent_event_id?: string | null;
  source_jam_id?: string | null;

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
    is_super_admin?: boolean;
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
    first_name: string | null;
    last_name: string | null;
    email: string;
    photo_url?: string;
  };
}

// Location DTO to match backend structure
export interface LocationDto {
  description: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
}

// DTOs (mirror backend DTOs)
export interface CreateEventDto {
  type: EventType;
  title: string;
  location_text: string | LocationDto;
  starts_at: string;
  ends_at: string;
  description?: string;
  image_url?: string;
  price?: string;
  external_link?: string;
  cta_text?: string;
  organizer_contact?: string;
  tags?: string[];
  location_lat?: number;
  location_lng?: number;
  location_place_id?: string;
  gmaps_link?: string;
  recurrence_rule?: string;
  recurrence_dtstart?: string;
  recurrence_until?: string;
}

export interface UpdateEventDto extends Partial<CreateEventDto> {
  status?: EventStatus;
}

export interface AddCoOrganizerDto {
  userId: string;
}

export interface UpdateOccurrenceDto {
  is_cancelled?: boolean;
  override_title?: string;
  override_location_text?: string;
  override_starts_at?: string;
  override_ends_at?: string;
  override_description?: string;
}

// Event teacher interface
export interface EventTeacher {
  id: string;
  event_id: string;
  user_id: string;
  role?: string | null;
  created_at: string;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email?: string;
    photo_url?: string;
  };
}

export interface AddTeacherDto {
  user_id: string;
  role?: string;
}
