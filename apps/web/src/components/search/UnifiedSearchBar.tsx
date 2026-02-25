import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, Crosshair, X, Loader2, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEventFilters } from '@/hooks/useEventFilters';
import { useIpLocation } from '@/hooks/useIpLocation';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Refs
  const hasAutoApplied = useRef(false);
  const locationInputRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const lastRequestId = useRef(0);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<any>(null);

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
    if (!placesLibraryLoaded) {
      console.log('[UnifiedSearchBar] Places library not loaded yet');
      return;
    }
    if (!citySearchText || citySearchText.length < 2) {
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
        console.log('[UnifiedSearchBar] AutocompleteSuggestion not available', {
          maps: !!maps,
          places: !!maps?.places,
          AutocompleteSuggestion: !!maps?.places?.AutocompleteSuggestion,
        });
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

    const onSuccess = (position: GeolocationPosition) => {
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
    };

    const onError = (err: GeolocationPositionError) => {
      setIsLoadingGps(false);

      let errorMessage: string;
      // GeolocationPositionError codes: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
      switch (err.code) {
        case 1: // PERMISSION_DENIED
          errorMessage = 'Permesso di geolocalizzazione negato. Controlla le impostazioni del browser.';
          break;
        case 2: // POSITION_UNAVAILABLE
          errorMessage = 'Posizione non disponibile. Riprova più tardi.';
          break;
        case 3: // TIMEOUT
          errorMessage = 'Richiesta scaduta. Riprova.';
          break;
        default:
          errorMessage = err.message || 'Errore sconosciuto';
      }

      toast({
        title: 'Errore di localizzazione',
        description: errorMessage,
        variant: 'destructive',
      });
    };

    // First try with high accuracy, fallback to low accuracy on timeout
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => {
        // If high accuracy times out, try without it
        if (err.code === 3) {
          navigator.geolocation.getCurrentPosition(
            onSuccess,
            onError,
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            }
          );
        } else {
          onError(err);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
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
        return `${pendingLocation.city}`;
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
        return `${cityName}`;
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

  // Check if pending location differs from URL location (staged but not applied)
  const hasPendingChanges = (() => {
    if (!pendingLocation) return false;
    const urlLat = parseFloat(filters.lat || '0');
    const urlLng = parseFloat(filters.lng || '0');
    return pendingLocation.lat !== urlLat || pendingLocation.lng !== urlLng;
  })();

  // Generate unique IDs for accessibility
  const dropdownId = 'unified-search-location-dropdown';
  const locationLabelId = 'unified-search-location-label';

  // Get mobile trigger text
  const getMobileTriggerText = () => {
    const keyword = keywordValue;
    const location = locationDisplayText;

    if (keyword && location) {
      return `${keyword} ${t('search.mobile.at')} ${location.replace(` `, '')}`;
    }
    if (keyword) {
      return keyword;
    }
    if (location) {
      return `${t('search.mobile.at')} ${location.replace(` `, '')}`;
    }
    return t('search.mobile.title');
  };

  // Handle search and close drawer (mobile)
  const handleSearchAndClose = () => {
    handleSearch();
    setIsDrawerOpen(false);
    setIsLocationDropdownOpen(false);
  };

  // Clear location without event (for mobile)
  const handleClearLocationMobile = () => {
    updateFilter('lat', '');
    updateFilter('lng', '');
    setPendingLocation(null);
    setLocationType(null);
    setCityName(null);
    hasAutoApplied.current = true; // Prevent re-auto-apply
  };

  // Mobile: render drawer pattern
  if (isMobile) {
    return (
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline" className="w-full justify-start h-12 rounded-full">
            <Search className="h-4 w-4 mr-2" />
            <span className="flex-1 text-left text-muted-foreground truncate">
              {getMobileTriggerText()}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>{t('search.mobile.title')}</DrawerTitle>
          </DrawerHeader>

          <div className="p-4 space-y-4">
            {/* Keyword input - full width */}
            <div className="space-y-2">
              <label htmlFor="keyword" className="text-sm font-medium">{t('search.mobile.keywordLabel')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('search.keyword.placeholder')}
                  value={keywordValue}
                  onChange={handleKeywordChange}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            {/* Location input - full width */}
            <div className="space-y-2">
              <label htmlFor="location" className="text-sm font-medium">{t('search.mobile.locationLabel')}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('search.location.placeholder')}
                  value={citySearchText}
                  onChange={(e) => {
                    setCitySearchText(e.target.value);
                    setIsLocationDropdownOpen(true);
                  }}
                  onFocus={() => setIsLocationDropdownOpen(true)}
                  className="pl-9 pr-9"
                />
                {hasLocation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={handleClearLocationMobile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Current location display */}
              {locationDisplayText && !citySearchText && (
                <div className="text-sm text-muted-foreground flex items-center gap-2 pl-1">
                  <MapPin className="h-3 w-3" />
                  {locationDisplayText}
                </div>
              )}

              {/* Inline dropdown for mobile (below input) */}
              {isLocationDropdownOpen && (
                <div className="border rounded-md bg-background">
                  {/* GPS Option */}
                  <button
                    type="button"
                    onClick={() => {
                      requestPreciseLocation();
                      setIsLocationDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                  >
                    {isLoadingGps ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Crosshair className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">{t('search.location.useCurrentLocation')}</span>
                  </button>

                  {/* City Predictions */}
                  {predictions.length > 0 && (
                    <>
                      <Separator />
                      {predictions.map((prediction) => (
                        <button
                          key={prediction.place_id}
                          type="button"
                          onClick={() => {
                            void handleSelectPrediction(prediction);
                            setIsLocationDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors text-left text-sm"
                        >
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{prediction.description}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Loading indicator */}
                  {isLoadingPredictions && (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DrawerFooter>
            <Button onClick={handleSearchAndClose} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              {t('search.mobile.searchButton')}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">{t('search.mobile.cancel')}</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: render inline bar
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

      {/* Location Section - relative container for dropdown */}
      <div className="relative flex-1 min-w-0">
        <div
          ref={locationInputRef}
          className={cn(
            'flex items-center gap-2 px-2 cursor-pointer h-full',
            hasPendingChanges && 'rounded-full'
          )}
          onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsLocationDropdownOpen(!isLocationDropdownOpen);
            }
          }}
          role="combobox"
          aria-expanded={isLocationDropdownOpen}
          aria-haspopup="listbox"
          aria-controls={dropdownId}
          aria-labelledby={locationLabelId}
          tabIndex={0}
        >
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <span
            id={locationLabelId}
            className={cn(
              'flex-1 min-w-0 truncate text-sm',
              locationDisplayText ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {locationDisplayText || t('search.location.placeholder')}
          </span>
          {/* Pending change indicator */}
          {hasPendingChanges && (
            <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-hidden="true" />
          )}
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

        {/* Location Dropdown - positioned relative to location section */}
        {isLocationDropdownOpen && (
          <div
            ref={dropdownRef}
            id={dropdownId}
            className="absolute top-full right-0 left-1 mt-3 w-80 rounded-lg border bg-popover shadow-lg z-50"
            role="listbox"
            aria-label={t('search.location.placeholder')}
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
              tabIndex={highlightedIndex === 0 ? 0 : -1}
              onClick={requestPreciseLocation}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  requestPreciseLocation();
                }
              }}
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
                      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: <biome loop errors>
                      role="option"
                      aria-selected={highlightedIndex === index + 1}
                      tabIndex={highlightedIndex === index + 1 ? 0 : -1}
                      onClick={() => void handleSelectPrediction(prediction)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          void handleSelectPrediction(prediction);
                        }
                      }}
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
      </div>

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
