import { useState, useEffect, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import { useMutation } from '@tanstack/react-query';
import { eventsApi } from '@/api/events.api';
import type { CreateEventDto, EventType } from '@jamia/types/event';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  draftId: string | undefined;
}

interface AutoSaveFormData {
  title?: string;
  type?: EventType;
  description?: string;
  organizerContact?: string;
  price?: number | string | null;
  externalLink?: string;
  ctaText?: string;
  image_url?: string;
  tags?: string[];
  location?: {
    description?: string;
    googleMapsUrl?: string;
    latitude?: number;
    longitude?: number;
    place_id?: string;
  };
  date?: Date | string;
  time?: string;
  end_date?: Date | string;
  end_time?: string;
  recurrence?: {
    rule?: string;
    dtstart?: string;
    until?: string;
  };
  status?: string;
  // Jam management fields (form uses camelCase, will be mapped to snake_case for DTO)
  manageParticipants?: boolean;
  capacity?: number;
  desired_bases_min?: number;
  desired_bases_max?: number;
  desired_flyers_min?: number;
  desired_flyers_max?: number;
  auto_promote?: boolean;
  public_participants?: boolean;
  // Allow other fields
  [key: string]: unknown;
}

/**
 * Maps form data to CreateEventDto structure
 */
function mapFormToDto(formData: AutoSaveFormData): Partial<CreateEventDto> {
  const dto: Partial<CreateEventDto> = {
    title: formData.title,
    type: formData.type || 'jam',
    description: formData.description || undefined,
    organizer_contact: formData.organizerContact === ''
      ? ''
      : formData.organizerContact || undefined,
    price: formData.price !== undefined && formData.price !== null ? String(formData.price) : undefined,
    external_link: formData.externalLink || undefined,
    cta_text: formData.ctaText || undefined,
    image_url: formData.image_url || undefined,
    tags: formData.tags && formData.tags.length > 0 ? formData.tags : undefined,
  };

  // Map location fields - send as nested object to satisfy backend validation
  if (formData.location?.description) {
    // ALWAYS send as object to satisfy validation rule: "must be either object or array"
    // Even if we only have description, we construct the object.
    (dto as any).location_text = {
      description: formData.location.description,
      // Pass undefined for missing fields - key presence with undefined value is fine for optional fields
      latitude: formData.location.latitude,
      longitude: formData.location.longitude,
      googleMapsUrl: formData.location.googleMapsUrl,
    };
    
    // Keep location_place_id if available as it's not in LocationDto
    if (formData.location.place_id) {
      dto.location_place_id = formData.location.place_id;
    }
  }

  // Map dates
  if (formData.date) {
    if (formData.time) {
      // Combine date and time
      const startDateTime = new Date(formData.date);
      const [hours, minutes] = formData.time.split(':').map(Number);
      startDateTime.setHours(hours, minutes);
      dto.starts_at = startDateTime.toISOString();
    } else {
      dto.starts_at = formData.date instanceof Date 
        ? formData.date.toISOString() 
        : String(formData.date);
    }
  }

  if (formData.end_date) {
    if (formData.end_time) {
      // Combine end date and time
      const endDateTime = new Date(formData.end_date);
      const [hours, minutes] = formData.end_time.split(':').map(Number);
      endDateTime.setHours(hours, minutes);
      dto.ends_at = endDateTime.toISOString();
    } else {
      dto.ends_at = formData.end_date instanceof Date 
        ? formData.end_date.toISOString() 
        : String(formData.end_date);
    }
  }

  // Map recurrence
  if (formData.recurrence) {
    dto.recurrence_rule = formData.recurrence.rule || undefined;
    dto.recurrence_dtstart = formData.recurrence.dtstart || undefined;
    dto.recurrence_until = formData.recurrence.until || undefined;
  }

  // Map jam management fields - only include if type='jam' AND manageParticipants=true
  if (formData.type === 'jam' && formData.manageParticipants) {
    dto.manage_participants = true;
    dto.capacity = formData.capacity;
    dto.desired_bases_min = formData.desired_bases_min;
    dto.desired_bases_max = formData.desired_bases_max;
    dto.desired_flyers_min = formData.desired_flyers_min;
    dto.desired_flyers_max = formData.desired_flyers_max;
    dto.auto_promote = formData.auto_promote ?? true;
    dto.public_participants = formData.public_participants ?? true;
  }

  // Clean undefined values (except inside location_text object which we handled above)
  (Object.keys(dto) as Array<keyof typeof dto>).forEach(key => {
    if (dto[key] === undefined) {
      delete dto[key];
    }
  });

  return dto;
}

/**
 * Auto-save hook for event creation forms
 * Debounces form data and upserts to events table as draft
 *
 * @param formData - Partial event form data to auto-save
 * @param eventId - Optional existing event ID for updates
 * @returns saveStatus and draftId for UI feedback and subsequent saves
 */
export function useAutoSave(
  formData: Record<string, unknown>, // Use generic type for consumer, but cast internally
  eventId?: string
): UseAutoSaveReturn {
  const [debouncedFormData] = useDebounce(formData, 1500); // 1.5 second delay
  const [draftId, setDraftId] = useState<string | undefined>(eventId);
  const lastSavedDataRef = useRef<string>('');
  
  // Use mutation for saving
  const { mutate, status } = useMutation({
    mutationFn: async (data: Partial<CreateEventDto> & { id?: string; status?: string }) => {
      // If we have an ID, use update, otherwise use saveDraft
      if (data.id) {
         // We must separate the ID from the DTO for the update call
         const { id, ...updateData } = data;
         // Ensure status is at least draft if not set
         if (!updateData.status) {
            updateData.status = 'draft';
         }
         return eventsApi.updateEvent(id, updateData as any);
      } else {
        return eventsApi.saveDraft(data);
      }
    },
    onSuccess: (data) => {
      if (data?.id && !draftId) {
        setDraftId(data.id);
      }
    },
    onError: (error) => {
      console.error('Auto-save failed:', error);
    }
  });

  useEffect(() => {
    const typedFormData = debouncedFormData as AutoSaveFormData;

    // Don't save if title is empty (blank form)
    if (!typedFormData.title || typedFormData.title.trim() === '') {
      return;
    }

    const dto = mapFormToDto(typedFormData);
    
    // We add status to the payload, but CreateEventDto doesn't strictly have it
    // We intersect with { id?: string; status?: string } to allow it
    const savePayload: Partial<CreateEventDto> & { id?: string; status?: string } = {
      ...dto,
      status: typedFormData.status || 'draft'
    };

    if (draftId) {
      savePayload.id = draftId;
    }

    // Deep comparison to prevent redundant saves
    const currentPayloadString = JSON.stringify(savePayload);

    if (currentPayloadString !== lastSavedDataRef.current) {
      lastSavedDataRef.current = currentPayloadString;
      mutate(savePayload);
    }
  }, [debouncedFormData, draftId, mutate]);

  // Map react-query status to our SaveStatus
  const saveStatus: SaveStatus = 
    status === 'pending' ? 'saving' :
    status === 'success' ? 'saved' :
    status === 'error' ? 'error' : 'idle';

  return {
    saveStatus,
    draftId,
  };
}
