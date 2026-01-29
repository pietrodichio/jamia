import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { cn } from '@/lib/utils';

interface CityLocation {
  lat: number;
  lng: number;
  city: string;
}

interface CitySearchInputProps {
  onCitySelect: (location: CityLocation) => void;
  placeholder?: string;
  disabled?: boolean;
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

export function CitySearchInput({
  onCitySelect,
  placeholder = 'Cerca una citta...',
  disabled = false,
}: CitySearchInputProps) {
  const [searchText, setSearchText] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastRequestId = useRef(0);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<any>(null);

  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded: placesLibraryLoaded } = useGoogleMaps(googleApiKey);

  // Create a new session token when starting a new search
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

  // Fetch city predictions with 350ms debounce
  useEffect(() => {
    if (!placesLibraryLoaded || !searchText || searchText.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      const requestId = ++lastRequestId.current;
      setIsLoading(true);

      const maps = (window as any).google?.maps;
      if (!maps?.places?.AutocompleteSuggestion) {
        setIsLoading(false);
        return;
      }

      try {
        const sessionToken = getSessionToken();
        const request = {
          input: searchText,
          types: ['(cities)'],
          sessionToken,
        };

        const { suggestions } = await maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        if (requestId !== lastRequestId.current) {
          return;
        }

        setIsLoading(false);

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
          setIsOpen(mappedPredictions.length > 0);
          setHighlightedIndex(-1);
        } else {
          setPredictions([]);
          setIsOpen(false);
        }
      } catch (error) {
        if (requestId !== lastRequestId.current) {
          return;
        }
        setIsLoading(false);
        setPredictions([]);
        setIsOpen(false);
      }
    }, 350);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [searchText, placesLibraryLoaded, getSessionToken]);

  // Handle city selection
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    if (!prediction) return;

    // Clear pending requests
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }

    setIsLoading(true);
    setPredictions([]);
    setIsOpen(false);

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
        let cityName = '';
        if (place.addressComponents) {
          for (const component of place.addressComponents) {
            if (component.types.includes('locality')) {
              cityName = component.longText;
              break;
            }
          }
          // Fallback to administrative_area_level_3 if locality not found
          if (!cityName) {
            for (const component of place.addressComponents) {
              if (component.types.includes('administrative_area_level_3')) {
                cityName = component.longText;
                break;
              }
            }
          }
        }

        // Use the prediction description if no city name extracted
        if (!cityName) {
          // Extract first part of description (before comma)
          cityName = prediction.description.split(',')[0].trim();
        }

        onCitySelect({ lat, lng, city: cityName });
        setSearchText('');
        resetSessionToken();
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < predictions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : predictions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < predictions.length) {
          void handleSelectPrediction(predictions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled || !placesLibraryLoaded}
          className="pl-9 pr-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
        >
          <ul className="py-1">
            {predictions.map((prediction, index) => (
              <li
                key={prediction.place_id}
                onClick={() => void handleSelectPrediction(prediction)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm',
                  highlightedIndex === index
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {prediction.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
