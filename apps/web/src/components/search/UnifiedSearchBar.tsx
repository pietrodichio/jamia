import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, Crosshair, X, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEventFilters } from '@/hooks/useEventFilters';
import { useIpLocation } from '@/hooks/useIpLocation';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type LocationType = 'ip' | 'gps' | 'city' | null;

interface PendingLocation {
  lat: number;
  lng: number;
  city: string;
  type: LocationType;
}

interface PlacePrediction {
  description: string;
  place_id: string;
  placePrediction: {
    text: { text?: string } | string;
    placeId: string;
    toPlace?: () => {
      fetchFields: (options: { fields: string[] }) => Promise<void>;
      location?: { lat: () => number; lng: () => number };
      addressComponents?: Array<{
        types: string[];
        longText: string;
      }>;
    };
  };
}

export function UnifiedSearchBar() {
  const isMobile = useIsMobile();
  const { t } = useTranslation('events');
  const { filters, updateFilter } = useEventFilters();
  const { toast } = useToast();

  // IP location hook
  const { data: ipLocation, isSuccess: ipLocationReady } = useIpLocation();

  // Google Maps
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded: placesLibraryLoaded } = useGoogleMaps(googleApiKey);

  // Local state
  const [keywordValue, setKeywordValue] = useState(filters.query);
  const [locationType, setLocationType] = useState<LocationType>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [pendingLocation, setPendingLocation] = useState<PendingLocation | null>(null);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [citySearchText, setCitySearchText] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Refs
  const hasAutoApplied = useRef(false);
  const locationInputRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const lastRequestId = useRef(0);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<any>(null);

  // Mobile: render nothing (Plan 02 will add mobile version)
  if (isMobile) {
    return null;
  }

  // Create a new session token for Google Places
  const getSessionToken = useCallback(() => {
    const maps = (window as any).google?.maps;
    if (!sessionTokenRef.current && maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new maps.places.AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  }, []);

  // Reset session token after selection
  const resetSessionToken = useCallback(() => {
    sessionTokenRef.current = null;
  }, []);

  // Debounced keyword search - updates URL after 300ms
  const debouncedKeywordSearch = useDebouncedCallback((term: string) => {
    updateFilter('query', term);
  }, 300);

  // Handle keyword input change
  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeywordValue(value);
    debouncedKeywordSearch(value);
  };

  // Auto-apply IP location on mount when no location is set
  useEffect(() => {
    const hasExistingLocation = filters.lat && filters.lng;

    if (
      !hasAutoApplied.current &&
      !hasExistingLocation &&
      ipLocationReady &&
      ipLocation
    ) {
      hasAutoApplied.current = true;
      // Set as pending, not directly applied
      setPendingLocation({
        lat: ipLocation.lat,
        lng: ipLocation.lng,
        city: ipLocation.city,
        type: 'ip',
      });
      setLocationType('ip');
      setCityName(ipLocation.city);
      // Auto-apply IP location to URL
      updateFilter('lat', ipLocation.lat.toString());
      updateFilter('lng', ipLocation.lng.toString());
    }
  }, [ipLocationReady, ipLocation, filters.lat, filters.lng, updateFilter]);

  // Restore location type from URL on mount
  useEffect(() => {
    if (filters.lat && filters.lng && !locationType) {
      // We have URL location but no type - assume it's from previous session
      // Can't determine original type, so leave it unset or set to a default
      setLocationType(null);
    }
  }, [filters.lat, filters.lng, locationType]);

  // City search with debounce
  useEffect(() => {
    if (!placesLibraryLoaded || !citySearchText || citySearchText.length < 2) {
      setPredictions([]);
      return;
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      const requestId = ++lastRequestId.current;
      setIsLoadingPredictions(true);

      const maps = (window as any).google?.maps;
      if (!maps?.places?.AutocompleteSuggestion) {
        setIsLoadingPredictions(false);
        return;
      }

      try {
        const sessionToken = getSessionToken();
        const request = {
          input: citySearchText,
          types: ['(cities)'],
          sessionToken,
        };

        const { suggestions } = await maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        if (requestId !== lastRequestId.current) {
          return;
        }

        setIsLoadingPredictions(false);

        if (Array.isArray(suggestions)) {
          const mappedPredictions: PlacePrediction[] = suggestions.slice(0, 5).map((suggestion: {
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
              placePrediction: placePrediction as PlacePrediction['placePrediction'],
            };
          });
          setPredictions(mappedPredictions);
          setHighlightedIndex(-1);
        } else {
          setPredictions([]);
        }
      } catch (error) {
        if (requestId !== lastRequestId.current) {
          return;
        }
        setIsLoadingPredictions(false);
        setPredictions([]);
      }
    }, 350);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [citySearchText, placesLibraryLoaded, getSessionToken]);

  // Handle city selection from autocomplete
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    if (!prediction) return;

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }

    setIsLoadingPredictions(true);
    setPredictions([]);

    try {
      if (prediction.placePrediction?.toPlace) {
        const place = prediction.placePrediction.toPlace() as any;
        await place.fetchFields({
          fields: ['location', 'addressComponents'],
        });

        const location = place.location;
        if (!location) {
          throw new Error('No location found');
        }

        const lat = location.lat();
        const lng = location.lng();

        // Extract city name from address components
        let extractedCityName = '';
        if (place.addressComponents) {
          for (const component of place.addressComponents) {
            if (component.types.includes('locality')) {
              extractedCityName = component.longText;
              break;
            }
          }
          if (!extractedCityName) {
            for (const component of place.addressComponents) {
              if (component.types.includes('administrative_area_level_3')) {
                extractedCityName = component.longText;
                break;
              }
            }
          }
        }

        if (!extractedCityName) {
          extractedCityName = prediction.description.split(',')[0].trim();
        }

        // Stage the pending location (don't apply to URL yet)
        setPendingLocation({
          lat,
          lng,
          city: extractedCityName,
          type: 'city',
        });
        setLocationType('city');
        setCityName(extractedCityName);
        setCitySearchText('');
        setIsLocationDropdownOpen(false);
        resetSessionToken();
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setIsLoadingPredictions(false);
    }
  };

  // Request GPS location
  const requestPreciseLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocalizzazione non supportata',
        description: 'Il tuo browser non supporta la geolocalizzazione precisa',
        variant: 'destructive',
      });
      return;
    }

    setIsLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPendingLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          city: '', // Will show "Posizione precisa" in display
          type: 'gps',
        });
        setLocationType('gps');
        setCityName(null);
        setIsLoadingGps(false);
        setIsLocationDropdownOpen(false);
        toast({
          title: 'Posizione precisa rilevata',
          description: 'Clicca "Cerca" per cercare eventi vicino a te',
        });
      },
      (err) => {
        toast({
          title: 'Errore di localizzazione',
          description:
            err.code === err.PERMISSION_DENIED
              ? 'Permesso di geolocalizzazione negato'
              : err.message,
          variant: 'destructive',
        });
        setIsLoadingGps(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Handle search button click
  const handleSearch = () => {
    if (pendingLocation) {
      updateFilter('lat', pendingLocation.lat.toString());
      updateFilter('lng', pendingLocation.lng.toString());
      setLocationType(pendingLocation.type);
    }
  };

  // Clear location
  const handleClearLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateFilter('lat', '');
    updateFilter('lng', '');
    setPendingLocation(null);
    setLocationType(null);
    setCityName(null);
    hasAutoApplied.current = true; // Prevent re-auto-apply
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(e.target as Node)
      ) {
        setIsLocationDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus city input when dropdown opens
  useEffect(() => {
    if (isLocationDropdownOpen && cityInputRef.current) {
      cityInputRef.current.focus();
    }
  }, [isLocationDropdownOpen]);

  // Keyboard navigation in dropdown
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    // Total items: 1 (GPS option) + predictions.length
    const totalItems = 1 + predictions.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < totalItems - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : totalItems - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex === 0) {
          requestPreciseLocation();
        } else if (highlightedIndex > 0 && highlightedIndex <= predictions.length) {
          void handleSelectPrediction(predictions[highlightedIndex - 1]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsLocationDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Get location display text
  const getLocationDisplayText = () => {
    if (pendingLocation) {
      if (pendingLocation.type === 'ip' && pendingLocation.city) {
        return `${pendingLocation.city} ${t('search.location.approximate')}`;
      }
      if (pendingLocation.type === 'gps') {
        return pendingLocation.city || t('search.location.preciseFallback');
      }
      if (pendingLocation.type === 'city' && pendingLocation.city) {
        return pendingLocation.city;
      }
    }
    // Check URL location
    if (filters.lat && filters.lng) {
      if (locationType === 'ip' && cityName) {
        return `${cityName} ${t('search.location.approximate')}`;
      }
      if (locationType === 'gps') {
        return cityName || t('search.location.preciseFallback');
      }
      if (locationType === 'city' && cityName) {
        return cityName;
      }
      // Fallback for URL location without type info
      if (cityName) {
        return cityName;
      }
    }
    return '';
  };

  const hasLocation = !!(filters.lat && filters.lng) || !!pendingLocation;
  const locationDisplayText = getLocationDisplayText();
  const isSearchDisabled = !hasLocation;

  return (
    <div className="flex items-center h-12 border rounded-full bg-background shadow-sm px-2">
      {/* Keyword Section */}
      <div className="flex items-center flex-1 min-w-0 gap-2 px-2">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          type="search"
          placeholder={t('search.keyword.placeholder')}
          value={keywordValue}
          onChange={handleKeywordChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
        />
      </div>

      {/* Vertical Separator */}
      <Separator orientation="vertical" className="h-6" />

      {/* Location Section */}
      <div
        ref={locationInputRef}
        className="flex items-center flex-1 min-w-0 gap-2 px-2 cursor-pointer relative"
        onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
        role="combobox"
        aria-expanded={isLocationDropdownOpen}
        aria-haspopup="listbox"
      >
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <span
          className={cn(
            'flex-1 min-w-0 truncate text-sm',
            locationDisplayText ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {locationDisplayText || t('search.location.placeholder')}
        </span>
        {hasLocation && (
          <button
            type="button"
            onClick={handleClearLocation}
            className="p-1 hover:bg-accent rounded-full shrink-0"
            aria-label="Clear location"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Location Dropdown */}
      {isLocationDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 mx-2 rounded-lg border bg-popover shadow-lg z-50"
          style={{ width: 'calc(100% - 16px)', maxWidth: '400px', left: '50%', transform: 'translateX(-50%)' }}
          role="listbox"
          onKeyDown={handleDropdownKeyDown}
        >
          {/* City search input */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={cityInputRef}
                type="text"
                value={citySearchText}
                onChange={(e) => setCitySearchText(e.target.value)}
                onKeyDown={handleDropdownKeyDown}
                placeholder={t('search.location.searchCity')}
                className="w-full pl-9 pr-9 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring"
              />
              {isLoadingPredictions && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* GPS Option */}
          <div
            role="option"
            aria-selected={highlightedIndex === 0}
            onClick={requestPreciseLocation}
            className={cn(
              'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
              highlightedIndex === 0 ? 'bg-accent' : 'hover:bg-accent'
            )}
          >
            {isLoadingGps ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Crosshair className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm">{t('search.location.useCurrentLocation')}</span>
          </div>

          {/* City Predictions */}
          {predictions.length > 0 && (
            <>
              <Separator />
              <ul className="py-1">
                {predictions.map((prediction, index) => (
                  <li
                    key={prediction.place_id}
                    role="option"
                    aria-selected={highlightedIndex === index + 1}
                    onClick={() => void handleSelectPrediction(prediction)}
                    onMouseEnter={() => setHighlightedIndex(index + 1)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2 cursor-pointer text-sm',
                      highlightedIndex === index + 1
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{prediction.description}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Search Button */}
      <Button
        type="button"
        onClick={handleSearch}
        disabled={isSearchDisabled}
        size="icon"
        className="h-9 w-9 rounded-full shrink-0"
        aria-label={t('search.button.search')}
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}
