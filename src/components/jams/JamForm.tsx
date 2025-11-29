import { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  JamFormValues,
  formatDateTimeLocalInput,
  parseDateTimeLocal,
  combineDateTime,
} from "@/lib/jam-form";
import { parseGoogleMapsUrl, loadGoogleMaps } from "./utils/google-maps";
import { DateTimePicker } from "./DateTimePicker";
import { LocationInput } from "./LocationInput";
import { DescriptionEditor } from "./DescriptionEditor";
import { CapacitySettings } from "./CapacitySettings";
import { FormSwitch } from "./FormSwitch";

type JamFormProps = {
  form: UseFormReturn<JamFormValues>;
  onSubmit: (values: JamFormValues) => Promise<void> | void;
  submitLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  defaultDurationHours?: number;
};

export const JamForm = ({
  form,
  onSubmit,
  submitLabel,
  cancelLabel,
  onCancel,
  defaultDurationHours = 4,
}: JamFormProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = form;

  const [placePredictions, setPlacePredictions] = useState<any[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const mapsLoader = useRef<Promise<void> | null>(null);
  const sessionTokenRef = useRef<any>(null);
  const lastPredictionRequestId = useRef(0);
  const predictionsTimeout = useRef<NodeJS.Timeout | null>(null);
  const suppressNextPredictions = useRef(false);
  const placesLibraryLoaded = useRef(false);

  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [timeFrom, setTimeFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [timeTo, setTimeTo] = useState<string>("");

  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const startsAt = watch("starts_at");
  const endsAt = watch("ends_at");
  const capacity = watch("capacity");
  const basesMin = watch("desired_bases_min");
  const basesMax = watch("desired_bases_max");
  const flyersMin = watch("desired_flyers_min");
  const flyersMax = watch("desired_flyers_max");
  const locationDescription = watch("location.description");
  const currentMapsUrl = watch("location.google_maps_url");
  const descriptionValue = watch("description") || "";
  const autoPromote = watch("auto_promote");
  const publicParticipants = watch("public_participants");

  // Parse form values into date/time state when they change externally (e.g., from reset/edit)
  const prevStartsAtRef = useRef<string | undefined>(undefined);
  const prevEndsAtRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (startsAt !== prevStartsAtRef.current) {
      prevStartsAtRef.current = startsAt;
      if (startsAt) {
        const parsed = parseDateTimeLocal(startsAt);
        setDateFrom(parsed.date);
        setTimeFrom(parsed.time || "09:00");
      } else {
        setDateFrom(undefined);
        setTimeFrom("");
      }
    }
  }, [startsAt]);

  useEffect(() => {
    if (endsAt !== prevEndsAtRef.current) {
      prevEndsAtRef.current = endsAt;
      if (endsAt) {
        const parsed = parseDateTimeLocal(endsAt);
        setDateTo(parsed.date);
        setTimeTo(parsed.time || "13:00");
      } else {
        setDateTo(undefined);
        setTimeTo("");
      }
    }
  }, [endsAt]);

  // Handlers to update form values when date/time changes
  const handleStartDateChange = (date: Date | undefined) => {
    setDateFrom(date);
    if (date) {
      const timeToUse = timeFrom || "09:00";
      if (!timeFrom) {
        setTimeFrom(timeToUse);
      }
      const combined = combineDateTime(date, timeToUse);
      prevStartsAtRef.current = combined;
      setValue("starts_at", combined, { shouldDirty: true });
    } else {
      prevStartsAtRef.current = "";
      setValue("starts_at", "", { shouldDirty: true });
    }
  };

  const handleStartTimeChange = (time: string) => {
    setTimeFrom(time);
    if (dateFrom && time) {
      const combined = combineDateTime(dateFrom, time);
      prevStartsAtRef.current = combined;
      setValue("starts_at", combined, { shouldDirty: true });
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setDateTo(date);
    if (date) {
      const timeToUse = timeTo || "13:00";
      if (!timeTo) {
        setTimeTo(timeToUse);
      }
      const combined = combineDateTime(date, timeToUse);
      prevEndsAtRef.current = combined;
      setValue("ends_at", combined, { shouldDirty: true });
    } else {
      prevEndsAtRef.current = "";
      setValue("ends_at", "", { shouldDirty: true });
    }
  };

  const handleEndTimeChange = (time: string) => {
    setTimeTo(time);
    if (dateTo && time) {
      const combined = combineDateTime(dateTo, time);
      prevEndsAtRef.current = combined;
      setValue("ends_at", combined, { shouldDirty: true });
    }
  };

  useEffect(() => {
    if (!dateFrom || !timeFrom) {
      return;
    }

    const timer = setTimeout(() => {
      const start = combineDateTime(dateFrom, timeFrom);

      if (!start) {
        return;
      }

      const startDate = new Date(start);

      if (Number.isNaN(startDate.getTime())) {
        return;
      }

      const proposedEnd = new Date(startDate);
      proposedEnd.setHours(proposedEnd.getHours() + defaultDurationHours);

      const endOfDay = new Date(startDate);
      endOfDay.setHours(23, 59, 0, 0);

      const finalEnd = proposedEnd > endOfDay ? endOfDay : proposedEnd;
      const formattedEnd = formatDateTimeLocalInput(finalEnd);

      // Update form value - the sync effect will update dateTo/timeTo state
      // Don't update prevEndsAtRef here - let the sync effect handle it
      setValue("ends_at", formattedEnd, { shouldDirty: false });
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [dateFrom, timeFrom, setValue, defaultDurationHours]);

  useEffect(() => {
    if (!capacity || capacity <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      const totalCapacity = Number(capacity);
      const idealBases = Math.floor(totalCapacity / 3);
      const idealFlyers = totalCapacity - idealBases;

      const basesMin = Math.max(0, idealBases - 1);
      const basesMax = idealBases + 1;

      let flyersMin = Math.max(0, idealFlyers - 2);
      const flyersMax = idealFlyers + 2;

      if (basesMax + flyersMin < totalCapacity) {
        flyersMin = totalCapacity - basesMax;
      }

      setValue("desired_bases_min", basesMin);
      setValue("desired_bases_max", basesMax);
      setValue("desired_flyers_min", flyersMin);
      setValue("desired_flyers_max", flyersMax);
    }, 500);

    return () => clearTimeout(timer);
  }, [capacity, setValue]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <I don't think this should be exhaustive>
  useEffect(() => {
    if (!googleApiKey) {
      return;
    }

    let cancelled = false;

    loadGoogleMaps(googleApiKey, mapsLoader)
      .then(async () => {
        if (cancelled) return;
        const googleMaps = (window as any).google?.maps;
        if (!googleMaps?.places) return;
        
        // Import the places library to ensure AutocompleteSuggestion is available
        try {
          await googleMaps.importLibrary("places");
          placesLibraryLoaded.current = true;
          // Create a new session token
          sessionTokenRef.current = new googleMaps.places.AutocompleteSessionToken();
        } catch {
          // ignore load errors, fallback to manual input
        }
      })
      .catch(() => {
        // ignore load errors, fallback to manual input
      });

    return () => {
      cancelled = true;
    };
  }, [googleApiKey]);

  useEffect(() => {
    if (!locationDescription) {
      setValue("location.google_maps_url", undefined, { shouldDirty: false });
      setValue("location.latitude", undefined, { shouldDirty: false });
      setValue("location.longitude", undefined, { shouldDirty: false });
      return;
    }

    const parsed = parseGoogleMapsUrl(locationDescription);
    if (parsed) {
      setValue("location.google_maps_url", parsed.url, { shouldDirty: true });
      setValue("location.latitude", parsed.lat, { shouldDirty: true });
      setValue("location.longitude", parsed.lng, { shouldDirty: true });
    } else {
      if (!currentMapsUrl) {
        setValue("location.latitude", undefined, { shouldDirty: false });
        setValue("location.longitude", undefined, { shouldDirty: false });
      }
    }
  }, [locationDescription, currentMapsUrl, setValue]);

  useEffect(() => {
    if (!placesLibraryLoaded.current || !locationDescription || locationDescription.length < 3) {
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
      
      const googleMaps = (window as any).google?.maps;
      if (!googleMaps?.places?.AutocompleteSuggestion) {
        setIsLoadingPlaces(false);
        return;
      }

      try {
        // Create a new session token for this request
        const sessionToken = new googleMaps.places.AutocompleteSessionToken();
        
        const request = {
          input: locationDescription,
          sessionToken: sessionToken,
        };

        const { suggestions } = await googleMaps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        if (requestId !== lastPredictionRequestId.current) return;
        
        setIsLoadingPlaces(false);
        
        if (Array.isArray(suggestions)) {
          // Map the new format to the old format for compatibility with existing code
          const mappedPredictions = suggestions.slice(0, 5).map((suggestion: any) => {
            const placePrediction = suggestion.placePrediction;
            return {
              description: placePrediction.text.text || placePrediction.text.toString(),
              place_id: placePrediction.placeId,
              placePrediction: placePrediction, // Keep the new format for handleSelectPrediction
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
  }, [locationDescription]);

  const handleSelectPrediction = async (prediction: any) => {
    if (!prediction) return;
    const googleMaps = (window as any).google?.maps;
    setPlacePredictions([]);
    suppressNextPredictions.current = true;
    
    const description = prediction.description || prediction.placePrediction?.text?.text || prediction.placePrediction?.text?.toString();
    const placeId = prediction.place_id || prediction.placePrediction?.placeId;
    
    setValue("location.description", description, { shouldDirty: true });
    setValue("location.place_id", placeId, { shouldDirty: true });

    if (!googleMaps?.places || !placeId) {
      setValue(
        "location.google_maps_url",
        `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        { shouldDirty: true },
      );
      return;
    }

    try {
      // Use the new Place API if we have placePrediction, otherwise fallback
      let place: any;
      
      if (prediction.placePrediction) {
        place = prediction.placePrediction.toPlace();
        await place.fetchFields({
          fields: ["displayName", "formattedAddress", "location", "id", "googleMapsURI"],
        });
        
        const location = place.location;
        setValue("location.description", description || place.displayName || place.formattedAddress, {
          shouldDirty: true,
        });
        setValue("location.google_maps_url", place.googleMapsURI || undefined, { shouldDirty: true });
        setValue("location.latitude", location?.lat(), { shouldDirty: true });
        setValue("location.longitude", location?.lng(), { shouldDirty: true });
      } else {
        // Fallback: construct URL manually
        setValue(
          "location.google_maps_url",
          `https://www.google.com/maps/place/?q=place_id:${placeId}`,
          { shouldDirty: true },
        );
      }
    } catch {
      // Fallback on error
      setValue(
        "location.google_maps_url",
        `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        { shouldDirty: true },
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="jam-name">Nome della Jam *</Label>
          <Input
            id="jam-name"
            placeholder="es. Jam di AcroYoga a Milano"
            {...register("name")}
            disabled={isSubmitting}
            className="rounded-xl"
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1">{String(errors.name.message || "")}</p>
          )}
        </div>

        <LocationInput
          value={locationDescription || ""}
          onChange={(value) => setValue("location.description", value, { shouldDirty: true })}
          error={errors.location?.description?.message}
          disabled={isSubmitting}
          placePredictions={placePredictions}
          isLoadingPlaces={isLoadingPlaces}
          onSelectPrediction={handleSelectPrediction}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DateTimePicker
          label="Inizio *"
          date={dateFrom}
          time={timeFrom}
          onDateChange={handleStartDateChange}
          onTimeChange={handleStartTimeChange}
          error={errors.starts_at?.message}
          disabled={isSubmitting}
          timeId="time-from"
          dateButtonId="jam-starts"
        />

        <DateTimePicker
          label="Fine *"
          date={dateTo}
          time={timeTo}
          onDateChange={handleEndDateChange}
          onTimeChange={handleEndTimeChange}
          error={errors.ends_at?.message}
          disabled={isSubmitting}
          minDate={dateFrom}
          timeId="time-to"
          dateButtonId="jam-ends"
        />
      </div>

      <DescriptionEditor
        value={descriptionValue}
        onChange={(value) => setValue("description", value, { shouldDirty: true })}
        disabled={isSubmitting}
      />

      <CapacitySettings
        capacity={capacity}
        basesMin={basesMin}
        basesMax={basesMax}
        flyersMin={flyersMin}
        flyersMax={flyersMax}
        onCapacityChange={(value) => setValue("capacity", value, { shouldDirty: true })}
        onBasesMinChange={(value) => setValue("desired_bases_min", value, { shouldDirty: true })}
        onBasesMaxChange={(value) => setValue("desired_bases_max", value, { shouldDirty: true })}
        onFlyersMinChange={(value) => setValue("desired_flyers_min", value, { shouldDirty: true })}
        onFlyersMaxChange={(value) => setValue("desired_flyers_max", value, { shouldDirty: true })}
        errors={errors}
        disabled={isSubmitting}
      />

      <FormSwitch
        id="jam-auto-promote"
        label="Promozione automatica"
        description="Promuovi automaticamente dalla lista d'attesa quando si libera un posto"
        checked={autoPromote}
        onChange={(checked) => setValue("auto_promote", checked, { shouldDirty: true })}
        disabled={isSubmitting}
      />

      <FormSwitch
        id="jam-public-participants"
        label="Mostra partecipanti pubblicamente"
        description="Consenti a chiunque di vedere la lista dei partecipanti"
        checked={publicParticipants}
        onChange={(checked) => setValue("public_participants", checked, { shouldDirty: true })}
        disabled={isSubmitting}
      />

      <div className="flex gap-3">
        <Button type="submit" className="flex-1 rounded-xl" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-xl"
        >
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
};

export default JamForm;
