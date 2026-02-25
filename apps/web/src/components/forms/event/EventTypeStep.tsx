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
  const suppressUntilTimestamp = useRef<number | null>(null);
  const lastMapsDebugState = useRef<string | null>(null);

  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;


  // Load Google Maps API using React Query
  const {
    isLoaded: placesLibraryLoaded,
    status: placesLibraryStatus,
    errorReason: placesLibraryErrorReason,
  } = useGoogleMaps(googleApiKey);

  // Parse Google Maps URLs for coordinates
  useEffect(() => {
    if (!locationDescription) {
      form.setValue("location.googleMapsUrl", '', { shouldDirty: false });
      form.setValue("location.latitude", undefined, { shouldDirty: false });
      form.setValue("location.longitude", undefined, { shouldDirty: false });
      form.setValue("location.city", undefined, { shouldDirty: false });
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

  // Watch location coordinates to detect when location is already selected
  const locationLatitude = form.watch('location.latitude');
  const locationLongitude = form.watch('location.longitude');

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const stateKey = `${placesLibraryStatus}:${placesLibraryErrorReason ?? ''}`;
    if (lastMapsDebugState.current === stateKey) {
      return;
    }

    lastMapsDebugState.current = stateKey;

    if (placesLibraryStatus === 'missing_key') {
      console.warn('[EventTypeStep] Google Places disabled: VITE_GOOGLE_MAPS_API_KEY is missing.');
      return;
    }

    if (placesLibraryStatus === 'error') {
      console.error('[EventTypeStep] Google Places failed to load.', {
        reason: placesLibraryErrorReason,
      });
      return;
    }

    if (placesLibraryStatus === 'loaded') {
      console.debug('[EventTypeStep] Google Places loaded successfully.');
    }
  }, [placesLibraryStatus, placesLibraryErrorReason]);

  // Fetch autocomplete predictions
  useEffect(() => {
    if (!placesLibraryLoaded || !locationDescription || locationDescription.length < 3) {
      setPlacePredictions([]);
      return;
    }

    // Don't show predictions if location already has coordinates (already selected)
    if (locationLatitude !== undefined && locationLongitude !== undefined) {
      setPlacePredictions([]);
      return;
    }

    // Check if we're still in suppression window (2 seconds after selection)
    const now = Date.now();
    if (suppressNextPredictions.current || (suppressUntilTimestamp.current && now < suppressUntilTimestamp.current)) {
      // Don't reset the flag immediately - let it persist through multiple form updates
      setPlacePredictions([]);
      return;
    }

    // Clear suppression flags if we're past the suppression window
    if (suppressUntilTimestamp.current && now >= suppressUntilTimestamp.current) {
      suppressNextPredictions.current = false;
      suppressUntilTimestamp.current = null;
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
        console.log('suggestions', suggestions);
        if (requestId !== lastPredictionRequestId.current) {
          return;
        }

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
      } catch (error) {
        if (requestId !== lastPredictionRequestId.current) {
          return;
        }
        setIsLoadingPlaces(false);
        setPlacePredictions([]);
      }
    }, 350);

    return () => {
      if (predictionsTimeout.current) {
        clearTimeout(predictionsTimeout.current);
      }
    };
  }, [locationDescription, placesLibraryLoaded, locationLatitude, locationLongitude]);

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
    if (!prediction) {
      return;
    }

    // Clear any pending prediction requests
    if (predictionsTimeout.current) {
      clearTimeout(predictionsTimeout.current);
      predictionsTimeout.current = null;
    }

    // Clear predictions immediately
    setPlacePredictions([]);
    setIsLoadingPlaces(false);

    // Set suppression flag and timestamp (suppress for 2 seconds)
    suppressNextPredictions.current = true;
    suppressUntilTimestamp.current = Date.now() + 2000;

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
      city: undefined,
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
        const place = prediction.placePrediction.toPlace() as any;
        await place.fetchFields({
          fields: ["displayName", "formattedAddress", "location", "id", "googleMapsURI", "addressComponents"],
        });

        const location = place.location;
        let city = '';

        // Extract city from address components
        if (place.addressComponents) {
          for (const component of place.addressComponents) {
            if (component.types.includes('locality')) {
              city = component.longText;
              break;
            }
          }
          // Fallback if locality not found (e.g. administrative_area_level_3 in some countries)
          if (!city) {
            for (const component of place.addressComponents) {
              if (component.types.includes('administrative_area_level_3')) {
                city = component.longText;
                break;
              }
            }
          }
        }

        // Use place name as description if available, otherwise fallback to formatted address
        const finalDescription = place.displayName || description || place.formattedAddress || '';

        // If we have a specific place name (displayName), we prefer that as the main text
        // The city will be stored separately

        form.setValue('location', {
          description: finalDescription,
          city: city,
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
    } catch (error) {
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
