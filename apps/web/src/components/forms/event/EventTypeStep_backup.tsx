import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { DescriptionEditor } from '@/components/jams/DescriptionEditor';
import { LocationInput } from '@/components/jams/LocationInput';
import { parseGoogleMapsUrl } from '@/components/jams/utils/google-maps';
import type { EventFormData } from '@/hooks/useEventWizard';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { JamParticipantFields } from './JamParticipantFields';
import { EVENT_TAG_OPTIONS } from '@/lib/event-tags';
import { EventOrganizerFields } from './EventOrganizerFields';

interface EventTypeStepProps {
  form: UseFormReturn<EventFormData>;
}

export function EventTypeStep({ form }: EventTypeStepProps) {
  const { t } = useTranslation(['common', 'events', 'forms']);

  // Watch event type for conditional fields
  const eventType = form.watch('type');
  const locationDescription = form.watch('location.description');
  const currentMapsUrl = form.watch('location.googleMapsUrl');

  // Google Maps autocomplete state
  const [placePredictions, setPlacePredictions] = useState<any[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const lastPredictionRequestId = useRef(0);
  const predictionsTimeout = useRef<NodeJS.Timeout | null>(null);
  const suppressNextPredictions = useRef(false);

  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Load Google Maps API using React Query
  const { isLoaded: placesLibraryLoaded } = useGoogleMaps(googleApiKey);

  // Parse Google Maps URLs for coordinates
  useEffect(() => {
    if (!locationDescription) {
      form.setValue("location.googleMapsUrl", '', { shouldDirty: false });
      form.setValue("location.latitude", undefined, { shouldDirty: false });
      form.setValue("location.longitude", undefined, { shouldDirty: false });
      return;
    }

    const parsed = parseGoogleMapsUrl(locationDescription);
    if (parsed) {
      form.setValue("location.googleMapsUrl", parsed.url, { shouldDirty: true });
      form.setValue("location.latitude", parsed.lat, { shouldDirty: true });
      form.setValue("location.longitude", parsed.lng, { shouldDirty: true });
    } else {
      if (!currentMapsUrl) {
        form.setValue("location.latitude", undefined, { shouldDirty: false });
        form.setValue("location.longitude", undefined, { shouldDirty: false });
      }
    }
  }, [locationDescription, currentMapsUrl, form]);

  // Fetch autocomplete predictions
  useEffect(() => {
    if (!placesLibraryLoaded || !locationDescription || locationDescription.length < 3) {
      setPlacePredictions([]);
      return;
    }

    if (suppressNextPredictions.current) {
      suppressNextPredictions.current = false;
      setPlacePredictions([]);
      return;
    }

    if (predictionsTimeout.current) {
      clearTimeout(predictionsTimeout.current);
    }

    predictionsTimeout.current = setTimeout(async () => {
      const requestId = ++lastPredictionRequestId.current;
      setIsLoadingPlaces(true);

      // Access googleMaps from window to avoid dependency issues
      const maps = (window as any).google?.maps;
      if (!maps?.places?.AutocompleteSuggestion) {
        setIsLoadingPlaces(false);
        return;
      }

      try {
        const sessionToken = new maps.places.AutocompleteSessionToken();

        const request = {
          input: locationDescription,
          sessionToken: sessionToken,
        };

        const { suggestions } = await maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        if (requestId !== lastPredictionRequestId.current) return;

        setIsLoadingPlaces(false);

        if (Array.isArray(suggestions)) {
          const mappedPredictions = suggestions.slice(0, 5).map((suggestion: {
            placePrediction: {
              text: { text?: string } | string;
              placeId: string;
            };
          }) => {
            const placePrediction = suggestion.placePrediction;
            return {
              description: typeof placePrediction.text === 'object'
                ? placePrediction.text.text || placePrediction.text.toString()
                : placePrediction.text.toString(),
              place_id: placePrediction.placeId,
              placePrediction: placePrediction,
            };
          });
          setPlacePredictions(mappedPredictions);
        } else {
          setPlacePredictions([]);
        }
      } catch {
        if (requestId !== lastPredictionRequestId.current) return;
        setIsLoadingPlaces(false);
        setPlacePredictions([]);
      }
    }, 350);

    return () => {
      if (predictionsTimeout.current) {
        clearTimeout(predictionsTimeout.current);
      }
    };
  }, [locationDescription, placesLibraryLoaded]);

  const handleSelectPrediction = async (prediction: {
    description?: string;
    place_id?: string;
    placePrediction?: {
      text?: { text?: string } | string;
      placeId?: string;
      toPlace?: () => {
        fetchFields: (options: { fields: string[] }) => Promise<void>;
        displayName?: string;
        formattedAddress?: string;
        location?: { lat: () => number; lng: () => number };
        googleMapsURI?: string;
      };
    };
  }) => {
    if (!prediction) return;
    setPlacePredictions([]);
    suppressNextPredictions.current = true;

    const description = prediction.description ||
      (typeof prediction.placePrediction?.text === 'object'
        ? prediction.placePrediction.text.text
        : prediction.placePrediction?.text?.toString()) ||
      prediction.placePrediction?.text?.toString();
    const placeId = prediction.place_id || prediction.placePrediction?.placeId;

    // Optimistic update - clear coordinates until we fetch them
    form.setValue('location', {
      description: description || '',
      latitude: undefined,
      longitude: undefined,
      googleMapsUrl: '',
    }, { shouldDirty: true });

    // Access googleMaps from window to avoid dependency issues
    const maps = (window as any).google?.maps;
    if (!maps?.places || !placeId) {
      const url = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
      form.setValue('location', {
        description: description || '',
        googleMapsUrl: url,
        latitude: undefined,
        longitude: undefined,
      }, { shouldDirty: true });
      return;
    }

    try {
      if (prediction.placePrediction?.toPlace) {
        const place = prediction.placePrediction.toPlace();
        await place.fetchFields({
          fields: ["displayName", "formattedAddress", "location", "id", "googleMapsURI"],
        });

        const location = place.location;
        const finalDescription = description || place.displayName || place.formattedAddress || '';

        form.setValue('location', {
          description: finalDescription,
          googleMapsUrl: place.googleMapsURI || '',
          latitude: location?.lat(),
          longitude: location?.lng(),
        }, { shouldDirty: true });
      } else {
        const url = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
        form.setValue('location', {
          description: description || '',
          googleMapsUrl: url,
          latitude: undefined,
          longitude: undefined,
        }, { shouldDirty: true });
      }
    } catch {
      const url = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
      form.setValue('location', {
        description: description || '',
        googleMapsUrl: url,
        latitude: undefined,
        longitude: undefined,
      }, { shouldDirty: true });
    }
  };

  return (
    <div className="space-y-6">
      {/* Event Type */}
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('events:fields.type')}</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('events:wizard.eventTypeQuestion')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="jam">{t('events:types.jam')}</SelectItem>
                <SelectItem value="class">{t('events:types.class')}</SelectItem>
                <SelectItem value="workshop">{t('events:types.workshop')}</SelectItem>
                <SelectItem value="convention">{t('events:types.convention')}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Title */}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('events:fields.title')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('forms:placeholders.enterTitle')}
                {...field}
              />
            </FormControl>
            <FormDescription>
              {t('common:validation.minLength', { count: 3 })} - {t('common:validation.maxLength', { count: 100 })}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <DescriptionEditor
                value={field.value || ''}
                onChange={field.onChange}
                disabled={form.formState.isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Location */}
      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('events:fields.location')}</FormLabel>
            <FormControl>
              <LocationInput
                value={field.value?.description || ''}
                onChange={(value) => {
                  field.onChange({
                    ...field.value,
                    description: value,
                  });
                }}
                disabled={form.formState.isSubmitting}
                placePredictions={placePredictions}
                isLoadingPlaces={isLoadingPlaces}
                onSelectPrediction={handleSelectPrediction}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Tags */}
      <FormField
        control={form.control}
        name="tags"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-y-2">
            <FormLabel>Tag</FormLabel>
            <FormControl>
              <MultiSelect
                options={[...EVENT_TAG_OPTIONS]}
                selected={field.value || []}
                onChange={field.onChange}
                placeholder="Tag"
                className="min-w-[160px] w-fit"
              />
            </FormControl>
            <FormDescription>Seleziona i tag rilevanti per l'evento</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <EventOrganizerFields form={form} />

      {/* Manage Participants Checkbox (only for jams) */}
      {eventType === 'jam' && (
        <FormField
          control={form.control}
          name="manageParticipants"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="cursor-pointer">
                  {t('events:wizard.askManageParticipants')}
                </FormLabel>
                <FormDescription>
                  {t('events:wizard.askManageParticipantsHelp')}
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      )}

      {/* Jam Participant Fields (conditional) */}
      <JamParticipantFields form={form} />
    </div>
  );
}
