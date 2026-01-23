import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { supabase } from '@/integrations/supabase/client';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  draftId: string | undefined;
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
  formData: Record<string, any>,
  eventId?: string
): UseAutoSaveReturn {
  const [debouncedFormData] = useDebounce(formData, 1000); // 1 second delay
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [draftId, setDraftId] = useState<string | undefined>(eventId);

  useEffect(() => {
    async function saveDraft() {
      // Don't save if title is empty (blank form)
      if (!debouncedFormData.title || debouncedFormData.title.trim() === '') {
        return;
      }

      setSaveStatus('saving');

      try {
        // Prepare data for upsert - only include defined values
        const draftData: Record<string, any> = {
          title: debouncedFormData.title,
          type: debouncedFormData.type || 'jam',
          status: 'draft',
          updated_at: new Date().toISOString(),
        };

        // Add optional fields only if they exist
        if (debouncedFormData.description) {
          draftData.description = debouncedFormData.description;
        }
        if (debouncedFormData.location) {
          draftData.location_text = debouncedFormData.location;
        }
        if (debouncedFormData.date) {
          // Convert date to ISO string if it's a Date object
          draftData.starts_at = debouncedFormData.date instanceof Date
            ? debouncedFormData.date.toISOString()
            : debouncedFormData.date;
        }
        if (debouncedFormData.end_date) {
          draftData.ends_at = debouncedFormData.end_date instanceof Date
            ? debouncedFormData.end_date.toISOString()
            : debouncedFormData.end_date;
        }
        if (debouncedFormData.price !== undefined && debouncedFormData.price !== null) {
          draftData.price = String(debouncedFormData.price);
        }
        if (debouncedFormData.externalLink) {
          draftData.external_link = debouncedFormData.externalLink;
        }
        if (debouncedFormData.ctaText) {
          draftData.cta_text = debouncedFormData.ctaText;
        }
        if (debouncedFormData.capacity) {
          draftData.capacity = Number(debouncedFormData.capacity);
        }
        if (debouncedFormData.visibility) {
          draftData.visibility = debouncedFormData.visibility;
        }

        // Include ID only if we have an existing draft
        if (draftId) {
          draftData.id = draftId;
        }

        const { data, error } = await supabase
          .from('events')
          .upsert(draftData, {
            onConflict: 'id', // Update existing draft by ID
            ignoreDuplicates: false, // Merge with existing
          })
          .select()
          .single();

        if (error) throw error;

        setSaveStatus('saved');

        // Store the draft ID for subsequent saves
        if (data?.id && !draftId) {
          setDraftId(data.id);
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveStatus('error');
      }
    }

    saveDraft();
  }, [debouncedFormData, draftId]);

  return {
    saveStatus,
    draftId,
  };
}
